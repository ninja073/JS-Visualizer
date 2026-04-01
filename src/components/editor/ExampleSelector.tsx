import React from 'react';
import { examples } from '../../examples';
import { tokens } from '../../theme/tokens';

interface ExampleSelectorProps {
  onSelect: (id: string) => void;
  currentCode: string;
}

export function ExampleSelector({ onSelect, currentCode }: ExampleSelectorProps) {
  const currentExample = examples.find((e) => e.code === currentCode);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderBottom: `1px solid ${tokens.colors.border.panel}`,
      background: tokens.colors.bg.panelHeader,
    }}>
      <label style={{
        fontSize: 11,
        fontWeight: 600,
        color: tokens.colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        Examples
      </label>
      <select
        value={currentExample?.id || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          flex: 1,
          background: tokens.colors.bg.surface,
          color: tokens.colors.text.primary,
          border: `1px solid ${tokens.colors.border.panel}`,
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 12,
          fontFamily: tokens.font.ui,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="" disabled>
          Select an example...
        </option>
        {examples.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.title}
          </option>
        ))}
      </select>
    </div>
  );
}
