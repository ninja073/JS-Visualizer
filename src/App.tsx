import React from 'react';
import { AppShell } from './components/layout/AppShell';
import { CodeEditorPanel } from './components/editor/CodeEditorPanel';
import { CallStack } from './components/visualizer/CallStack';
import { ExecutionContext } from './components/visualizer/ExecutionContext';
import { WebAPIs } from './components/visualizer/WebAPIs';
import { MicrotaskQueue } from './components/visualizer/MicrotaskQueue';
import { TaskQueue } from './components/visualizer/TaskQueue';
import { EventLoopIndicator } from './components/visualizer/EventLoopIndicator';
import { ConsolePanel } from './components/console/ConsolePanel';
import { StepControls } from './components/controls/StepControls';
import { StepDescription } from './components/controls/StepDescription';
import { useVisualizerStore, selectCurrentSnapshot } from './store/useVisualizerStore';
import { usePlayback, useKeyboardShortcuts } from './hooks/usePlayback';
import { tokens } from './theme/tokens';

function VisualizationGrid() {
  const snapshot = useVisualizerStore(selectCurrentSnapshot);
  const trace = useVisualizerStore((s) => s.trace);

  if (!trace || !snapshot) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${tokens.colors.accent.callStack}20, ${tokens.colors.accent.microtask}20, ${tokens.colors.accent.context}20)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
        }}>
          {'{ }'}
        </div>
        <div style={{
          fontSize: 14,
          color: tokens.colors.text.muted,
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Select an example or write your code,<br />
          then click <strong style={{ color: tokens.colors.accent.context }}>Run & Visualize</strong>
        </div>
      </div>
    );
  }

  const { state } = snapshot;
  const currentEnvId = state.callStack.length > 0
    ? state.callStack[state.callStack.length - 1].envId
    : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr auto 1fr',
      gap: 10,
      height: '100%',
      gridTemplateAreas: `
        "callstack context"
        "webapis eventloop"
        "microtasks tasks"
      `,
    }}>
      <div style={{ gridArea: 'callstack', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CallStack frames={state.callStack} />
        </div>
      </div>
      <div style={{ gridArea: 'context', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ExecutionContext
            environments={state.environments}
            currentEnvId={currentEnvId}
          />
        </div>
      </div>
      <div style={{ gridArea: 'webapis', display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <WebAPIs timers={state.webApis.timers} fetches={state.webApis.fetches} />
        </div>
      </div>
      <div style={{ gridArea: 'eventloop', display: 'flex', justifyContent: 'center' }}>
        <EventLoopIndicator phase={state.eventLoopPhase} />
      </div>
      <div style={{ gridArea: 'microtasks', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MicrotaskQueue tasks={state.microtaskQueue} />
        </div>
      </div>
      <div style={{ gridArea: 'tasks', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <TaskQueue tasks={state.taskQueue} />
        </div>
      </div>
    </div>
  );
}

function ControlsSection() {
  const snapshot = useVisualizerStore(selectCurrentSnapshot);

  return (
    <>
      <StepDescription snapshot={snapshot} />
      <StepControls />
    </>
  );
}

function ConsoleSection() {
  const snapshot = useVisualizerStore(selectCurrentSnapshot);
  return <ConsolePanel entries={snapshot?.state?.consoleOutput || []} />;
}

export default function App() {
  usePlayback();
  useKeyboardShortcuts();

  return (
    <AppShell
      editor={<CodeEditorPanel />}
      visualization={<VisualizationGrid />}
      controls={<ControlsSection />}
      console={<ConsoleSection />}
    />
  );
}
