import * as walk from 'acorn-walk';
import type { Node } from 'estree';

export interface ScopeInfo {
  vars: string[];        // var declarations (hoisted with undefined)
  functions: string[];   // function declarations (hoisted with value)
  lets: string[];        // let declarations (TDZ)
  consts: string[];      // const declarations (TDZ)
}

export type ScopeMap = Map<Node, ScopeInfo>;

export function buildScopeMap(ast: Node): ScopeMap {
  const scopeMap: ScopeMap = new Map();

  function ensureScope(node: Node): ScopeInfo {
    if (!scopeMap.has(node)) {
      scopeMap.set(node, { vars: [], functions: [], lets: [], consts: [] });
    }
    return scopeMap.get(node)!;
  }

  // Walk the AST collecting declarations
  const acornAst = ast as any;

  walk.recursive(acornAst, { currentFunctionScope: ast, currentBlockScope: ast }, {
    VariableDeclaration(node: any, state: any, c: any) {
      const kind = node.kind;
      for (const decl of node.declarations) {
        const name = decl.id?.name;
        if (!name) continue;

        if (kind === 'var') {
          const scope = ensureScope(state.currentFunctionScope);
          if (!scope.vars.includes(name)) scope.vars.push(name);
        } else if (kind === 'let') {
          const scope = ensureScope(state.currentBlockScope);
          if (!scope.lets.includes(name)) scope.lets.push(name);
        } else if (kind === 'const') {
          const scope = ensureScope(state.currentBlockScope);
          if (!scope.consts.includes(name)) scope.consts.push(name);
        }

        if (decl.init) {
          c(decl.init, state);
        }
      }
    },
    FunctionDeclaration(node: any, state: any, c: any) {
      const name = node.id?.name;
      if (name) {
        const scope = ensureScope(state.currentFunctionScope);
        if (!scope.functions.includes(name)) scope.functions.push(name);
      }
      // Walk into the function body with new scope
      if (node.body) {
        c(node.body, {
          currentFunctionScope: node,
          currentBlockScope: node,
        });
      }
    },
    FunctionExpression(node: any, _state: any, c: any) {
      if (node.body) {
        c(node.body, {
          currentFunctionScope: node,
          currentBlockScope: node,
        });
      }
    },
    ArrowFunctionExpression(node: any, _state: any, c: any) {
      if (node.body) {
        c(node.body, {
          currentFunctionScope: node,
          currentBlockScope: node,
        });
      }
    },
    BlockStatement(node: any, state: any, c: any) {
      // Only create block scope if not a function body
      const newState = {
        currentFunctionScope: state.currentFunctionScope,
        currentBlockScope: node,
      };
      for (const stmt of node.body) {
        c(stmt, newState);
      }
    },
    ForStatement(node: any, state: any, c: any) {
      const newState = {
        currentFunctionScope: state.currentFunctionScope,
        currentBlockScope: node,
      };
      if (node.init) c(node.init, newState);
      if (node.test) c(node.test, newState);
      if (node.update) c(node.update, newState);
      if (node.body) c(node.body, newState);
    },
  });

  return scopeMap;
}
