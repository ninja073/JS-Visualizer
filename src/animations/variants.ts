import { springTransition, quickTween } from './transitions';

export const stackFrameVariants = {
  initial: { opacity: 0, y: -30, scaleY: 0.85 },
  animate: { opacity: 1, y: 0, scaleY: 1, transition: springTransition },
  exit: { opacity: 0, scaleY: 0.7, y: -20, transition: quickTween },
};

export const queueItemVariants = {
  initial: { opacity: 0, x: 50, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1, transition: springTransition },
  exit: { opacity: 0, x: -50, scale: 0.9, transition: quickTween },
};

export const webApiVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0, transition: quickTween },
};

export const consoleLineVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: springTransition },
};

export const panelGlowVariants = {
  idle: { boxShadow: '0 0 0px rgba(255,255,255,0)' },
  active: {
    boxShadow: '0 0 20px rgba(255,255,255,0.05)',
    transition: { duration: 0.3 },
  },
};

export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
