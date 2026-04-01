import type { Node } from 'estree';
import type {
  RuntimeValue,
  InterpreterState,
  Snapshot,
  StepType,
  StackFrame,
  Environment,
  FunctionValue,
  SimPromise,
  QueuedTask,
  WebApiTimer,
  WebApiFetch,
  ConsoleEntry,
  Binding,
  ExecutionTrace,
  ThenHandler,
} from '../runtime/types';
import {
  UNDEFINED,
  NULL_VAL,
  makeNumber,
  makeString,
  makeBool,
  runtimeToString,
  isTruthy,
} from '../runtime/types';
import { parseCode } from '../parser/index';

let _idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++_idCounter}`;
}

// Sentinel for return values
class ReturnSignal {
  constructor(public value: RuntimeValue) {}
}

export class Interpreter {
  private state: InterpreterState;
  private snapshots: Snapshot[] = [];
  private stepCount = 0;
  private maxSteps: number;
  private sourceCode: string;
  private error: { message: string; line?: number } | null = null;

  // Async/await support
  private suspendedFrames: Map<string, {
    continuations: Array<{ node: Node; envId: string }>;
    currentIndex: number;
    returnPromiseId: string;
  }> = new Map();

  constructor(sourceCode: string, maxSteps = 10000) {
    this.sourceCode = sourceCode;
    this.maxSteps = maxSteps;
    _idCounter = 0;

    this.state = {
      callStack: [],
      environments: {},
      functions: {},
      promises: {},
      taskQueue: [],
      microtaskQueue: [],
      webApis: { timers: [], fetches: [] },
      eventLoopPhase: 'idle',
      virtualClock: 0,
      consoleOutput: [],
      highlightedLine: null,
    };
  }

  run(): ExecutionTrace {
    const result = parseCode(this.sourceCode);
    if ('error' in result) {
      return {
        sourceCode: this.sourceCode,
        snapshots: [],
        totalSteps: 0,
        error: { message: result.error.message, line: result.error.line },
      };
    }

    const { ast } = result;

    try {
      // Create global environment
      const globalEnvId = this.createEnvironment(null, 'Global');

      // Hoist var and function declarations in program body
      this.hoistDeclarations(ast.body as unknown as Node[], globalEnvId, true);

      // Push global frame
      const globalFrame: StackFrame = {
        id: genId('frame'),
        label: 'main()',
        functionId: null,
        envId: globalEnvId,
        line: null,
      };
      this.state.callStack.push(globalFrame);
      this.state.eventLoopPhase = 'executing-sync';
      this.emitSnapshot('program-start', 'Program execution starts');

      // Execute program body
      for (const node of ast.body) {
        this.executeStatement(node as unknown as Node, globalEnvId);
      }

      // Pop global frame
      this.state.callStack.pop();
      this.state.eventLoopPhase = 'idle';

      // Run event loop
      this.drainEventLoop();

      this.emitSnapshot('program-end', 'Program execution complete');
    } catch (e) {
      if (e instanceof ReturnSignal) {
        // ignore
      } else if (e instanceof Error) {
        this.error = { message: e.message };
        this.emitSnapshot('runtime-error', `Error: ${e.message}`);
      }
    }

    return {
      sourceCode: this.sourceCode,
      snapshots: this.snapshots,
      totalSteps: this.snapshots.length,
      error: this.error,
    };
  }

  // ── Snapshot ──

  private emitSnapshot(stepType: StepType, description: string) {
    if (this.stepCount++ > this.maxSteps) {
      throw new Error('Maximum execution steps exceeded (possible infinite loop)');
    }
    const snapshot: Snapshot = {
      index: this.snapshots.length,
      stepType,
      description,
      state: structuredClone(this.state),
    };
    this.snapshots.push(snapshot);
  }

  // ── Environment ──

  private createEnvironment(parentId: string | null, label: string): string {
    const id = genId('env');
    this.state.environments[id] = {
      id,
      label,
      parentId,
      bindings: {},
    };
    return id;
  }

  private addBinding(envId: string, name: string, value: RuntimeValue, kind: Binding['kind'], tdz = false) {
    const env: Environment = this.state.environments[envId];
    env.bindings[name] = {
      name,
      value,
      kind,
      mutable: kind !== 'const',
      tdz,
    };
  }

  private lookupVariable(name: string, envId: string): RuntimeValue {
    let currentId: string | null = envId;
    while (currentId) {
      const env: Environment = this.state.environments[currentId];
      if (name in env.bindings) {
        const binding = env.bindings[name];
        if (binding.tdz) {
          throw new Error(`Cannot access '${name}' before initialization`);
        }
        return binding.value;
      }
      currentId = env.parentId;
    }
    throw new Error(`${name} is not defined`);
  }

  private assignVariable(name: string, value: RuntimeValue, envId: string) {
    let currentId: string | null = envId;
    while (currentId) {
      const env: Environment = this.state.environments[currentId];
      if (name in env.bindings) {
        const binding = env.bindings[name];
        if (binding.tdz) {
          throw new Error(`Cannot access '${name}' before initialization`);
        }
        if (!binding.mutable) {
          throw new Error(`Assignment to constant variable '${name}'`);
        }
        binding.value = value;
        return;
      }
      currentId = env.parentId;
    }
    throw new Error(`${name} is not defined`);
  }

  private findBindingEnvId(name: string, envId: string): string | null {
    let currentId: string | null = envId;
    while (currentId) {
      const env: Environment = this.state.environments[currentId];
      if (name in env.bindings) return currentId;
      currentId = env.parentId;
    }
    return null;
  }

  // ── Hoisting ──

  private hoistDeclarations(body: Node[], envId: string, isFunctionScope: boolean) {
    for (const node of body) {
      const n = node as any;
      if (n.type === 'FunctionDeclaration' && n.id?.name) {
        const funcVal = this.createFunction(n, envId);
        this.addBinding(envId, n.id.name, { type: 'function', id: funcVal.id }, 'function');
      }
      if (n.type === 'VariableDeclaration') {
        if (n.kind === 'var' && isFunctionScope) {
          for (const decl of n.declarations) {
            if (decl.id?.name && !(decl.id.name in this.state.environments[envId].bindings)) {
              this.addBinding(envId, decl.id.name, UNDEFINED, 'var');
            }
          }
        }
      }
    }
  }

  // ── Function Creation ──

  private createFunction(node: any, closureEnvId: string): FunctionValue {
    const id = genId('func');
    const params = (node.params || []).map((p: any) => {
      if (p.type === 'Identifier') return p.name;
      if (p.type === 'AssignmentPattern' && p.left?.type === 'Identifier') return p.left.name;
      return '_';
    });
    const func: FunctionValue = {
      id,
      name: node.id?.name || '<anonymous>',
      params,
      bodyNodeIndex: 0,
      closureEnvId,
      isAsync: node.async || false,
      isArrow: node.type === 'ArrowFunctionExpression',
      node: node.body,
    };
    this.state.functions[id] = func;
    return func;
  }

  // ── Statement Execution ──

  private executeStatement(node: Node, envId: string): RuntimeValue | undefined {
    const n = node as any;
    this.state.highlightedLine = n.loc?.start?.line ?? null;

    switch (n.type) {
      case 'VariableDeclaration':
        return this.execVariableDeclaration(n, envId);
      case 'FunctionDeclaration':
        return this.execFunctionDeclaration(n, envId);
      case 'ExpressionStatement':
        return this.evaluateExpression(n.expression, envId);
      case 'ReturnStatement': {
        const val = n.argument ? this.evaluateExpression(n.argument, envId) : UNDEFINED;
        throw new ReturnSignal(val);
      }
      case 'IfStatement':
        return this.execIfStatement(n, envId);
      case 'BlockStatement':
        return this.execBlockStatement(n, envId);
      case 'ForStatement':
        return this.execForStatement(n, envId);
      case 'WhileStatement':
        return this.execWhileStatement(n, envId);
      case 'TryStatement':
        return this.execTryStatement(n, envId);
      case 'ThrowStatement': {
        const val = this.evaluateExpression(n.argument, envId);
        throw new Error(runtimeToString(val));
      }
      case 'EmptyStatement':
        return undefined;
      default:
        // Try as expression
        if (n.type?.endsWith('Expression') || n.type === 'CallExpression') {
          return this.evaluateExpression(n, envId);
        }
        return undefined;
    }
  }

  private execVariableDeclaration(node: any, envId: string): undefined {
    const kind = node.kind as 'var' | 'let' | 'const';
    for (const decl of node.declarations) {
      const name = decl.id?.name;
      if (!name) continue;

      const value = decl.init ? this.evaluateExpression(decl.init, envId) : UNDEFINED;

      if (kind === 'var') {
        // var is already hoisted, just assign
        const targetEnvId = this.findBindingEnvId(name, envId);
        if (targetEnvId) {
          this.state.environments[targetEnvId].bindings[name].value = value;
        } else {
          this.addBinding(envId, name, value, 'var');
        }
      } else {
        this.addBinding(envId, name, value, kind);
      }

      this.emitSnapshot('variable-declaration', `${kind} ${name} = ${runtimeToString(value)}`);
    }
    return undefined;
  }

  private execFunctionDeclaration(node: any, _envId: string): undefined {
    // Already hoisted, just emit snapshot
    if (node.id?.name) {
      this.emitSnapshot('function-declaration', `Function '${node.id.name}' declared`);
    }
    return undefined;
  }

  private execIfStatement(node: any, envId: string): undefined {
    const test = this.evaluateExpression(node.test, envId);
    if (isTruthy(test)) {
      this.executeStatement(node.consequent, envId);
    } else if (node.alternate) {
      this.executeStatement(node.alternate, envId);
    }
    return undefined;
  }

  private execBlockStatement(node: any, envId: string): undefined {
    const blockEnvId = this.createEnvironment(envId, 'Block');
    this.hoistDeclarations(node.body, blockEnvId, false);
    for (const stmt of node.body) {
      this.executeStatement(stmt, blockEnvId);
    }
    return undefined;
  }

  private execForStatement(node: any, envId: string): undefined {
    const loopEnvId = this.createEnvironment(envId, 'for');
    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        this.execVariableDeclaration(node.init, loopEnvId);
      } else {
        this.evaluateExpression(node.init, loopEnvId);
      }
    }

    let iterations = 0;
    while (true) {
      if (iterations++ > 1000) {
        throw new Error('Maximum loop iterations exceeded');
      }
      if (node.test) {
        const test = this.evaluateExpression(node.test, loopEnvId);
        if (!isTruthy(test)) break;
      }

      // Create new block env for let/const per iteration
      const iterEnvId = this.createEnvironment(loopEnvId, 'for-body');
      if (node.body.type === 'BlockStatement') {
        for (const stmt of node.body.body) {
          this.executeStatement(stmt, iterEnvId);
        }
      } else {
        this.executeStatement(node.body, iterEnvId);
      }

      if (node.update) {
        this.evaluateExpression(node.update, loopEnvId);
      }
    }
    return undefined;
  }

  private execWhileStatement(node: any, envId: string): undefined {
    let iterations = 0;
    while (true) {
      if (iterations++ > 1000) {
        throw new Error('Maximum loop iterations exceeded');
      }
      const test = this.evaluateExpression(node.test, envId);
      if (!isTruthy(test)) break;
      this.executeStatement(node.body, envId);
    }
    return undefined;
  }

  private execTryStatement(node: any, envId: string): undefined {
    try {
      this.executeStatement(node.block, envId);
    } catch (e) {
      if (e instanceof ReturnSignal) throw e;
      if (node.handler) {
        const catchEnvId = this.createEnvironment(envId, 'catch');
        if (node.handler.param?.name) {
          const errMsg = e instanceof Error ? e.message : String(e);
          this.addBinding(catchEnvId, node.handler.param.name, makeString(errMsg), 'let');
        }
        this.executeStatement(node.handler.body, catchEnvId);
      }
    } finally {
      if (node.finalizer) {
        this.executeStatement(node.finalizer, envId);
      }
    }
    return undefined;
  }

  // ── Expression Evaluation ──

  private evaluateExpression(node: Node, envId: string): RuntimeValue {
    const n = node as any;

    switch (n.type) {
      case 'Literal':
        return this.evalLiteral(n);
      case 'Identifier':
        return this.lookupVariable(n.name, envId);
      case 'BinaryExpression':
        return this.evalBinaryExpression(n, envId);
      case 'LogicalExpression':
        return this.evalLogicalExpression(n, envId);
      case 'UnaryExpression':
        return this.evalUnaryExpression(n, envId);
      case 'UpdateExpression':
        return this.evalUpdateExpression(n, envId);
      case 'AssignmentExpression':
        return this.evalAssignmentExpression(n, envId);
      case 'CallExpression':
        return this.evalCallExpression(n, envId);
      case 'NewExpression':
        return this.evalNewExpression(n, envId);
      case 'MemberExpression':
        return this.evalMemberExpression(n, envId);
      case 'ArrowFunctionExpression':
      case 'FunctionExpression': {
        const func = this.createFunction(n, envId);
        return { type: 'function', id: func.id };
      }
      case 'ConditionalExpression': {
        const test = this.evaluateExpression(n.test, envId);
        return isTruthy(test)
          ? this.evaluateExpression(n.consequent, envId)
          : this.evaluateExpression(n.alternate, envId);
      }
      case 'TemplateLiteral':
        return this.evalTemplateLiteral(n, envId);
      case 'ArrayExpression': {
        const elements = (n.elements || []).map((el: any) =>
          el ? this.evaluateExpression(el, envId) : UNDEFINED
        );
        return { type: 'array', elements };
      }
      case 'ObjectExpression': {
        const props: Record<string, RuntimeValue> = {};
        for (const prop of n.properties || []) {
          const key = prop.key?.name || prop.key?.value;
          if (key) {
            props[String(key)] = this.evaluateExpression(prop.value, envId);
          }
        }
        return { type: 'object', properties: props };
      }
      case 'SequenceExpression': {
        let result: RuntimeValue = UNDEFINED;
        for (const expr of n.expressions) {
          result = this.evaluateExpression(expr, envId);
        }
        return result;
      }
      case 'AwaitExpression':
        return this.evalAwaitExpression(n, envId);
      case 'SpreadElement':
        return this.evaluateExpression(n.argument, envId);
      default:
        return UNDEFINED;
    }
  }

  private evalLiteral(node: any): RuntimeValue {
    if (node.value === null) return NULL_VAL;
    if (typeof node.value === 'number') return makeNumber(node.value);
    if (typeof node.value === 'string') return makeString(node.value);
    if (typeof node.value === 'boolean') return makeBool(node.value);
    return UNDEFINED;
  }

  private evalBinaryExpression(node: any, envId: string): RuntimeValue {
    const left = this.evaluateExpression(node.left, envId);
    const right = this.evaluateExpression(node.right, envId);

    const lv = left.type === 'number' ? left.value : left.type === 'string' ? left.value : 0;
    const rv = right.type === 'number' ? right.value : right.type === 'string' ? right.value : 0;

    switch (node.operator) {
      case '+': {
        if (left.type === 'string' || right.type === 'string') {
          return makeString(runtimeToString(left) + runtimeToString(right));
        }
        return makeNumber((lv as number) + (rv as number));
      }
      case '-': return makeNumber((lv as number) - (rv as number));
      case '*': return makeNumber((lv as number) * (rv as number));
      case '/': return makeNumber((lv as number) / (rv as number));
      case '%': return makeNumber((lv as number) % (rv as number));
      case '**': return makeNumber((lv as number) ** (rv as number));
      case '<': return makeBool(lv < rv);
      case '>': return makeBool(lv > rv);
      case '<=': return makeBool(lv <= rv);
      case '>=': return makeBool(lv >= rv);
      case '==': return makeBool(lv == rv);
      case '!=': return makeBool(lv != rv);
      case '===': return makeBool(left.type === right.type && lv === rv);
      case '!==': return makeBool(left.type !== right.type || lv !== rv);
      default: return UNDEFINED;
    }
  }

  private evalLogicalExpression(node: any, envId: string): RuntimeValue {
    const left = this.evaluateExpression(node.left, envId);
    switch (node.operator) {
      case '&&': return isTruthy(left) ? this.evaluateExpression(node.right, envId) : left;
      case '||': return isTruthy(left) ? left : this.evaluateExpression(node.right, envId);
      case '??': return left.type === 'null' || left.type === 'undefined' ? this.evaluateExpression(node.right, envId) : left;
      default: return UNDEFINED;
    }
  }

  private evalUnaryExpression(node: any, envId: string): RuntimeValue {
    const arg = this.evaluateExpression(node.argument, envId);
    switch (node.operator) {
      case '!': return makeBool(!isTruthy(arg));
      case '-': return makeNumber(-(arg.type === 'number' ? arg.value : 0));
      case '+': return makeNumber(+(arg.type === 'number' ? arg.value : 0));
      case 'typeof': return makeString(arg.type === 'function' ? 'function' : arg.type);
      default: return UNDEFINED;
    }
  }

  private evalUpdateExpression(node: any, envId: string): RuntimeValue {
    const name = node.argument?.name;
    if (!name) return UNDEFINED;
    const current = this.lookupVariable(name, envId);
    const val = current.type === 'number' ? current.value : 0;
    const newVal = node.operator === '++' ? val + 1 : val - 1;
    this.assignVariable(name, makeNumber(newVal), envId);
    return node.prefix ? makeNumber(newVal) : makeNumber(val);
  }

  private evalAssignmentExpression(node: any, envId: string): RuntimeValue {
    const value = this.evaluateExpression(node.right, envId);

    if (node.left.type === 'Identifier') {
      const name = node.left.name;

      if (node.operator === '=') {
        this.assignVariable(name, value, envId);
      } else {
        const current = this.lookupVariable(name, envId);
        const cv = current.type === 'number' ? current.value : 0;
        const rv = value.type === 'number' ? value.value : 0;
        let newVal: RuntimeValue = UNDEFINED;
        switch (node.operator) {
          case '+=':
            if (current.type === 'string' || value.type === 'string') {
              newVal = makeString(runtimeToString(current) + runtimeToString(value));
            } else {
              newVal = makeNumber(cv + rv);
            }
            break;
          case '-=': newVal = makeNumber(cv - rv); break;
          case '*=': newVal = makeNumber(cv * rv); break;
          case '/=': newVal = makeNumber(cv / rv); break;
          default: newVal = value;
        }
        this.assignVariable(name, newVal, envId);
      }

      this.state.highlightedLine = node.loc?.start?.line ?? null;
      this.emitSnapshot('variable-assignment', `${name} = ${runtimeToString(value)}`);
      return value;
    }

    // Member expression assignment
    if (node.left.type === 'MemberExpression') {
      const obj = this.evaluateExpression(node.left.object, envId);
      const prop = node.left.computed
        ? runtimeToString(this.evaluateExpression(node.left.property, envId))
        : node.left.property.name;
      if (obj.type === 'object') {
        obj.properties[prop] = value;
      }
      if (obj.type === 'array' && !isNaN(Number(prop))) {
        obj.elements[Number(prop)] = value;
      }
      return value;
    }

    return value;
  }

  private evalCallExpression(node: any, envId: string): RuntimeValue {
    // Check for special builtins first
    if (node.callee.type === 'MemberExpression') {
      const result = this.tryBuiltinMemberCall(node, envId);
      if (result !== undefined) return result;
    }

    // Check for global builtins (setTimeout, fetch, etc.)
    if (node.callee.type === 'Identifier') {
      const name = node.callee.name;
      if (['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch'].includes(name)) {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        const result = this.evalCallExpressionGlobal(name, args, node, envId);
        if (result !== undefined) return result;
      }
    }

    // Get the function
    const callee = this.evaluateExpression(node.callee, envId);
    if (callee.type !== 'function') {
      throw new Error(`${runtimeToString(callee)} is not a function`);
    }

    const args = node.arguments.map((arg: any) => this.evaluateExpression(arg, envId));

    // Handle synthetic resolve/reject functions
    const func = this.state.functions[callee.id];
    if (func) {
      const bodyNode = func.node as any;
      if (bodyNode?.type === '__resolve__') {
        const value = args[0] || UNDEFINED;
        this.resolveOrRejectPromise(bodyNode.promiseId, 'fulfilled', value);
        return UNDEFINED;
      }
      if (bodyNode?.type === '__reject__') {
        const reason = args[0] || UNDEFINED;
        this.resolveOrRejectPromise(bodyNode.promiseId, 'rejected', undefined, reason);
        return UNDEFINED;
      }
    }

    return this.callFunction(callee.id, args, node);
  }

  private evalNewExpression(node: any, envId: string): RuntimeValue {
    // Handle new Promise(executor)
    if (node.callee.type === 'Identifier' && node.callee.name === 'Promise') {
      const executorArg = node.arguments[0];
      if (!executorArg) throw new Error('Promise resolver undefined is not a function');
      const executor = this.evaluateExpression(executorArg, envId);
      if (executor.type !== 'function') throw new Error('Promise resolver is not a function');

      return this.createNewPromise(executor.id, node, envId);
    }
    return UNDEFINED;
  }

  private evalMemberExpression(node: any, envId: string): RuntimeValue {
    const obj = this.evaluateExpression(node.object, envId);
    const prop = node.computed
      ? runtimeToString(this.evaluateExpression(node.property, envId))
      : node.property.name;

    if (obj.type === 'object' && prop in obj.properties) {
      return obj.properties[prop];
    }
    if (obj.type === 'array') {
      if (prop === 'length') return makeNumber(obj.elements.length);
      const idx = Number(prop);
      if (!isNaN(idx) && idx < obj.elements.length) return obj.elements[idx];
    }
    if (obj.type === 'string') {
      if (prop === 'length') return makeNumber(obj.value.length);
    }

    return UNDEFINED;
  }

  private evalTemplateLiteral(node: any, envId: string): RuntimeValue {
    let result = '';
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked || '';
      if (i < node.expressions.length) {
        result += runtimeToString(this.evaluateExpression(node.expressions[i], envId));
      }
    }
    return makeString(result);
  }

  private evalAwaitExpression(node: any, envId: string): RuntimeValue {
    // Simplified await: evaluate the operand
    const val = this.evaluateExpression(node.argument, envId);

    this.state.highlightedLine = node.loc?.start?.line ?? null;

    // If it's a promise, simulate the await
    if (val.type === 'promise') {
      const promise = this.state.promises[val.id];
      if (promise && promise.state === 'fulfilled') {
        this.emitSnapshot('await-resume', `await resolved with ${runtimeToString(promise.value || UNDEFINED)}`);
        return promise.value || UNDEFINED;
      }
      if (promise && promise.state === 'rejected') {
        throw new Error(runtimeToString(promise.reason || UNDEFINED));
      }
      this.emitSnapshot('await-suspend', 'await suspending...');
      return UNDEFINED;
    }

    // Not a promise - wrap and return immediately (per spec)
    this.emitSnapshot('await-resume', `await resolved with ${runtimeToString(val)}`);
    return val;
  }

  // ── Builtin Member Calls ──

  private tryBuiltinMemberCall(node: any, envId: string): RuntimeValue | undefined {
    const obj = node.callee.object;
    const prop = node.callee.property;

    // console.log / console.warn / console.error
    if (obj.type === 'Identifier' && obj.name === 'console') {
      const method = prop.name;
      const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
      const text = args.map(runtimeToString).join(' ');
      const entry: ConsoleEntry = {
        id: genId('log'),
        text,
        type: method === 'warn' ? 'warn' : method === 'error' ? 'error' : 'log',
      };
      this.state.consoleOutput.push(entry);
      this.state.highlightedLine = node.loc?.start?.line ?? null;
      this.emitSnapshot('console-log', `console.${method}(${text})`);
      return UNDEFINED;
    }

    // setTimeout / setInterval
    if (obj.type === 'Identifier' && (obj.name === 'setTimeout' || obj.name === 'setInterval')) {
      // These are actually global calls handled elsewhere
    }

    // Promise.resolve / Promise.reject
    if (obj.type === 'Identifier' && obj.name === 'Promise') {
      if (prop.name === 'resolve') {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        const val = args[0] || UNDEFINED;
        const promise = this.createSimPromise('fulfilled', val);
        this.state.highlightedLine = node.loc?.start?.line ?? null;
        this.emitSnapshot('promise-created', `Promise.resolve(${runtimeToString(val)})`);
        return { type: 'promise', id: promise.id };
      }
      if (prop.name === 'reject') {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        const val = args[0] || UNDEFINED;
        const promise = this.createSimPromise('rejected', undefined, val);
        this.state.highlightedLine = node.loc?.start?.line ?? null;
        this.emitSnapshot('promise-rejected', `Promise.reject(${runtimeToString(val)})`);
        return { type: 'promise', id: promise.id };
      }
    }

    // .then() / .catch() / .finally() on a promise
    if (prop.name === 'then' || prop.name === 'catch' || prop.name === 'finally') {
      const objVal = this.evaluateExpression(obj, envId);
      if (objVal.type === 'promise') {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        return this.registerThen(objVal.id, prop.name, args, node);
      }
    }

    // Array methods
    if (prop.name === 'push' || prop.name === 'pop' || prop.name === 'forEach' || prop.name === 'map') {
      const objVal = this.evaluateExpression(obj, envId);
      if (objVal.type === 'array') {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        switch (prop.name) {
          case 'push':
            objVal.elements.push(...args);
            return makeNumber(objVal.elements.length);
          case 'pop':
            return objVal.elements.pop() || UNDEFINED;
          case 'forEach': {
            if (args[0]?.type === 'function') {
              for (let i = 0; i < objVal.elements.length; i++) {
                this.callFunction(args[0].id, [objVal.elements[i], makeNumber(i)], node);
              }
            }
            return UNDEFINED;
          }
          case 'map': {
            if (args[0]?.type === 'function') {
              const result = objVal.elements.map((el, i) =>
                this.callFunction(args[0].id, [el, makeNumber(i)], node)
              );
              return { type: 'array', elements: result };
            }
            return { type: 'array', elements: [] };
          }
        }
      }
    }

    return undefined; // not a builtin
  }

  // ── Function Calls ──

  callFunction(funcId: string, args: RuntimeValue[], callNode: any): RuntimeValue {
    const func = this.state.functions[funcId];
    if (!func) throw new Error(`Function ${funcId} not found`);

    // Determine label for display
    const argStrs = args.map(runtimeToString);
    const label = `${func.name}(${argStrs.join(', ')})`;

    // Create new environment (closure!)
    const funcEnvId = this.createEnvironment(func.closureEnvId, label);

    // Bind parameters
    for (let i = 0; i < func.params.length; i++) {
      this.addBinding(funcEnvId, func.params[i], args[i] || UNDEFINED, 'param');
    }

    // Push stack frame
    const frame: StackFrame = {
      id: genId('frame'),
      label,
      functionId: funcId,
      envId: funcEnvId,
      line: callNode?.loc?.start?.line ?? null,
    };
    this.state.callStack.push(frame);
    this.state.highlightedLine = callNode?.loc?.start?.line ?? null;
    this.emitSnapshot('function-call', `Call ${label}`);

    // Execute function body
    let returnValue: RuntimeValue = UNDEFINED;
    const bodyNode = func.node as any;

    try {
      if (bodyNode.type === 'BlockStatement') {
        // Hoist declarations in function body
        this.hoistDeclarations(bodyNode.body, funcEnvId, true);
        for (const stmt of bodyNode.body) {
          this.executeStatement(stmt, funcEnvId);
        }
      } else {
        // Arrow function with expression body
        returnValue = this.evaluateExpression(bodyNode, funcEnvId);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        returnValue = e.value;
      } else {
        this.state.callStack.pop();
        throw e;
      }
    }

    // Pop stack frame
    this.state.callStack.pop();
    this.state.highlightedLine = callNode?.loc?.start?.line ?? null;
    this.emitSnapshot('function-return', `Return ${runtimeToString(returnValue)} from ${func.name}`);

    // If async function, wrap return in a promise
    if (func.isAsync) {
      const promise = this.createSimPromise('fulfilled', returnValue);
      return { type: 'promise', id: promise.id };
    }

    return returnValue;
  }

  // ── Global Builtins (setTimeout, etc.) ──

  private evalCallExpressionGlobal(name: string, args: RuntimeValue[], node: any, envId: string): RuntimeValue | undefined {
    switch (name) {
      case 'setTimeout':
      case 'setInterval': {
        const callback = args[0];
        const delay = args[1]?.type === 'number' ? args[1].value : 0;
        if (callback?.type !== 'function') return UNDEFINED;

        const timer: WebApiTimer = {
          id: genId('timer'),
          type: name as 'setTimeout' | 'setInterval',
          callbackFunctionId: callback.id,
          delay,
          registeredAt: this.state.virtualClock,
          firesAt: this.state.virtualClock + delay,
          label: `${name}(fn, ${delay})`,
        };
        this.state.webApis.timers.push(timer);
        this.state.highlightedLine = node?.loc?.start?.line ?? null;
        this.emitSnapshot('register-timer', `${name}(fn, ${delay}ms) registered`);
        return makeNumber(parseInt(timer.id.split('_')[1]));
      }

      case 'clearTimeout':
      case 'clearInterval': {
        const id = args[0]?.type === 'number' ? args[0].value : -1;
        this.state.webApis.timers = this.state.webApis.timers.filter(
          t => parseInt(t.id.split('_')[1]) !== id
        );
        return UNDEFINED;
      }

      case 'fetch': {
        const url = args[0]?.type === 'string' ? args[0].value : 'unknown';
        const promise = this.createSimPromise('pending');

        const fetchEntry: WebApiFetch = {
          id: genId('fetch'),
          url,
          promiseId: promise.id,
          registeredAt: this.state.virtualClock,
          completesAt: this.state.virtualClock + 2000,
          label: `fetch('${url}')`,
        };
        this.state.webApis.fetches.push(fetchEntry);
        this.state.highlightedLine = node?.loc?.start?.line ?? null;
        this.emitSnapshot('register-fetch', `fetch('${url}') initiated`);
        return { type: 'promise', id: promise.id };
      }
    }
    return undefined;
  }

  // Override evalCallExpression to handle global builtins
  private evalCallExpressionFull(node: any, envId: string): RuntimeValue {
    // Check for global function calls (setTimeout, fetch, etc.)
    if (node.callee.type === 'Identifier') {
      const name = node.callee.name;
      if (['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch'].includes(name)) {
        const args = node.arguments.map((a: any) => this.evaluateExpression(a, envId));
        const result = this.evalCallExpressionGlobal(name, args, node, envId);
        if (result !== undefined) return result;
      }
    }

    return this.evalCallExpression(node, envId);
  }

  // ── Promise System ──

  private createSimPromise(
    state: 'pending' | 'fulfilled' | 'rejected',
    value?: RuntimeValue,
    reason?: RuntimeValue
  ): SimPromise {
    const id = genId('promise');
    const promise: SimPromise = {
      id,
      state,
      value: state === 'fulfilled' ? value : undefined,
      reason: state === 'rejected' ? reason : undefined,
      thenHandlers: [],
      label: `Promise #${id.split('_')[1]}`,
    };
    this.state.promises[id] = promise;
    return promise;
  }

  private createNewPromise(executorFuncId: string, node: any, envId: string): RuntimeValue {
    const promise = this.createSimPromise('pending');

    // Create resolve and reject functions
    const resolveFuncId = genId('func');
    this.state.functions[resolveFuncId] = {
      id: resolveFuncId,
      name: 'resolve',
      params: ['value'],
      bodyNodeIndex: 0,
      closureEnvId: envId,
      isAsync: false,
      isArrow: false,
      node: { type: '__resolve__', promiseId: promise.id },
    };

    const rejectFuncId = genId('func');
    this.state.functions[rejectFuncId] = {
      id: rejectFuncId,
      name: 'reject',
      params: ['reason'],
      bodyNodeIndex: 0,
      closureEnvId: envId,
      isAsync: false,
      isArrow: false,
      node: { type: '__reject__', promiseId: promise.id },
    };

    this.state.highlightedLine = node?.loc?.start?.line ?? null;
    this.emitSnapshot('promise-created', `new Promise() created (${promise.label})`);

    // Execute the executor synchronously
    const executorFunc = this.state.functions[executorFuncId];
    const execEnvId = this.createEnvironment(executorFunc.closureEnvId, 'Promise executor');
    this.addBinding(execEnvId, executorFunc.params[0] || 'resolve', { type: 'function', id: resolveFuncId }, 'param');
    if (executorFunc.params[1]) {
      this.addBinding(execEnvId, executorFunc.params[1], { type: 'function', id: rejectFuncId }, 'param');
    }

    const frame: StackFrame = {
      id: genId('frame'),
      label: 'Promise executor',
      functionId: executorFuncId,
      envId: execEnvId,
      line: node?.loc?.start?.line ?? null,
    };
    this.state.callStack.push(frame);
    this.emitSnapshot('function-call', 'Executing Promise executor');

    try {
      const bodyNode = executorFunc.node as any;
      if (bodyNode.type === 'BlockStatement') {
        this.hoistDeclarations(bodyNode.body, execEnvId, true);
        for (const stmt of bodyNode.body) {
          this.executeStatement(stmt, execEnvId);
        }
      } else {
        this.evaluateExpression(bodyNode, execEnvId);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        // ignore
      } else {
        // Reject the promise
        this.resolveOrRejectPromise(promise.id, 'rejected', undefined, makeString(e instanceof Error ? e.message : String(e)));
      }
    }

    this.state.callStack.pop();

    return { type: 'promise', id: promise.id };
  }

  // Override callFunction to handle synthetic resolve/reject
  private callFunctionFull(funcId: string, args: RuntimeValue[], callNode: any): RuntimeValue {
    const func = this.state.functions[funcId];
    if (!func) throw new Error(`Function ${funcId} not found`);

    const bodyNode = func.node as any;

    // Handle synthetic resolve/reject functions
    if (bodyNode?.type === '__resolve__') {
      const value = args[0] || UNDEFINED;
      this.resolveOrRejectPromise(bodyNode.promiseId, 'fulfilled', value);
      return UNDEFINED;
    }
    if (bodyNode?.type === '__reject__') {
      const reason = args[0] || UNDEFINED;
      this.resolveOrRejectPromise(bodyNode.promiseId, 'rejected', undefined, reason);
      return UNDEFINED;
    }

    return this.callFunction(funcId, args, callNode);
  }

  private resolveOrRejectPromise(
    promiseId: string,
    state: 'fulfilled' | 'rejected',
    value?: RuntimeValue,
    reason?: RuntimeValue
  ) {
    const promise = this.state.promises[promiseId];
    if (!promise || promise.state !== 'pending') return;

    promise.state = state;
    if (state === 'fulfilled') {
      promise.value = value;
      this.emitSnapshot('promise-resolved', `${promise.label} resolved with ${runtimeToString(value || UNDEFINED)}`);
    } else {
      promise.reason = reason;
      this.emitSnapshot('promise-rejected', `${promise.label} rejected with ${runtimeToString(reason || UNDEFINED)}`);
    }

    // Schedule then handlers as microtasks
    for (const handler of promise.thenHandlers) {
      const callbackId = state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;
      if (callbackId) {
        const task: QueuedTask = {
          id: genId('microtask'),
          label: state === 'fulfilled' ? `.then() callback` : `.catch() callback`,
          callbackFunctionId: callbackId,
          args: [state === 'fulfilled' ? (value || UNDEFINED) : (reason || UNDEFINED)],
        };
        this.state.microtaskQueue.push(task);
        this.emitSnapshot('enqueue-microtask', `Queued ${task.label} on microtask queue`);
      } else if (handler.resultPromiseId) {
        // Pass through - propagate to the chained promise
        this.resolveOrRejectPromise(
          handler.resultPromiseId,
          state,
          state === 'fulfilled' ? value : undefined,
          state === 'rejected' ? reason : undefined
        );
      }
    }
  }

  private registerThen(
    promiseId: string,
    method: string,
    args: RuntimeValue[],
    node: any
  ): RuntimeValue {
    const promise = this.state.promises[promiseId];
    if (!promise) return UNDEFINED;

    const newPromise = this.createSimPromise('pending');

    let onFulfilled: string | null = null;
    let onRejected: string | null = null;

    if (method === 'then') {
      if (args[0]?.type === 'function') onFulfilled = args[0].id;
      if (args[1]?.type === 'function') onRejected = args[1].id;
    } else if (method === 'catch') {
      if (args[0]?.type === 'function') onRejected = args[0].id;
    } else if (method === 'finally') {
      // Finally runs regardless
      if (args[0]?.type === 'function') {
        onFulfilled = args[0].id;
        onRejected = args[0].id;
      }
    }

    const handler: ThenHandler = {
      onFulfilled,
      onRejected,
      resultPromiseId: newPromise.id,
    };

    this.state.highlightedLine = node?.loc?.start?.line ?? null;

    if (promise.state === 'pending') {
      promise.thenHandlers.push(handler);
      this.emitSnapshot('then-registered', `.${method}() registered on ${promise.label}`);
    } else if (promise.state === 'fulfilled') {
      // Already resolved - schedule microtask immediately
      if (onFulfilled) {
        const task: QueuedTask = {
          id: genId('microtask'),
          label: `.then() callback`,
          callbackFunctionId: onFulfilled,
          args: [promise.value || UNDEFINED],
        };
        this.state.microtaskQueue.push(task);
        this.emitSnapshot('enqueue-microtask', `${promise.label} already resolved, queued .then() callback`);
      } else {
        this.emitSnapshot('then-registered', `.${method}() registered on ${promise.label}`);
        this.resolveOrRejectPromise(newPromise.id, 'fulfilled', promise.value);
      }
    } else if (promise.state === 'rejected') {
      if (onRejected) {
        const task: QueuedTask = {
          id: genId('microtask'),
          label: `.catch() callback`,
          callbackFunctionId: onRejected,
          args: [promise.reason || UNDEFINED],
        };
        this.state.microtaskQueue.push(task);
        this.emitSnapshot('enqueue-microtask', `${promise.label} already rejected, queued .catch() callback`);
      } else {
        this.emitSnapshot('then-registered', `.${method}() registered on ${promise.label}`);
        this.resolveOrRejectPromise(newPromise.id, 'rejected', undefined, promise.reason);
      }
    }

    return { type: 'promise', id: newPromise.id };
  }

  // ── Event Loop ──

  private drainEventLoop() {
    // Safety counter
    let loopCount = 0;
    const maxLoops = 500;

    while (
      (this.state.microtaskQueue.length > 0 ||
       this.state.taskQueue.length > 0 ||
       this.state.webApis.timers.length > 0 ||
       this.state.webApis.fetches.length > 0) &&
      loopCount++ < maxLoops
    ) {
      // Phase 1: Drain all microtasks
      while (this.state.microtaskQueue.length > 0 && loopCount++ < maxLoops) {
        this.state.eventLoopPhase = 'checking-microtasks';
        this.emitSnapshot('event-loop-check', 'Event loop: checking microtask queue');

        const task = this.state.microtaskQueue.shift()!;
        this.state.eventLoopPhase = 'executing-microtask';
        this.emitSnapshot('dequeue-microtask', `Dequeued microtask: ${task.label}`);

        this.executeQueuedTask(task);
      }

      // Phase 2: Advance timers
      if (this.state.webApis.timers.length > 0 || this.state.webApis.fetches.length > 0) {
        this.state.eventLoopPhase = 'advancing-timers';
        this.advanceTimers();
      }

      // Phase 3: Execute ONE macrotask
      if (this.state.taskQueue.length > 0) {
        this.state.eventLoopPhase = 'checking-macrotasks';
        this.emitSnapshot('event-loop-check', 'Event loop: checking task queue');

        const task = this.state.taskQueue.shift()!;
        this.state.eventLoopPhase = 'executing-macrotask';
        this.emitSnapshot('dequeue-macrotask', `Dequeued macrotask: ${task.label}`);

        this.executeQueuedTask(task);
        // After macrotask, loop back to drain microtasks first
        continue;
      }

      // If nothing left to process, break
      if (
        this.state.microtaskQueue.length === 0 &&
        this.state.taskQueue.length === 0 &&
        this.state.webApis.timers.length === 0 &&
        this.state.webApis.fetches.length === 0
      ) {
        break;
      }
    }

    this.state.eventLoopPhase = 'idle';
  }

  private advanceTimers() {
    // Find next timer to fire
    const timers = this.state.webApis.timers.sort((a, b) => a.firesAt - b.firesAt);
    const fetches = this.state.webApis.fetches.sort((a, b) => a.completesAt - b.completesAt);

    const nextTimerAt = timers.length > 0 ? timers[0].firesAt : Infinity;
    const nextFetchAt = fetches.length > 0 ? fetches[0].completesAt : Infinity;
    const nextAt = Math.min(nextTimerAt, nextFetchAt);

    if (nextAt === Infinity) return;

    this.state.virtualClock = nextAt;

    // Fire all timers at this time
    const readyTimers = timers.filter(t => t.firesAt <= this.state.virtualClock);
    for (const timer of readyTimers) {
      this.state.webApis.timers = this.state.webApis.timers.filter(t => t.id !== timer.id);

      const task: QueuedTask = {
        id: genId('macrotask'),
        label: `${timer.type} callback`,
        callbackFunctionId: timer.callbackFunctionId,
        args: [],
      };
      this.state.taskQueue.push(task);
      this.emitSnapshot('timer-fires', `${timer.label} completed, callback queued`);

      // Re-register setInterval
      if (timer.type === 'setInterval') {
        const newTimer: WebApiTimer = {
          ...timer,
          id: genId('timer'),
          registeredAt: this.state.virtualClock,
          firesAt: this.state.virtualClock + timer.delay,
        };
        this.state.webApis.timers.push(newTimer);
      }
    }

    // Complete fetches
    const readyFetches = fetches.filter(f => f.completesAt <= this.state.virtualClock);
    for (const fetch of readyFetches) {
      this.state.webApis.fetches = this.state.webApis.fetches.filter(f => f.id !== fetch.id);

      // Resolve the fetch promise with a simulated response
      const responseObj: RuntimeValue = {
        type: 'object',
        properties: {
          ok: makeBool(true),
          status: makeNumber(200),
          url: makeString(fetch.url),
        },
      };
      this.resolveOrRejectPromise(fetch.promiseId, 'fulfilled', responseObj);
      this.emitSnapshot('fetch-completes', `fetch('${fetch.url}') completed`);
    }
  }

  private executeQueuedTask(task: QueuedTask) {
    const func = this.state.functions[task.callbackFunctionId];
    if (!func) return;

    const funcEnvId = this.createEnvironment(func.closureEnvId, task.label);
    for (let i = 0; i < func.params.length; i++) {
      this.addBinding(funcEnvId, func.params[i], task.args[i] || UNDEFINED, 'param');
    }

    const frame: StackFrame = {
      id: genId('frame'),
      label: task.label,
      functionId: task.callbackFunctionId,
      envId: funcEnvId,
      line: null,
    };
    this.state.callStack.push(frame);

    try {
      const bodyNode = func.node as any;
      if (bodyNode?.type === 'BlockStatement') {
        this.hoistDeclarations(bodyNode.body, funcEnvId, true);
        for (const stmt of bodyNode.body) {
          this.executeStatement(stmt, funcEnvId);
        }
      } else if (bodyNode && bodyNode.type !== '__resolve__' && bodyNode.type !== '__reject__') {
        this.evaluateExpression(bodyNode, funcEnvId);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        // Handle return value for microtask callbacks (resolves chained promise)
        // Find if this task has a result promise to resolve
      } else if (e instanceof Error) {
        this.state.consoleOutput.push({
          id: genId('log'),
          text: `Error in ${task.label}: ${e.message}`,
          type: 'error',
        });
      }
    }

    this.state.callStack.pop();
  }
}

// ── Public API ──

export function parseAndRun(sourceCode: string, maxSteps = 10000): ExecutionTrace {
  const interpreter = new Interpreter(sourceCode, maxSteps);
  return interpreter.run();
}
