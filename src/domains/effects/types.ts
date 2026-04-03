// ---------------------------------------------------------------------------
// Field descriptors — drive the properties panel dynamically per effect type
// ---------------------------------------------------------------------------

export interface ColorFieldDescriptor {
  key: string;
  label: string;
  type: 'color';
  default: string;
}

export interface NumberFieldDescriptor {
  key: string;
  label: string;
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldDescriptor {
  key: string;
  label: string;
  type: 'select';
  options: { label: string; value: string }[];
  default: string;
}

export interface DurationFieldDescriptor {
  key: string;
  label: string;
  type: 'duration';
  default: number;
  min?: number;
  max?: number;
}

export interface ColorListFieldDescriptor {
  key: string;
  label: string;
  type: 'color-list';
  default: string[];
  min?: number;
  max?: number;
}

export type FieldDescriptor =
  | ColorFieldDescriptor
  | NumberFieldDescriptor
  | SelectFieldDescriptor
  | DurationFieldDescriptor
  | ColorListFieldDescriptor;

// ---------------------------------------------------------------------------
// Effect definition — one per registered effect type (strategy pattern entry)
// ---------------------------------------------------------------------------

export interface EffectHandlerParams {
  params: Record<string, unknown>;
  duration: number;
  current: number;
}

export interface EffectDefinition {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultDuration: number;
  handler: (input: EffectHandlerParams) => string;
  uiConfig: FieldDescriptor[];
  renderPreview: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: Record<string, unknown>,
  ) => void;
  buildStripBackground: (params: Record<string, unknown>) => string;
}

// ---------------------------------------------------------------------------
// Effect instance — a concrete effect placed on the timeline
// ---------------------------------------------------------------------------

export interface EffectInstance {
  id: string;
  type: string;
  from: number;
  to: number;
  params: Record<string, unknown>;
}
