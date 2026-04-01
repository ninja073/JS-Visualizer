import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelContainer } from '../layout/PanelContainer';
import { tokens } from '../../theme/tokens';
import { webApiVariants } from '../../animations/variants';
import type { WebApiTimer, WebApiFetch } from '../../engine';

interface WebAPIsProps {
  timers: WebApiTimer[];
  fetches: WebApiFetch[];
}

export function WebAPIs({ timers, fetches }: WebAPIsProps) {
  const totalItems = timers.length + fetches.length;

  return (
    <PanelContainer
      title="Web APIs"
      accentColor={tokens.colors.accent.webAPI}
      count={totalItems}
    >
      {totalItems === 0 ? (
        <div style={{
          color: tokens.colors.text.muted,
          fontSize: 12,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '20px 0',
        }}>
          No active Web APIs
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence mode="popLayout">
            {timers.map((timer) => (
              <motion.div
                key={timer.id}
                variants={webApiVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: tokens.colors.bg.surface,
                  borderRadius: 8,
                  border: `1px solid ${tokens.colors.accent.webAPI}25`,
                }}
              >
                {/* Timer ring */}
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle
                    cx="14" cy="14" r="11"
                    fill="none"
                    stroke={`${tokens.colors.accent.webAPI}30`}
                    strokeWidth="2.5"
                  />
                  <motion.circle
                    cx="14" cy="14" r="11"
                    fill="none"
                    stroke={tokens.colors.accent.webAPI}
                    strokeWidth="2.5"
                    strokeDasharray={69.1}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform="rotate(-90 14 14)"
                    animate={{
                      strokeDashoffset: [0, 69.1],
                    }}
                    transition={{
                      duration: Math.max(timer.delay / 1000, 0.5),
                      ease: 'linear',
                    }}
                  />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12,
                    fontFamily: tokens.font.code,
                    color: tokens.colors.text.primary,
                  }}>
                    {timer.label}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: tokens.colors.text.muted,
                  }}>
                    {timer.delay}ms
                  </div>
                </div>
              </motion.div>
            ))}
            {fetches.map((f) => (
              <motion.div
                key={f.id}
                variants={webApiVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: tokens.colors.bg.surface,
                  borderRadius: 8,
                  border: `1px solid ${tokens.colors.accent.webAPI}25`,
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `${tokens.colors.accent.webAPI}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  >
                    &#8635;
                  </motion.div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12,
                    fontFamily: tokens.font.code,
                    color: tokens.colors.text.primary,
                  }}>
                    {f.label}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: tokens.colors.text.muted,
                  }}>
                    Loading...
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PanelContainer>
  );
}
