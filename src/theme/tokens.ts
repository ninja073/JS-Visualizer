export const tokens = {
  colors: {
    bg: {
      app: '#0a0a1a',
      panel: '#12122a',
      panelHeader: '#1a1a3e',
      editor: '#1e1e2e',
      surface: '#1e1e3a',
      surfaceHover: '#2a2a4a',
    },
    accent: {
      callStack: '#FF6B6B',
      context: '#4ECDC4',
      webAPI: '#45B7D1',
      microtask: '#FECA57',
      taskQueue: '#FF9FF3',
      eventLoop: '#00E676',
      console: '#A8E6CF',
    },
    text: {
      primary: '#E8E8F0',
      secondary: '#8888A8',
      muted: '#555570',
    },
    border: {
      panel: 'rgba(255,255,255,0.06)',
      active: 'rgba(255,255,255,0.15)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
  },
  font: {
    code: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    ui: "'Inter', system-ui, -apple-system, sans-serif",
  },
} as const;
