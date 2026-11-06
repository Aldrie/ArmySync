import { AlertCircle } from 'lucide-react';

export const INPUT =
  'h-9 w-full min-w-0 rounded-lg border border-border-strong bg-surface-low px-3 text-sm text-on-surface placeholder:text-outline outline-none transition-[border-color,box-shadow] focus:border-primary/70 focus:ring-3 focus:ring-primary/15';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-on-surface-variant"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-outline">{hint}</p>}
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-error/25 bg-error/8 px-3 py-2.5 text-xs text-error"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}
