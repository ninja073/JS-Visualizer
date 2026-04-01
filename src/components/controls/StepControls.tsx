import React from 'react';
import { motion } from 'motion/react';
import { tokens } from '../../theme/tokens';
import { useVisualizerStore, selectCurrentStep, selectTotalSteps } from '../../store/useVisualizerStore';
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

export function StepControls() {
  const trace = useVisualizerStore((s) => s.trace);
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const playbackSpeed = useVisualizerStore((s) => s.playbackSpeed);
  const stepForward = useVisualizerStore((s) => s.stepForward);
  const stepBackward = useVisualizerStore((s) => s.stepBackward);
  const togglePlay = useVisualizerStore((s) => s.togglePlay);
  const reset = useVisualizerStore((s) => s.reset);
  const setSpeed = useVisualizerStore((s) => s.setSpeed);
  const current = useVisualizerStore(selectCurrentStep);
  const total = useVisualizerStore(selectTotalSteps);

  if (!trace) return null;

  const speeds = [
    { label: '0.5x', value: 1600 },
    { label: '1x', value: 800 },
    { label: '2x', value: 400 },
    { label: '4x', value: 200 },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      borderTop: `1px solid ${tokens.colors.border.panel}`,
      background: tokens.colors.bg.panel,
      flexShrink: 0,
    }}>
      {/* Step backward */}
      <ControlButton
        onClick={stepBackward}
        disabled={current <= 0}
        tooltip="Previous (Left arrow)"
      >
        <SkipBack size={16} />
      </ControlButton>

      {/* Play/Pause */}
      <ControlButton
        onClick={togglePlay}
        highlight
        tooltip="Play/Pause (Space)"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </ControlButton>

      {/* Step forward */}
      <ControlButton
        onClick={stepForward}
        disabled={current >= total - 1}
        tooltip="Next (Right arrow)"
      >
        <SkipForward size={16} />
      </ControlButton>

      {/* Reset */}
      <ControlButton
        onClick={reset}
        tooltip="Reset (R)"
      >
        <RotateCcw size={14} />
      </ControlButton>

      {/* Step counter */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: tokens.colors.text.secondary,
          fontFamily: tokens.font.code,
        }}>
          Step {current + 1} / {total}
        </div>
        {/* Progress bar */}
        <div style={{
          width: '100%',
          maxWidth: 300,
          height: 3,
          background: tokens.colors.bg.surface,
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            useVisualizerStore.getState().jumpToStep(Math.round(pct * (total - 1)));
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${tokens.colors.accent.context}, ${tokens.colors.accent.webAPI})`,
              borderRadius: 2,
            }}
            animate={{
              width: `${total > 0 ? ((current + 1) / total) * 100 : 0}%`,
            }}
            transition={{ type: 'tween', duration: 0.15 }}
          />
        </div>
      </div>

      {/* Speed controls */}
      <div style={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 10,
          color: tokens.colors.text.muted,
          marginRight: 4,
        }}>
          Speed
        </span>
        {speeds.map((s) => (
          <button
            key={s.value}
            onClick={() => setSpeed(s.value)}
            style={{
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 600,
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontFamily: tokens.font.ui,
              background: playbackSpeed === s.value
                ? tokens.colors.accent.context
                : tokens.colors.bg.surface,
              color: playbackSpeed === s.value
                ? tokens.colors.bg.app
                : tokens.colors.text.muted,
              transition: 'all 0.15s ease',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

function ControlButton({ onClick, disabled, highlight, tooltip, children }: ControlButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      whileHover={!disabled ? { scale: 1.1 } : undefined}
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      style={{
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: highlight
          ? `linear-gradient(135deg, ${tokens.colors.accent.context}, ${tokens.colors.accent.webAPI})`
          : tokens.colors.bg.surface,
        color: disabled
          ? tokens.colors.text.muted
          : highlight
            ? tokens.colors.bg.app
            : tokens.colors.text.primary,
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      {children}
    </motion.button>
  );
}
