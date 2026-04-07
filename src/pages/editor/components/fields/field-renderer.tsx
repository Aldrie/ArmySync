import type { ReactNode } from 'react';

import ColorField from './color-field';
import ColorListField from './color-list-field';
import DurationField from './duration-field';
import NumberField from './number-field';
import SelectField from './select-field';
import TapSyncField from './tap-sync-field';
import type { FieldDescriptor } from '../../../../domains/effects/types';

interface FieldRendererProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

type RenderFn = (
  field: FieldDescriptor,
  value: unknown,
  onChange: (v: unknown) => void,
) => ReactNode;

const FIELD_RENDERERS: Record<string, RenderFn> = {
  color: (field, value, onChange) => (
    <ColorField
      label={field.label}
      value={(value as string) ?? field.default}
      onChange={onChange}
    />
  ),
  number: (field, value, onChange) => (
    <NumberField
      label={field.label}
      value={(value as number) ?? field.default}
      min={'min' in field ? field.min : undefined}
      max={'max' in field ? field.max : undefined}
      step={'step' in field ? field.step : undefined}
      onChange={onChange}
    />
  ),
  select: (field, value, onChange) => (
    <SelectField
      label={field.label}
      value={(value as string) ?? field.default}
      options={'options' in field ? field.options : []}
      onChange={onChange}
    />
  ),
  duration: (field, value, onChange) => (
    <DurationField
      label={field.label}
      value={(value as number) ?? field.default}
      min={'min' in field ? field.min : undefined}
      max={'max' in field ? field.max : undefined}
      onChange={onChange}
    />
  ),
  'color-list': (field, value, onChange) => (
    <ColorListField
      label={field.label}
      value={(value as string[]) ?? field.default}
      min={'min' in field ? field.min : undefined}
      max={'max' in field ? field.max : undefined}
      onChange={onChange}
    />
  ),
  'tap-sync': (_field, _value, onChange) => (
    <TapSyncField onChange={(v) => onChange(v)} />
  ),
};

export default function FieldRenderer({
  field,
  value,
  onChange,
}: FieldRendererProps) {
  const render = FIELD_RENDERERS[field.type];
  if (!render) return null;

  return render(field, value, (v) => onChange(field.key, v));
}
