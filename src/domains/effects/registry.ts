import type { EffectDefinition } from './types';

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
