import { registerEffect } from '../registry';
import { blackoutDefinition } from './blackout';
import { colorDefinition } from './color';
import { fadeDefinition } from './fade';
import { flashDefinition } from './flash';

export function registerBuiltinEffects() {
  registerEffect(colorDefinition);
  registerEffect(fadeDefinition);
  registerEffect(flashDefinition);
  registerEffect(blackoutDefinition);
}
