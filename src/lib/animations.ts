import type { Transition } from 'motion/react';

export const spring: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
  mass: 0.6,
};
