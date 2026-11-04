# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, served equally:

- **ARMY watching at home**: fans who put on concerts and music videos at home and want their Army Bomb lightstick to react in sync, the way it does at a stadium show.
- **Light-show creators**: fans who program detailed lightstick choreographies effect by effect, then share them with other fans.

Often the same person moves between the two roles: building a show, then watching it.

## Product Purpose

ArmySync is a desktop editor that syncs BTS Army Bomb lightstick effects with video playback. Success means two things working together: an editor precise and fast enough to program effects frame by frame, in service of recreating the synced-lightstick concert feeling outside the stadium.

## Positioning

It pairs a timeline editor tied to the video with real-time control of physical Army Bombs over Bluetooth. The same project is both the authoring file and the playback experience, so what the creator previews is exactly what the lightstick does.

## Operating Context

- Desktop app (Tauri 2), **macOS first**; Windows and Linux are secondary.
- Folder-based projects: a manifest, the video file (local or downloaded from YouTube via yt-dlp), and an effects file. Recent projects list on the home screen; effects auto-save and save with `Cmd+S`.
- Editing happens against a video, its audio waveform, and a simulated lightstick preview; playback drives connected lightsticks live.
- Heavy keyboard use while editing (play/pause, seek, undo/redo, copy/paste, duplicate, delete, save).

## Capabilities and Constraints

- Effect types: Static Color, Color Fade, Strobe/Flash (BPM-based, with tap sync), Blackout. More types are on the roadmap.
- Timeline: drag-and-drop from the palette, move/resize with snapping, multi-select, undo/redo, copy/paste, duplicate.
- BLE control of real Army Bombs (V4, V3, SE, Multi) via btleplug, with per-device latency compensation (0–200 ms).
- UI is in **English by default**; internationalization is planned (roadmap) but not built.
- Roadmap items, not yet built: player-only view mode, release builds via GitHub Releases, multiple project windows, theming (light/dark, custom themes), more shortcuts, a browser extension for Netflix sync.
- Open decision: whether the product presents itself as an unofficial fan project and how it treats official BTS/HYBE branding has not been confirmed.

## Brand Commitments

- Name: **ArmySync**. Tagline in use: "Lightstick animation editor for BTS Army Bombs".
- App icon: `src-tauri/icons/icon.png`, `src/assets/icon.svg`. Lightstick illustration: `src/assets/bomb-stick.svg`.
- License: AGPL-3.0 (`LICENSE`).

## Evidence on Hand

- Editor screenshot: `docs/image.png`.
- README usage guide and keyboard shortcut table (`README.md`).
- No testimonials, user counts, download numbers, or press exist; future work must not invent them.

## Product Principles

1. **The video is the source of truth.** Every effect is anchored to time in the video; the editor never lets preview and playback drift apart.
2. **What you preview is what the lightstick does.** The simulated Army Bomb and the real devices must match.
3. **Precision without friction.** Frame-level control should feel fast: keyboard-first, direct manipulation on the timeline, no modal detours for routine edits.
4. **Serve both the builder and the watcher.** Authoring depth must not get in the way of simply opening a project and enjoying the show.
