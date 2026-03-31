# ArmySync

Desktop app to sync BTS Army Bomb lightstick effects with video playback.

## Features

- **Editor** — Timeline-based effect editor to create lightstick color animations synced to video
- **Player** — Watch videos with real-time lightstick effect preview
- **Lightstick Preview** — Simulated Army Bomb that reflects effects in real-time

## Tech Stack

- [Tauri](https://tauri.app) — Desktop runtime
- [React 19](https://react.dev) — UI framework
- [Tailwind CSS v4](https://tailwindcss.com) — Styling
- [Vite](https://vitejs.dev) — Bundler
- [TypeScript](https://www.typescriptlang.org) — Type safety

## Getting Started

```bash
pnpm install
pnpm tauri dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm tauri dev` | Start Tauri app in dev mode |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix + Prettier |
| `pnpm type-check` | TypeScript type checking |
| `pnpm check` | Run all checks |

## License

MIT
