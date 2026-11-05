import { beforeAll, expect, it } from 'vitest';

import {
  edgeShadow,
  formatClock,
  glowOf,
  padBackground,
  padLook,
} from './look';
import { registerBuiltinEffects } from '../domains/effects';
import type { Pad } from '../domains/remote';

beforeAll(registerBuiltinEffects);

const borahae: Pad = { id: 'b', kind: 'color', colors: ['#3F00FF'] };
const fade: Pad = { id: 'f', kind: 'fade', colors: ['#4d7bff', '#b45cff'] };
const blackout: Pad = { id: 'k', kind: 'blackout', colors: [] };

it('glows Borahae in its glow color, fades in the start color, blackout not at all', () => {
  expect(glowOf(borahae)).toBe('#a55cff');
  expect(glowOf(fade)).toBe('#4d7bff');
  expect(glowOf(blackout)).toBeNull();
});

it('builds the screen edge shadow from the glow color', () => {
  expect(edgeShadow('#a55cff')).toBe(
    'inset 0 0 0 4px #a55cff, inset 0 0 18px 4px rgba(165,92,255,0.85), inset 0 0 70px 14px rgba(165,92,255,0.45)',
  );
  expect(edgeShadow(null)).toBe('none');
});

it('shows Borahae in its display color', () => {
  expect(padBackground(borahae)).toBe('#8b2cf5');
  expect(padBackground(blackout)).toBe('#000000');
});

it('scales held pads, numbers them and outlines only the last one', () => {
  const held = ['k', 'b'];
  expect(padLook(blackout, held)).toMatchObject({
    order: 1,
    active: false,
    style: { transform: 'scale(1.05)', border: '1px dashed #4b444e' },
  });
  const active = padLook(borahae, held);
  expect(active.order).toBe(2);
  expect(active.style.border).toBe('3px solid #ffffff');
  expect(active.style.boxShadow).toBe(
    '0 0 22px 2px rgba(165,92,255,0.5), 0 0 12px 1px rgba(165,92,255,.55)',
  );
  expect(padLook(fade, held)).toMatchObject({
    order: 0,
    style: { transform: '', boxShadow: 'none' },
  });
});

it('formats song time as m:ss.cc', () => {
  expect(formatClock(83.45)).toBe('1:23.45');
  expect(formatClock(1.15)).toBe('0:01.15');
  expect(formatClock(-2)).toBe('0:00.00');
});
