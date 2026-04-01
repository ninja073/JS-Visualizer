import { editor } from 'monaco-editor';

export const editorThemeData: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A6A8A', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C678DD' },
    { token: 'keyword.control', foreground: 'C678DD' },
    { token: 'string', foreground: '98C379' },
    { token: 'number', foreground: 'D19A66' },
    { token: 'type', foreground: 'E5C07B' },
    { token: 'identifier', foreground: 'E8E8F0' },
    { token: 'delimiter', foreground: '8888A8' },
    { token: 'variable', foreground: 'E06C75' },
    { token: 'variable.predefined', foreground: '56B6C2' },
    { token: 'function', foreground: '61AFEF' },
  ],
  colors: {
    'editor.background': '#1e1e2e',
    'editor.foreground': '#E8E8F0',
    'editor.lineHighlightBackground': '#2a2a4a40',
    'editor.selectionBackground': '#3E4451',
    'editorCursor.foreground': '#528BFF',
    'editor.inactiveSelectionBackground': '#3A3F4B',
    'editorLineNumber.foreground': '#555570',
    'editorLineNumber.activeForeground': '#8888A8',
    'editorGutter.background': '#1a1a2e',
    'editorWidget.background': '#12122a',
  },
};
