import { create } from 'zustand';
import { parseAndRun, type ExecutionTrace, type Snapshot } from '../engine';
import { examples } from '../examples';

interface VisualizerState {
  code: string;
  trace: ExecutionTrace | null;
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number; // ms per step
  error: string | null;

  // Actions
  setCode: (code: string) => void;
  runCode: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (step: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  loadExample: (id: string) => void;
}

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  code: examples[0].code,
  trace: null,
  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 800,
  error: null,

  setCode: (code) => set({ code, trace: null, currentStep: 0, error: null, isPlaying: false }),

  runCode: () => {
    const { code } = get();
    try {
      const trace = parseAndRun(code);
      set({
        trace,
        currentStep: 0,
        error: trace.error?.message || null,
        isPlaying: false,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unknown error', trace: null });
    }
  },

  stepForward: () => {
    const { trace, currentStep } = get();
    if (!trace) return;
    if (currentStep < trace.totalSteps - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  jumpToStep: (step) => {
    const { trace } = get();
    if (!trace) return;
    set({ currentStep: Math.max(0, Math.min(step, trace.totalSteps - 1)) });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => {
    const { isPlaying, trace, currentStep } = get();
    if (!trace) return;
    // If at end, reset to start
    if (!isPlaying && currentStep >= trace.totalSteps - 1) {
      set({ currentStep: 0, isPlaying: true });
    } else {
      set({ isPlaying: !isPlaying });
    }
  },

  reset: () => set({ currentStep: 0, isPlaying: false }),

  setSpeed: (speed) => set({ playbackSpeed: speed }),

  loadExample: (id) => {
    const example = examples.find((e) => e.id === id);
    if (example) {
      set({ code: example.code, trace: null, currentStep: 0, error: null, isPlaying: false });
    }
  },
}));

// Selectors
export const selectCurrentSnapshot = (state: VisualizerState): Snapshot | null => {
  if (!state.trace || state.trace.snapshots.length === 0) return null;
  return state.trace.snapshots[state.currentStep] || null;
};

// Use primitive selectors to avoid object creation on every render
export const selectCurrentStep = (state: VisualizerState) => state.currentStep;
export const selectTotalSteps = (state: VisualizerState) => state.trace?.totalSteps || 0;
