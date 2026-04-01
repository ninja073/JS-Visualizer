export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
  mass: 0.8,
};

export const gentleSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
  mass: 1,
};

export const quickTween = {
  type: 'tween' as const,
  duration: 0.2,
  ease: 'easeOut' as const,
};

export const smoothTween = {
  type: 'tween' as const,
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};
