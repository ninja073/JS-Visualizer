import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelContainer } from '../layout/PanelContainer';
import { tokens } from '../../theme/tokens';
import { stackFrameVariants } from '../../animations/variants';
import type { StackFrame } from '../../engine';

interface CallStackProps {
  frames: StackFrame[];
}

export function CallStack({ frames }: CallStackProps) {
  return (
    <PanelContainer
      title="Call Stack"
      accentColor={tokens.colors.accent.callStack}
      count={frames.length}
    >
      {frames.length === 0 ? (
        <div style={{
          color: tokens.colors.text.muted,
          fontSize: 12,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '20px 0',
        }}>
          Empty
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <AnimatePresence mode="popLayout">
            {[...frames].reverse().map((frame, i) => (
              <motion.div
                key={frame.id}
                variants={stackFrameVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                style={{
                  padding: '8px 12px',
                  background: i === 0
                    ? `${tokens.colors.accent.callStack}15`
                    : tokens.colors.bg.surface,
                  borderRadius: 8,
                  border: i === 0
                    ? `1px solid ${tokens.colors.accent.callStack}40`
                    : `1px solid ${tokens.colors.border.panel}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontFamily: tokens.font.code,
                  color: i === 0 ? tokens.colors.accent.callStack : tokens.colors.text.primary,
                  fontWeight: i === 0 ? 600 : 400,
                }}>
                  {frame.label}
                </span>
                {frame.line && (
                  <span style={{
                    fontSize: 10,
                    color: tokens.colors.text.muted,
                    fontFamily: tokens.font.code,
                  }}>
                    :{frame.line}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PanelContainer>
  );
}
