import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tokens } from '../../theme/tokens';
import { consoleLineVariants } from '../../animations/variants';
import type { ConsoleEntry } from '../../engine';

interface ConsolePanelProps {
  entries: ConsoleEntry[];
}

const typeStyles: Record<string, { color: string; prefix: string }> = {
  log: { color: tokens.colors.text.primary, prefix: '' },
  warn: { color: '#FECA57', prefix: '! ' },
  error: { color: '#FF6B6B', prefix: 'x ' },
};

export function ConsolePanel({ entries }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderBottom: `1px solid ${tokens.colors.border.panel}`,
        flexShrink: 0,
        background: tokens.colors.bg.panelHeader,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tokens.colors.accent.console,
          boxShadow: `0 0 6px ${tokens.colors.accent.console}50`,
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: tokens.colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Console
        </span>
        {entries.length > 0 && (
          <span style={{
            fontSize: 10,
            color: tokens.colors.accent.console,
            background: `${tokens.colors.accent.console}15`,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 600,
            marginLeft: 'auto',
          }}>
            {entries.length}
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '6px 14px',
          fontFamily: tokens.font.code,
          fontSize: 12,
          minHeight: 0,
        }}
      >
        {entries.length === 0 ? (
          <div style={{
            color: tokens.colors.text.muted,
            fontSize: 12,
            fontStyle: 'italic',
            padding: '8px 0',
          }}>
            Output will appear here...
          </div>
        ) : (
          <AnimatePresence>
            {entries.map((entry) => {
              const style = typeStyles[entry.type] || typeStyles.log;
              return (
                <motion.div
                  key={entry.id}
                  variants={consoleLineVariants}
                  initial="initial"
                  animate="animate"
                  style={{
                    color: style.color,
                    padding: '3px 0',
                    borderBottom: `1px solid ${tokens.colors.border.panel}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                >
                  {style.prefix && (
                    <span style={{ opacity: 0.7, flexShrink: 0 }}>{style.prefix}</span>
                  )}
                  <span>{entry.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
