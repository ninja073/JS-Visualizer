import React from 'react';
import { tokens } from '../../theme/tokens';

interface AppShellProps {
  editor: React.ReactNode;
  visualization: React.ReactNode;
  controls: React.ReactNode;
  console: React.ReactNode;
}

export function AppShell({ editor, visualization, controls, console: consolePanel }: AppShellProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: tokens.colors.bg.app,
      fontFamily: tokens.font.ui,
      color: tokens.colors.text.primary,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: `1px solid ${tokens.colors.border.panel}`,
        flexShrink: 0,
        background: tokens.colors.bg.panel,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #FF6B6B, #FECA57, #4ECDC4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>
            JS
          </div>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.01em',
          }}>
            JS Visualizer
          </span>
          <span style={{
            fontSize: 11,
            color: tokens.colors.text.muted,
            background: tokens.colors.bg.surface,
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            Event Loop & Runtime
          </span>
        </div>
        <div style={{
          fontSize: 11,
          color: tokens.colors.text.muted,
        }}>
          Arrow keys to step | Space to play/pause
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left: Editor */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${tokens.colors.border.panel}`,
          overflow: 'hidden',
        }}>
          {editor}
        </div>

        {/* Right: Visualization */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 12,
            minHeight: 0,
          }}>
            {visualization}
          </div>

          {/* Controls */}
          {controls}

          {/* Console */}
          <div style={{
            height: 140,
            borderTop: `1px solid ${tokens.colors.border.panel}`,
            flexShrink: 0,
          }}>
            {consolePanel}
          </div>
        </div>
      </div>
    </div>
  );
}
