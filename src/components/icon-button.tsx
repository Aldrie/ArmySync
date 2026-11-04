import { motion } from 'motion/react';
import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

import { spring } from '../lib/animations';

const iconButton = tv({
  base: 'inline-flex shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none',
  variants: {
    size: {
      sm: 'size-7 [&_svg]:size-4',
      md: 'size-9 [&_svg]:size-5',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type IconButtonProps = ComponentPropsWithoutRef<typeof motion.button> &
  VariantProps<typeof iconButton> & {
    label: string;
  };

export default function IconButton({
  size,
  className,
  label,
  ...props
}: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      className={iconButton({ size, className })}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      {...props}
    />
  );
}
