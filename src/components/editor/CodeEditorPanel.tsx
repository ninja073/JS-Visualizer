import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { editorThemeData } from './editorTheme';
import { ExampleSelector } from './ExampleSelector';
import { useVisualizerStore, selectCurrentSnapshot } from '../../store/useVisualizerStore';
import { tokens } from '../../theme/tokens';

export function CodeEditorPanel() {
  const code = useVisualizerStore((s) => s.code);
  const setCode = useVisualizerStore((s) => s.setCode);
  const runCode = useVisualizerStore((s) => s.runCode);
  const loadExample = useVisualizerStore((s) => s.loadExample);
  const trace = useVisualizerStore((s) => s.trace);
  const error = useVisualizerStore((s) => s.error);
  const snapshot = useVisualizerStore(selectCurrentSnapshot);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('jsvis-dark', editorThemeData);
    monaco.editor.setTheme('jsvis-dark');
  }, []);

  // Highlight current line
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const line = snapshot?.state?.highlightedLine;
    if (line && line > 0) {
      const monaco = (window as any).monaco;
      if (monaco) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'executing-line',
              glyphMarginClassName: 'executing-line-glyph',
            },
          },
        ]);
        editor.revealLineInCenter(line);
      }
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [snapshot]);

  const isExecuting = trace !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ExampleSelector onSelect={loadExample} currentCode={code} />

      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={(val) => {
            if (!isExecuting && val !== undefined) {
              setCode(val);
            }
          }}
          theme="jsvis-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            readOnly: isExecuting,
            renderLineHighlight: isExecuting ? 'none' : 'line',
            glyphMargin: true,
            folding: false,
            lineDecorationsWidth: 12,
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      {/* Run Button */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${tokens.colors.border.panel}`,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        {!isExecuting ? (
          <button
            onClick={runCode}
            style={{
              flex: 1,
              padding: '9px 16px',
              background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
              color: '#0a0a1a',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: tokens.font.ui,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>&#9654;</span>
            Run & Visualize
          </button>
        ) : (
          <button
            onClick={() => {
              useVisualizerStore.getState().setCode(code);
            }}
            style={{
              flex: 1,
              padding: '9px 16px',
              background: tokens.colors.bg.surface,
              color: tokens.colors.text.secondary,
              border: `1px solid ${tokens.colors.border.panel}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: tokens.font.ui,
              cursor: 'pointer',
            }}
          >
            Reset & Edit
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#FF6B6B18',
          color: '#FF6B6B',
          fontSize: 12,
          fontFamily: tokens.font.code,
          borderTop: '1px solid #FF6B6B30',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
