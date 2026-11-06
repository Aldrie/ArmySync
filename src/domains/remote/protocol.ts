import type { Pad, PadKind, Profile } from './pads';
import type { EffectInstance } from '../effects/types';

export interface TransportSnapshot {
  playing: boolean;
  songTime: number;
  serverTime: number;
}

export interface Take {
  id: string;
  chunk: number;
  startTime: number;
  effects: EffectInstance[];
}

export type PhoneToMac =
  | { type: 'ping'; t0: number }
  | { type: 'play'; countdown: boolean }
  | { type: 'pause' }
  | { type: 'seek'; time: number }
  | { type: 'take'; take: Take }
  | { type: 'undo-take' }
  | { type: 'profiles-save'; profiles: Profile[] }
  | { type: 'calibrate'; mode: 'sound' | 'image' }
  | { type: 'latency-save'; latencyMs: number };

export type MacToPhone =
  | { type: 'pong'; t0: number; serverTime: number }
  | { type: 'state'; transport: TransportSnapshot }
  | {
      type: 'hello';
      projectId: string;
      projectName: string;
      projectNames: Record<string, string>;
      duration: number;
      profiles: Profile[];
      latencyMs: number;
      effects: EffectInstance[];
      lastTakeStart: number | null;
    }
  | {
      type: 'effects';
      effects: EffectInstance[];
      lastTakeStart: number | null;
    }
  | {
      type: 'take-applied';
      takeId: string;
      chunk: number;
      lastTakeStart: number | null;
    }
  | { type: 'take-undone'; lastTakeStart: number | null }
  | {
      type: 'calibration-click';
      serverTime: number;
      beat: number;
      warmup: boolean;
    }
  | { type: 'error'; message: string };

type Json = Record<string, unknown>;

const PAD_COLOR_COUNT: Record<PadKind, number> = {
  color: 1,
  strobe: 2,
  fade: 2,
  blackout: 0,
};

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isChunk(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isHex(value: unknown): value is string {
  return isString(value) && /^#[0-9a-f]{6}$/i.test(value);
}

function isHexList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isHex);
}

function isPadKind(value: unknown): value is PadKind {
  return (
    isString(value) &&
    Object.prototype.hasOwnProperty.call(PAD_COLOR_COUNT, value)
  );
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || isNumber(value);
}

function hasValidParams(type: string, params: Json): boolean {
  switch (type) {
    case 'color':
      return isHex(params.color);
    case 'fade':
      return isHex(params.startColor) && isHex(params.endColor);
    case 'flash':
      return (
        isHexList(params.colors) &&
        params.colors.length > 0 &&
        isOptionalNumber(params.bpm)
      );
    default:
      return true;
  }
}

function isEffect(
  value: unknown,
  known: ReadonlySet<string>,
): value is EffectInstance {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.type) &&
    known.has(value.type) &&
    isNumber(value.from) &&
    isNumber(value.to) &&
    value.from < value.to &&
    isObject(value.params) &&
    hasValidParams(value.type, value.params)
  );
}

function isTake(value: unknown, known: ReadonlySet<string>): value is Take {
  return (
    isObject(value) &&
    isString(value.id) &&
    isChunk(value.chunk) &&
    isNumber(value.startTime) &&
    Array.isArray(value.effects) &&
    value.effects.every((e) => isEffect(e, known))
  );
}

function isPad(value: unknown): value is Pad {
  return (
    isObject(value) &&
    isString(value.id) &&
    isPadKind(value.kind) &&
    isHexList(value.colors) &&
    value.colors.length === PAD_COLOR_COUNT[value.kind] &&
    isOptionalNumber(value.bpm)
  );
}

function isProfile(value: unknown): value is Profile {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.projectId) &&
    isString(value.name) &&
    Array.isArray(value.pads) &&
    value.pads.every(isPad)
  );
}

function toMessage(m: Json, known: ReadonlySet<string>): PhoneToMac | null {
  switch (m.type) {
    case 'ping':
      return isNumber(m.t0) ? { type: 'ping', t0: m.t0 } : null;
    case 'play':
      return typeof m.countdown === 'boolean'
        ? { type: 'play', countdown: m.countdown }
        : null;
    case 'pause':
      return { type: 'pause' };
    case 'seek':
      return isNumber(m.time) ? { type: 'seek', time: m.time } : null;
    case 'take':
      return isTake(m.take, known) ? { type: 'take', take: m.take } : null;
    case 'undo-take':
      return { type: 'undo-take' };
    case 'profiles-save':
      return Array.isArray(m.profiles) && m.profiles.every(isProfile)
        ? { type: 'profiles-save', profiles: m.profiles }
        : null;
    case 'calibrate':
      return m.mode === 'sound' || m.mode === 'image'
        ? { type: 'calibrate', mode: m.mode }
        : null;
    case 'latency-save':
      return isNumber(m.latencyMs)
        ? { type: 'latency-save', latencyMs: m.latencyMs }
        : null;
    default:
      return null;
  }
}

export function parsePhoneMessage(
  raw: string,
  knownEffectTypes: ReadonlySet<string>,
): PhoneToMac | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  return isObject(message) ? toMessage(message, knownEffectTypes) : null;
}
