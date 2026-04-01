// ── Runtime Value Types ──

export type RuntimeValue =
  | { type: 'undefined' }
  | { type: 'null' }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'function'; id: string }
  | { type: 'promise'; id: string }
  | { type: 'object'; properties: Record<string, RuntimeValue> }
  | { type: 'array'; elements: RuntimeValue[] };

export const UNDEFINED: RuntimeValue = { type: 'undefined' };
export const NULL_VAL: RuntimeValue = { type: 'null' };

export function makeNumber(v: number): RuntimeValue {
  return { type: 'number', value: v };
}
export function makeString(v: string): RuntimeValue {
  return { type: 'string', value: v };
}
export function makeBool(v: boolean): RuntimeValue {
  return { type: 'boolean', value: v };
}

export function runtimeToString(val: RuntimeValue): string {
  switch (val.type) {
    case 'undefined': return 'undefined';
    case 'null': return 'null';
    case 'number': return String(val.value);
    case 'string': return val.value;
    case 'boolean': return String(val.value);
    case 'function': return `[Function: ${val.id}]`;
    case 'promise': return `Promise {<${val.id}>}`;
    case 'object': return JSON.stringify(
      Object.fromEntries(
        Object.entries(val.properties).map(([k, v]) => [k, runtimeToString(v)])
      )
    );
    case 'array': return `[${val.elements.map(runtimeToString).join(', ')}]`;
  }
}

export function runtimeToJS(val: RuntimeValue): unknown {
  switch (val.type) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'number': return val.value;
    case 'string': return val.value;
    case 'boolean': return val.value;
    case 'function': return `[Function]`;
    case 'promise': return `[Promise]`;
    case 'object': return val.properties;
    case 'array': return val.elements.map(runtimeToJS);
  }
}

export function isTruthy(val: RuntimeValue): boolean {
  switch (val.type) {
    case 'undefined': return false;
    case 'null': return false;
    case 'number': return val.value !== 0 && !isNaN(val.value);
    case 'string': return val.value.length > 0;
    case 'boolean': return val.value;
    default: return true;
  }
}

// ── Binding & Environment ──

export interface Binding {
  name: string;
  value: RuntimeValue;
  kind: 'var' | 'let' | 'const' | 'param' | 'function';
  mutable: boolean;
  tdz: boolean;
}

export interface Environment {
  id: string;
  label: string;
  parentId: string | null;
  bindings: Record<string, Binding>;
}

// ── Function Store ──

export interface FunctionValue {
  id: string;
  name: string;
  params: string[];
  bodyNodeIndex: number; // index into AST for reference
  closureEnvId: string;
  isAsync: boolean;
  isArrow: boolean;
  node: unknown; // the AST node
}

// ── Call Stack ──

export interface StackFrame {
  id: string;
  label: string;
  functionId: string | null;
  envId: string;
  line: number | null;
}

// ── Queues ──

export interface QueuedTask {
  id: string;
  label: string;
  callbackFunctionId: string;
  args: RuntimeValue[];
}

// ── Web APIs ──

export interface WebApiTimer {
  id: string;
  type: 'setTimeout' | 'setInterval';
  callbackFunctionId: string;
  delay: number;
  registeredAt: number;
  firesAt: number;
  label: string;
}

export interface WebApiFetch {
  id: string;
  url: string;
  promiseId: string;
  registeredAt: number;
  completesAt: number;
  label: string;
}

export interface WebApiState {
  timers: WebApiTimer[];
  fetches: WebApiFetch[];
}

// ── Promise ──

export interface ThenHandler {
  onFulfilled: string | null; // functionId
  onRejected: string | null; // functionId
  resultPromiseId: string;
}

export interface SimPromise {
  id: string;
  state: 'pending' | 'fulfilled' | 'rejected';
  value: RuntimeValue | undefined;
  reason: RuntimeValue | undefined;
  thenHandlers: ThenHandler[];
  label: string;
}

// ── Event Loop ──

export type EventLoopPhase =
  | 'idle'
  | 'executing-sync'
  | 'checking-microtasks'
  | 'executing-microtask'
  | 'checking-macrotasks'
  | 'executing-macrotask'
  | 'advancing-timers';

// ── Console ──

export interface ConsoleEntry {
  id: string;
  text: string;
  type: 'log' | 'warn' | 'error';
}

// ── Interpreter State (the complete state at any point) ──

export interface InterpreterState {
  callStack: StackFrame[];
  environments: Record<string, Environment>;
  functions: Record<string, FunctionValue>;
  promises: Record<string, SimPromise>;
  taskQueue: QueuedTask[];
  microtaskQueue: QueuedTask[];
  webApis: WebApiState;
  eventLoopPhase: EventLoopPhase;
  virtualClock: number;
  consoleOutput: ConsoleEntry[];
  highlightedLine: number | null;
}

// ── Snapshot ──

export type StepType =
  | 'program-start'
  | 'variable-declaration'
  | 'variable-assignment'
  | 'function-declaration'
  | 'function-call'
  | 'function-return'
  | 'expression-eval'
  | 'console-log'
  | 'register-timer'
  | 'register-fetch'
  | 'timer-fires'
  | 'fetch-completes'
  | 'promise-created'
  | 'promise-resolved'
  | 'promise-rejected'
  | 'then-registered'
  | 'enqueue-microtask'
  | 'dequeue-microtask'
  | 'enqueue-macrotask'
  | 'dequeue-macrotask'
  | 'event-loop-check'
  | 'await-suspend'
  | 'await-resume'
  | 'program-end'
  | 'runtime-error';

export interface Snapshot {
  index: number;
  stepType: StepType;
  description: string;
  state: InterpreterState;
}

// ── Execution Trace ──

export interface ExecutionTrace {
  sourceCode: string;
  snapshots: Snapshot[];
  totalSteps: number;
  error: { message: string; line?: number } | null;
}

// ── Parse Error ──

export interface ParseError {
  message: string;
  line: number;
  column: number;
}
