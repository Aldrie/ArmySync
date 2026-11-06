import type { CSSProperties } from 'react';
import { useId } from 'react';

import BombStickSvg from '../../../assets/bomb-stick.svg?react';
import type { StickModel } from '../preview-models';

const NATIVE_WIDTH = 200;
const NATIVE_HEIGHT: Record<StickModel, number> = { se: 446, v4: 444 };
const OFF_COLOR = '#b4b4b8';

const C = 'var(--ls-c)';
const dark = (percent: number) =>
  `color-mix(in srgb, var(--ls-c), black ${percent}%)`;
const glow = (px: number) => `drop-shadow(0 0 ${px}px var(--ls-c))`;

const BTS_WINGS =
  'M0 0 L318 252 L318 1022 L0 1137 Z M398 252 L716 0 L716 1137 L398 1022 Z';

interface LightstickProps {
  model: StickModel;
  height: number;
  off?: boolean;
}

function Cap() {
  return (
    <div className="absolute top-[5%] right-[8%] z-1 h-[6%] w-[28%] rotate-[32deg] rounded-[4px] bg-[#09090b]">
      <span className="absolute inset-x-0 -top-[25%] mx-auto h-[28%] w-[28%] rounded-t-[4px] bg-[#7f1d1d]" />
    </div>
  );
}

function SeStick({ off }: { off: boolean }) {
  return (
    <>
      <div
        className="relative size-[200px] rounded-full p-3"
        style={{ background: dark(40) }}
      >
        <Cap />
        <div
          className="relative size-full overflow-hidden rounded-full"
          style={{
            background: C,
            boxShadow: off ? undefined : `0 0 40px ${C}, 0 0 40px ${C}`,
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 716 1600"
            className="absolute top-[52%] left-1/2 h-[36%] w-[16.11%] -translate-1/2 overflow-visible"
          >
            <path d={BTS_WINGS} style={{ fill: dark(12) }} />
            <text
              x="418"
              y="1540"
              textAnchor="middle"
              fontFamily="Arial Narrow, Helvetica Neue, Arial, sans-serif"
              fontWeight="700"
              fontSize="220"
              letterSpacing="120"
              style={{ fill: dark(12) }}
            >
              BTS
            </text>
          </svg>
        </div>
      </div>
      <BombStickSvg
        aria-hidden="true"
        width={80}
        height={256}
        className="relative z-2 -mt-[10px] block"
      />
    </>
  );
}

function V4Stick({ off }: { off: boolean }) {
  const id = useId();
  const inner = `${id}in`;
  const ring = `${id}ring`;
  const body = `${id}body`;

  return (
    <>
      <div
        className="relative size-[200px] rounded-full p-3"
        style={{
          background: dark(40),
          boxShadow: off
            ? undefined
            : '0 -12px 40px -6px color-mix(in srgb, var(--ls-c) 40%, transparent)',
        }}
      >
        <Cap />
        <div
          className="relative size-full overflow-hidden rounded-full"
          style={{ background: dark(72) }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full"
          >
            <path
              d="M50 73.8 L62.6 78.1 L62.6 80.6 L65.3 80.6 Q73.3 80.6 82.5 88 L82.5 92 L17.5 92 L17.5 88 Q26.7 80.6 34.7 80.6 L37.4 80.6 L37.4 78.1 Z"
              style={{ fill: C, filter: off ? undefined : glow(3) }}
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="-60 -99 836 1301"
            className="absolute top-[18.74%] left-1/2 h-[61.79%] w-[39.7%] -translate-x-1/2"
            style={{ filter: off ? undefined : glow(10) }}
          >
            <path
              d="M-60 -98.6 L331.96 212 L384.04 212 L776 -98.6 L776 1201.2 L391 1062 L325 1062 L-60 1201.2 Z"
              style={{ fill: dark(86) }}
            />
            <path d={BTS_WINGS} style={{ fill: C }} />
          </svg>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="block size-full"
          >
            <defs>
              <clipPath id={inner}>
                <circle cx="50" cy="50" r="44" />
              </clipPath>
              <mask id={ring}>
                <rect width="100" height="100" fill="#fff" />
                <circle cx="50" cy="50" r="44" fill="#000" />
              </mask>
            </defs>
            <path
              d="M-5 85 H6 A44 3.6 0 0 1 94 85 H105 V105 H-5 Z"
              mask={`url(#${ring})`}
              style={{ fill: dark(75) }}
            />
            <g clipPath={`url(#${inner})`}>
              <ellipse
                cx="50"
                cy="85"
                rx="38"
                ry="3.6"
                style={{ fill: C, filter: off ? undefined : glow(3) }}
              />
            </g>
            <path
              d="M-5 85 H12 A38 3.6 0 0 0 88 85 H105 V105 H-5 Z"
              style={{ fill: dark(75) }}
            />
            <path
              d="M27.5 87.90 A38 3.6 0 0 0 72.5 87.90 L65.5 94.5 H34.5 Z"
              fill="#000"
            />
          </svg>
        </div>
      </div>
      <svg
        aria-hidden="true"
        width={80}
        height={256}
        viewBox="0 0 100 320"
        className="relative z-2 -mt-[12px] block"
      >
        <defs>
          <clipPath id={body}>
            <path d="M16 20H84V313.515C84 315.106 83.3679 316.632 82.2426 317.757L81.7574 318.243C80.6321 319.368 79.106 320 77.5147 320H22.4853C20.894 320 19.3679 319.368 18.2426 318.243L17.7574 317.757C16.6321 316.632 16 315.106 16 313.515Z" />
          </clipPath>
        </defs>
        <rect
          x="16"
          y="20"
          width="68"
          height="300"
          fill="#0A0A0A"
          clipPath={`url(#${body})`}
        />
        <rect
          x="16"
          y="292"
          width="68"
          height="28"
          fill="#040404"
          clipPath={`url(#${body})`}
        />
        <rect x="16" y="292" width="68" height="0.8" fill="#1c1c1c" />
        <rect x="6" y="0" width="88" height="22" rx="3" fill="#090909" />
        <g
          transform="translate(50 72) scale(1.4) translate(-50 -292)"
          fill="none"
          strokeWidth="1.1"
          strokeLinejoin="round"
          style={{ stroke: C, filter: off ? undefined : glow(2) }}
        >
          <path d="M41 283.886L49.1818 277V307L41 303.932Z" />
          <path d="M59.1364 283.886L50.9545 277V307L59.1364 303.932Z" />
        </g>
      </svg>
    </>
  );
}

export default function Lightstick({
  model,
  height,
  off = false,
}: LightstickProps) {
  const scale = height / NATIVE_HEIGHT[model];
  const style = {
    width: NATIVE_WIDTH * scale,
    height,
    ...(off && { '--ls-c': OFF_COLOR }),
  } as CSSProperties;

  return (
    <div
      role="img"
      aria-label={`Army Bomb ${model.toUpperCase()}${off ? ', not connected' : ''}`}
      className="relative shrink-0"
      style={style}
    >
      <div
        className="absolute top-0 left-0 flex w-[200px] origin-top-left flex-col items-center"
        style={{ transform: `scale(${scale})` }}
      >
        {model === 'v4' ? <V4Stick off={off} /> : <SeStick off={off} />}
      </div>
    </div>
  );
}
