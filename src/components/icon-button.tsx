import { motion } from 'motion/react';
import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

import { spring } from '../lib/animations';

const iconButton = tv({
  base: 'text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer',
  variants: {
    size: {
      sm: 'p-1.5 [&_svg]:size-4',
      md: 'p-2 [&_svg]:size-5',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type IconButtonProps = ComponentPropsWithoutRef<typeof motion.button> &
  VariantProps<typeof iconButton>;

export default function IconButton({
  size,
  className,
  ...props
}: IconButtonProps) {
  return (
    <motion.button
      type="button"
      className={iconButton({ size, className })}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      {...props}
    />
  );
}
