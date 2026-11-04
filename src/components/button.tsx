import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const button = tv({
  base: 'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none cursor-pointer transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-40',
  variants: {
    intent: {
      primary:
        'bg-primary text-on-primary font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.4)] hover:bg-primary-dim',
      secondary:
        'border border-border-strong bg-surface-high text-on-surface shadow-raised hover:bg-surface-highest',
      ghost:
        'text-on-surface-variant hover:bg-surface-high hover:text-on-surface',
      danger: 'bg-error/10 text-error hover:bg-error/20',
      tonal: 'bg-primary/10 text-primary hover:bg-primary/20',
    },
    size: {
      sm: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',
      md: 'h-9 px-3.5 text-sm [&_svg]:size-4',
      lg: 'h-10 px-5 text-sm [&_svg]:size-4',
    },
  },
  defaultVariants: {
    intent: 'secondary',
    size: 'md',
  },
});

type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof button>;

export default function Button({
  intent,
  size,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={button({ intent, size, className })}
      {...props}
    />
  );
}
