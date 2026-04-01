import React from 'react';
import { tokens } from '../../theme/tokens';

interface PanelContainerProps {
  title: string;
  accentColor: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

export function PanelContainer({ title, accentColor, count, children, className = '' }: PanelContainerProps) {
  return (
    <div className={`panel-container ${className}`} style={{
      background: tokens.colors.bg.panel,
      borderRadius: tokens.radius.lg,
      border: `1px solid ${tokens.colors.border.panel}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: tokens.colors.bg.panelHeader,
        borderBottom: `1px solid ${tokens.colors.border.panel}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}50`,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: tokens.colors.text.secondary,
          fontFamily: tokens.font.ui,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: accentColor,
            background: `${accentColor}18`,
            padding: '1px 7px',
            borderRadius: 10,
            marginLeft: 'auto',
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '10px 12px',
        minHeight: 0,
      }}>
        {children}
      </div>
    </div>
  );
}
