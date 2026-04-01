import * as acorn from 'acorn';
import type { Program } from 'estree';
import type { ParseError } from '../runtime/types';

export function parseCode(sourceCode: string): { ast: Program; sourceCode: string } | { error: ParseError } {
  try {
    const ast = acorn.parse(sourceCode, {
      ecmaVersion: 2022,
      sourceType: 'script',
      locations: true,
      ranges: true,
    }) as unknown as Program;
    return { ast, sourceCode };
  } catch (e: unknown) {
    const err = e as { message: string; loc?: { line: number; column: number } };
    return {
      error: {
        message: err.message || 'Parse error',
        line: err.loc?.line ?? 1,
        column: err.loc?.column ?? 0,
      },
    };
  }
}
