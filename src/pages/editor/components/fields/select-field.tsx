import { useCallback } from 'react';

interface SelectFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export default function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <select
        aria-label={label}
        className="h-7 rounded-md border border-border-strong bg-surface-container text-xs text-on-surface outline-none transition-[border-color,box-shadow] hover:border-outline-variant focus:border-primary/70 focus:ring-3 focus:ring-primary/15 cursor-pointer px-2"
        value={value}
        onChange={handleChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
