import type { EffectDefinition, EffectInstance } from './types';

const registry = new Map<string, EffectDefinition>();

export function registerEffect(definition: EffectDefinition) {
  registry.set(definition.type, definition);
}

export function getEffectDefinition(
  type: string,
): EffectDefinition | undefined {
  return registry.get(type);
}

export function getAllEffectDefinitions(): EffectDefinition[] {
  return Array.from(registry.values());
}

export function extractColors(effect: EffectInstance): string[] {
  const def = registry.get(effect.type);
  if (!def) return [];

  const colors: string[] = [];
  for (const field of def.fields) {
    const value = effect.params[field.key];
    if (field.type === 'color' && typeof value === 'string') {
      colors.push(value);
    } else if (field.type === 'color-list' && Array.isArray(value)) {
      colors.push(...(value as string[]));
    }
  }
  return colors;
}
