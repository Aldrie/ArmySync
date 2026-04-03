import ColorField from './color-field';
import ColorListField from './color-list-field';
import DurationField from './duration-field';
import NumberField from './number-field';
import SelectField from './select-field';
import type { FieldDescriptor } from '../../../../domains/effects/types';

interface FieldRendererProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export default function FieldRenderer({
  field,
  value,
  onChange,
}: FieldRendererProps) {
  switch (field.type) {
    case 'color':
      return (
        <ColorField
          label={field.label}
          value={(value as string) ?? field.default}
          onChange={(v) => onChange(field.key, v)}
        />
      );

    case 'number':
      return (
        <NumberField
          label={field.label}
          value={(value as number) ?? field.default}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(v) => onChange(field.key, v)}
        />
      );

    case 'select':
      return (
        <SelectField
          label={field.label}
          value={(value as string) ?? field.default}
          options={field.options}
          onChange={(v) => onChange(field.key, v)}
        />
      );

    case 'duration':
      return (
        <DurationField
          label={field.label}
          value={(value as number) ?? field.default}
          min={field.min}
          max={field.max}
          onChange={(v) => onChange(field.key, v)}
        />
      );

    case 'color-list':
      return (
        <ColorListField
          label={field.label}
          value={(value as string[]) ?? field.default}
          min={field.min}
          max={field.max}
          onChange={(v) => onChange(field.key, v)}
        />
      );

    default:
      return null;
  }
}
