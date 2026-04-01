import { useEffect, useRef, useCallback } from 'react';
import { useVisualizerStore } from '../store/useVisualizerStore';

export function usePlayback() {
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const playbackSpeed = useVisualizerStore((s) => s.playbackSpeed);
  const stepForward = useVisualizerStore((s) => s.stepForward);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        stepForward();
      }, playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, stepForward]);
}

export function useKeyboardShortcuts() {
  const stepForward = useVisualizerStore((s) => s.stepForward);
  const stepBackward = useVisualizerStore((s) => s.stepBackward);
  const togglePlay = useVisualizerStore((s) => s.togglePlay);
  const reset = useVisualizerStore((s) => s.reset);
  const trace = useVisualizerStore((s) => s.trace);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!trace) return;
      // Don't capture when typing in the editor
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        (e.target instanceof HTMLElement && e.target.closest('.monaco-editor'))
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'r':
        case 'R':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            reset();
          }
          break;
      }
    },
    [trace, stepForward, stepBackward, togglePlay, reset]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
