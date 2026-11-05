import { EyeOff, Heart, Pipette, X } from 'lucide-react';
import { useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';

import {
  displayColor,
  isBorahae,
  PAD_SWATCHES,
  type Pad,
  type PadKind,
} from '../../domains/remote';
import { cn } from '../../lib/cn';
import { isBorahaePad, padBackground, SIGNATURE_GLOW } from '../look';

const KINDS: { kind: PadKind; label: string; hint: string }[] = [
  {
    kind: 'color',
    label: 'Color',
    hint: 'Solid color while your finger is on the pad.',
  },
  {
    kind: 'strobe',
    label: 'Strobe',
    hint: 'Alternates the colors to the BPM while you hold.',
  },
  {
    kind: 'fade',
    label: 'Fade',
    hint: 'Goes from the start color to the end color over the time you hold.',
  },
  {
    kind: 'blackout',
    label: 'Blackout',
    hint: 'Turns the light off while your finger is on the pad.',
  },
];

const SLOT_LABELS: Record<PadKind, string[]> = {
  color: ['Color'],
  strobe: ['Color A', 'Color B'],
  fade: ['Start color', 'End color'],
  blackout: [],
};

const RING = '0 0 0 2px #1c1b1b, 0 0 0 4px #e1b6ff';
const IDLE_RING = 'inset 0 0 0 1px rgba(255,255,255,0.2)';

const swatchShadow = (hex: string, selected: boolean) =>
  [selected ? RING : IDLE_RING, isBorahae(hex) ? SIGNATURE_GLOW : '']
    .filter(Boolean)
    .join(', ');

const BorahaeHeart = ({ className }: { className: string }) => (
  <Heart
    className={cn('text-white/92', className)}
    fill="currentColor"
    strokeWidth={0}
  />
);

interface PadEditorModalProps {
  pad: Pad;
  isNew: boolean;
  onSave: (pad: Pad) => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function PadEditorModal({
  pad,
  isNew,
  onSave,
  onRemove,
  onClose,
}: PadEditorModalProps) {
  const [kind, setKind] = useState(pad.kind);
  const [colors, setColors] = useState([
    pad.colors[0] ?? PAD_SWATCHES[0],
    pad.colors[1] ?? '#ffffff',
  ]);
  const [bpm, setBpm] = useState(pad.bpm ?? 180);
  const [slot, setSlot] = useState(0);
  const [custom, setCustom] = useState(false);

  const slotLabels = SLOT_LABELS[kind];
  const draft: Pad = {
    id: pad.id,
    kind,
    colors: colors.slice(0, slotLabels.length),
    ...(kind === 'strobe' && { bpm }),
  };
  const current = colors[slot];
  const setColor = (hex: string) =>
    setColors(colors.map((c, i) => (i === slot ? hex.toLowerCase() : c)));
  const isCustom = !PAD_SWATCHES.includes(current.toLowerCase());

  return (
    <div className="absolute inset-0 z-30 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pad-title"
        className="absolute inset-x-6 inset-y-3 flex gap-[18px] rounded-3xl border border-white/12 bg-[#1c1b1b] px-[18px] py-4 text-[#e5e2e1] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex w-[210px] shrink-0 flex-col gap-2.5">
          <h2
            id="pad-title"
            className="text-[17px] font-bold tracking-[-0.02em]"
          >
            {isNew ? 'New pad' : 'Edit pad'}
          </h2>
          <div
            aria-label="Pad preview"
            className={cn(
              'flex flex-1 items-center justify-center rounded-[18px] border',
              kind === 'blackout'
                ? 'border-dashed border-[#4b444e]'
                : 'border-white/12',
            )}
            style={{
              background: padBackground(draft),
              boxShadow: isBorahaePad(draft) ? SIGNATURE_GLOW : 'none',
            }}
          >
            {isBorahaePad(draft) && <BorahaeHeart className="size-11" />}
            {kind === 'blackout' && (
              <EyeOff className="size-10 text-[#cec3d0]" strokeWidth={1.6} />
            )}
          </div>
          <span className="text-[11px] leading-[1.4] text-[#978e99]">
            {KINDS.find((k) => k.kind === kind)?.hint}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div
              role="group"
              aria-label="Effect type"
              className="grid flex-1 grid-cols-4 gap-0.5 rounded-[10px] bg-[#131313] p-[3px]"
            >
              {KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  aria-pressed={kind === k.kind}
                  onClick={() => {
                    setKind(k.kind);
                    setSlot(0);
                  }}
                  className={cn(
                    'h-9 rounded-lg text-xs font-semibold text-[#cec3d0]',
                    kind === k.kind && 'bg-[#2a2a2a] text-[#e1b6ff]',
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-[9px] text-[#cec3d0]"
            >
              <X className="size-[18px]" />
            </button>
          </div>

          {slotLabels.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {slotLabels.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`${label} ${isBorahae(colors[i]) ? 'Borahae' : colors[i]}`}
                    aria-pressed={slot === i}
                    onClick={() => setSlot(i)}
                    className="flex size-12 items-center justify-center rounded-xl"
                    style={{
                      background: displayColor(colors[i]),
                      boxShadow: swatchShadow(colors[i], slot === i),
                    }}
                  >
                    {isBorahae(colors[i]) && (
                      <BorahaeHeart className="size-5" />
                    )}
                  </button>
                ))}
                <span className="text-[11px] text-[#978e99]">
                  {slotLabels.length > 1
                    ? 'Pick which color to change'
                    : 'Tap a color below'}
                </span>
              </div>

              {custom ? (
                <div className="flex gap-3">
                  <HexColorPicker
                    color={current}
                    onChange={setColor}
                    style={{ width: 240, height: 128 }}
                  />
                  <div className="flex flex-col gap-2">
                    <HexColorInput
                      color={current}
                      onChange={(hex) => hex.length === 7 && setColor(hex)}
                      prefixed
                      aria-label="Hex color"
                      className="h-10 w-28 rounded-[9px] border border-white/12 bg-[#131313] px-2.5 font-mono text-sm uppercase outline-none select-text"
                    />
                    <button
                      type="button"
                      onClick={() => setCustom(false)}
                      className="h-10 rounded-[9px] border border-white/12 bg-[#2a2a2a] text-[13px] font-medium"
                    >
                      Swatches
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-10 gap-2">
                  {PAD_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={isBorahae(hex) ? `Borahae ${hex}` : hex}
                      aria-pressed={current.toLowerCase() === hex}
                      onClick={() => setColor(hex)}
                      className="flex h-10 items-center justify-center rounded-[10px]"
                      style={{
                        background: displayColor(hex),
                        boxShadow: swatchShadow(
                          hex,
                          current.toLowerCase() === hex,
                        ),
                      }}
                    >
                      {isBorahae(hex) && <BorahaeHeart className="size-4" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Custom color"
                    aria-pressed={isCustom}
                    onClick={() => setCustom(true)}
                    className="flex h-10 items-center justify-center rounded-[10px] text-white"
                    style={{
                      background: isCustom
                        ? current
                        : 'conic-gradient(#ff4d5e, #ffc44d, #3ddc84, #4dd8ff, #4d7bff, #ff6bd6, #ff4d5e)',
                      boxShadow: isCustom ? RING : IDLE_RING,
                    }}
                  >
                    <Pipette className="size-4 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                  </button>
                </div>
              )}
            </div>
          )}

          {kind === 'strobe' && !custom && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#cec3d0]">
                Speed
              </span>
              <button
                type="button"
                aria-label="Decrease BPM"
                onClick={() => setBpm(Math.max(30, bpm - 10))}
                className="h-10 w-11 rounded-[9px] border border-white/12 bg-[#2a2a2a] text-lg"
              >
                −
              </button>
              <span className="min-w-[84px] text-center text-lg font-bold tabular-nums">
                {bpm}{' '}
                <span className="text-[11px] font-medium text-[#978e99]">
                  BPM
                </span>
              </span>
              <button
                type="button"
                aria-label="Increase BPM"
                onClick={() => setBpm(Math.min(600, bpm + 10))}
                className="h-10 w-11 rounded-[9px] border border-white/12 bg-[#2a2a2a] text-lg"
              >
                +
              </button>
            </div>
          )}

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={onRemove}
                className="h-10 rounded-[9px] bg-[#ffb4ab]/10 px-3.5 text-[13px] font-semibold text-[#ffb4ab]"
              >
                Remove
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-[9px] border border-white/12 bg-[#2a2a2a] px-4 text-[13px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="h-10 rounded-[9px] bg-[#e1b6ff] px-5 text-[13px] font-bold text-[#43205d]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
