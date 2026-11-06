import type { Transition } from 'motion/react';

export const spring: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
  mass: 0.6,
};

export const easeOut: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};
