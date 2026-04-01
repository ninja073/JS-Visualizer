import React from 'react';
import { motion } from 'motion/react';
import { tokens } from '../../theme/tokens';
import type { EventLoopPhase } from '../../engine';

interface EventLoopIndicatorProps {
  phase: EventLoopPhase;
}

const phaseLabels: Record<EventLoopPhase, string> = {
  'idle': 'Idle',
  'executing-sync': 'Executing Sync',
  'checking-microtasks': 'Check Microtasks',
  'executing-microtask': 'Run Microtask',
  'checking-macrotasks': 'Check Tasks',
  'executing-macrotask': 'Run Macrotask',
  'advancing-timers': 'Advance Timers',
};

const phaseColors: Record<EventLoopPhase, string> = {
  'idle': tokens.colors.text.muted,
  'executing-sync': tokens.colors.accent.callStack,
  'checking-microtasks': tokens.colors.accent.microtask,
  'executing-microtask': tokens.colors.accent.microtask,
  'checking-macrotasks': tokens.colors.accent.taskQueue,
  'executing-macrotask': tokens.colors.accent.taskQueue,
  'advancing-timers': tokens.colors.accent.webAPI,
};

export function EventLoopIndicator({ phase }: EventLoopIndicatorProps) {
  const isActive = phase !== 'idle' && phase !== 'executing-sync';
  const color = phaseColors[phase];

  return (
    <div style={{
      background: tokens.colors.bg.panel,
      borderRadius: tokens.radius.lg,
      border: `1px solid ${tokens.colors.border.panel}`,
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: tokens.colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tokens.colors.accent.eventLoop,
          boxShadow: `0 0 8px ${tokens.colors.accent.eventLoop}50`,
        }} />
        Event Loop
      </div>

      {/* Circular indicator */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          {/* Background ring */}
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={`${tokens.colors.text.muted}20`}
            strokeWidth="4"
          />
          {/* Active arc */}
          {isActive && (
            <motion.circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray="60 141"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: 'linear',
              }}
              style={{ transformOrigin: '40px 40px' }}
            />
          )}
        </svg>

        {/* Center phase label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 9,
          fontWeight: 600,
          color,
          textAlign: 'center',
          width: 56,
          lineHeight: '1.2',
        }}>
          {phaseLabels[phase]}
        </div>
      </div>

      {/* Phase indicators */}
      <div style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {(['checking-microtasks', 'checking-macrotasks', 'advancing-timers'] as EventLoopPhase[]).map((p) => (
          <motion.div
            key={p}
            animate={{
              opacity: phase === p || phase === p.replace('checking', 'executing') as EventLoopPhase ? 1 : 0.3,
              scale: phase === p || phase === p.replace('checking', 'executing') as EventLoopPhase ? 1.05 : 1,
            }}
            style={{
              fontSize: 8,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${phaseColors[p]}15`,
              color: phaseColors[p],
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {p === 'checking-microtasks' ? 'Micro' : p === 'checking-macrotasks' ? 'Macro' : 'Timer'}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
