import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelContainer } from '../layout/PanelContainer';
import { tokens } from '../../theme/tokens';
import { fadeInVariants } from '../../animations/variants';
import type { Environment, RuntimeValue } from '../../engine';
import { runtimeToString } from '../../engine/runtime/types';

interface ExecutionContextProps {
  environments: Record<string, Environment>;
  currentEnvId: string | null;
}

function getDisplayBindings(env: Environment): Array<{ name: string; value: RuntimeValue; kind: string }> {
  return Object.values(env.bindings)
    .filter((b) => !b.tdz)
    .map((b) => ({ name: b.name, value: b.value, kind: b.kind }));
}

function getValueColor(val: RuntimeValue): string {
  switch (val.type) {
    case 'string': return '#98C379';
    case 'number': return '#D19A66';
    case 'boolean': return '#56B6C2';
    case 'undefined': return tokens.colors.text.muted;
    case 'null': return tokens.colors.text.muted;
    case 'function': return '#61AFEF';
    case 'promise': return '#FECA57';
    default: return tokens.colors.text.primary;
  }
}

export function ExecutionContext({ environments, currentEnvId }: ExecutionContextProps) {
  // Walk up scope chain, collect bindings
  const scopes: Array<{ label: string; bindings: ReturnType<typeof getDisplayBindings> }> = [];

  let envId: string | null = currentEnvId;
  while (envId) {
    const env = environments[envId];
    if (!env) break;
    const bindings = getDisplayBindings(env);
    if (bindings.length > 0) {
      scopes.push({ label: env.label, bindings });
    }
    envId = env.parentId;
  }

  const totalVars = scopes.reduce((a, s) => a + s.bindings.length, 0);

  return (
    <PanelContainer
      title="Scope / Variables"
      accentColor={tokens.colors.accent.context}
      count={totalVars}
    >
      {scopes.length === 0 ? (
        <div style={{
          color: tokens.colors.text.muted,
          fontSize: 12,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '20px 0',
        }}>
          No variables in scope
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {scopes.map((scope, si) => (
              <motion.div
                key={scope.label + si}
                variants={fadeInVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: tokens.colors.accent.context,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}>
                  {scope.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {scope.bindings.map((b) => (
                    <div
                      key={b.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: tokens.colors.bg.surface,
                        fontSize: 12,
                        fontFamily: tokens.font.code,
                      }}
                    >
                      <span style={{ color: tokens.colors.text.primary }}>
                        <span style={{ color: tokens.colors.text.muted, fontSize: 10, marginRight: 4 }}>
                          {b.kind}
                        </span>
                        {b.name}
                      </span>
                      <span style={{
                        color: getValueColor(b.value),
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {b.value.type === 'string' ? `"${runtimeToString(b.value)}"` : runtimeToString(b.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PanelContainer>
  );
}
