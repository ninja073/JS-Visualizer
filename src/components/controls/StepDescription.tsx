import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tokens } from '../../theme/tokens';
import type { Snapshot } from '../../engine';

interface StepDescriptionProps {
  snapshot: Snapshot | null;
}

const stepTypeColors: Record<string, string> = {
  'program-start': tokens.colors.accent.context,
  'program-end': tokens.colors.accent.context,
  'variable-declaration': tokens.colors.accent.context,
  'variable-assignment': tokens.colors.accent.context,
  'function-declaration': '#61AFEF',
  'function-call': tokens.colors.accent.callStack,
  'function-return': tokens.colors.accent.callStack,
  'console-log': tokens.colors.accent.console,
  'register-timer': tokens.colors.accent.webAPI,
  'register-fetch': tokens.colors.accent.webAPI,
  'timer-fires': tokens.colors.accent.webAPI,
  'fetch-completes': tokens.colors.accent.webAPI,
  'promise-created': tokens.colors.accent.microtask,
  'promise-resolved': tokens.colors.accent.microtask,
  'promise-rejected': '#FF6B6B',
  'then-registered': tokens.colors.accent.microtask,
  'enqueue-microtask': tokens.colors.accent.microtask,
  'dequeue-microtask': tokens.colors.accent.microtask,
  'enqueue-macrotask': tokens.colors.accent.taskQueue,
  'dequeue-macrotask': tokens.colors.accent.taskQueue,
  'event-loop-check': tokens.colors.accent.eventLoop,
  'await-suspend': '#C678DD',
  'await-resume': '#C678DD',
  'runtime-error': '#FF6B6B',
};

export function StepDescription({ snapshot }: StepDescriptionProps) {
  if (!snapshot) return null;

  const color = stepTypeColors[snapshot.stepType] || tokens.colors.text.secondary;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={snapshot.index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }}
        style={{
          padding: '6px 16px',
          background: `${color}08`,
          borderTop: `1px solid ${tokens.colors.border.panel}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color,
          background: `${color}18`,
          padding: '2px 7px',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}>
          {snapshot.stepType.replace(/-/g, ' ')}
        </span>
        <span style={{
          fontSize: 12,
          color: tokens.colors.text.secondary,
          fontFamily: tokens.font.code,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {snapshot.description}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
