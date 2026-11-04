---
name: ArmySync
description: Lightstick animation editor for BTS Army Bombs
colors:
  primary: "#e1b6ff"
  primary-dim: "#c49be0"
  on-primary: "#43205d"
  surface-dim: "#0e0e0e"
  surface: "#131313"
  surface-low: "#1c1b1b"
  surface-container: "#201f1f"
  surface-high: "#2a2a2a"
  surface-highest: "#353534"
  on-surface: "#e5e2e1"
  on-surface-variant: "#cec3d0"
  outline: "#978e99"
  outline-variant: "#4b444e"
  border: "rgba(255, 255, 255, 0.07)"
  border-strong: "rgba(255, 255, 255, 0.12)"
  error: "#ffb4ab"
  on-error: "#690005"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dim}"
  button-secondary:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-highest}"
  button-ghost:
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.on-surface}"
  icon-button:
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.sm}"
    size: "28px"
  input:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  field-control:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "28px"
    padding: "0 8px"
  palette-item:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "10px"
  palette-item-hover:
    backgroundColor: "{colors.surface-high}"
  dialog:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
---

# Design System: ArmySync

## Overview

**Creative North Star: "The Darkened Arena"**

ArmySync looks like a stadium a minute before the show: the house lights are down, the structure is barely visible, and the only color in the room comes from light itself. The chrome of the app recedes into near-black, neutral layers so the three things that actually glow — the video, the simulated Army Bomb, and the effect blocks on the timeline — own every bit of saturation on screen. The interface is the venue, never the performance.

This is an Operate surface for a precise, keyboard-heavy editing job, so density is moderate-to-high and familiarity wins over expression. Brand lives in small, exact details: the Borahae Glow accent on the one thing that matters in each region, hairline borders that separate panels without boxing them, and a single soft glow reserved for the lightstick and logo, where light is the literal subject.

Depth comes from tonal stepping and 1px hairlines, not from shadows. Shadows appear only on things that float above the arena: dialogs, popovers, and an effect being dragged.

**Key Characteristics:**
- Near-black tonal stack (six neutral steps) with panels separated by 7%-white hairlines.
- One accent, Borahae Glow, used for current state, primary action, and selection only.
- Content (video, effect colors, waveform) is the only saturated material on screen.
- Inter for all UI; Manrope only for the app title and dialog titles.
- Every interactive element has a visible keyboard focus ring in the accent.

## Colors

A cool, near-black neutral stack lit by a single lavender accent; all other color belongs to the user's content.

### Primary
- **Borahae Glow** (`primary`): the fandom's purple, made into the interface's only voice. Used for the primary button, slider fill, playhead needle, selected effect ring, focus ring, active/connected states, the unsaved-changes dot, and icons inside palette items.
- **Dimmed Glow** (`primary-dim`): hover state of the primary button.
- **Deep Plum Ink** (`on-primary`): text and icons sitting on Borahae Glow.

### Neutral
- **Arena Floor** (`surface-dim`): the darkest step. Editor backdrop and the timeline effect track, where colored blocks need maximum contrast.
- **House Dark** (`surface`): page background on Home and the center video column.
- **Panel Shade** (`surface-low`): side panels, timeline panel, input wells inside dialogs, recent-projects list.
- **Raised Shade** (`surface-container`): dialogs, popovers, palette items, field controls, cards inside panels.
- **Control Gray** (`surface-high`): secondary buttons, icon tiles, hover fills.
- **Pressed Gray** (`surface-highest`): selected segment, slider track, secondary-button hover.
- **Bone White** (`on-surface`): primary text; also the play button fill and slider thumbs.
- **Lilac Mist** (`on-surface-variant`): secondary text, labels, inactive icons.
- **Dusk Gray** (`outline`): tertiary text — hints, timestamps, ruler labels, paths.
- **Shadow Lilac** (`outline-variant`): hover border on field controls, dashed "add" affordances.
- **Hairline** (`border`) / **Hairline Strong** (`border-strong`): white at 7% / 12%. Panel dividers, list dividers, card edges / input strokes, dialog edges, ruler ticks.

### Semantic
- **Soft Coral** (`error`) on **Deep Maroon** (`on-error`): destructive actions and error messages, always as a tint (`error` at 8–20% fill with `error` text), never a saturated red block.

### Named Rules
**The House Lights Rule.** The interface itself never carries saturated color outside Borahae Glow and Soft Coral. Saturation on screen belongs to the video, the lightstick, and effect blocks — if chrome competes with them, it's wrong.

**The One Glow Rule.** Borahae Glow marks what is current, selected, primary, or focused. It is never used for decoration, section labels, or inactive states.

## Typography

**Display Font:** Manrope (with ui-sans-serif, system-ui)
**Body Font:** Inter (with ui-sans-serif, system-ui), with `cv11` and `ss01` enabled

**Character:** Inter does all the work of a dense tool; Manrope appears only where the product names itself — the app title and dialog titles — giving those moments a rounder, friendlier voice.

### Hierarchy
- **Display** (Manrope 700, 1.875rem, tight tracking): the "ArmySync" wordmark on Home.
- **Headline** (Manrope 700, 1rem–1.125rem, tight tracking): dialog titles ("New Project", "BLE Devices").
- **Title** (Inter 600, 0.875rem): project name and time readout in the timeline header.
- **Body** (Inter 500, 0.8125rem): item names — palette items, effect name in Properties, device names, recent projects (0.875rem there).
- **Label** (Inter 600, 0.75rem): section headings inside panels ("Effects", "Properties", "Preview", "Bluetooth sync") and field labels (Inter 500 for field labels).
- **Caption** (Inter 400, 0.6875rem): descriptions, hints, frame counter, ruler labels (0.625rem).

### Named Rules
**The Sentence Case Rule.** Panel and section headings are sentence case, semibold, at label size. No uppercase, wide-tracked eyebrows, and no Manrope in labels, buttons, or data.

**The Tabular Time Rule.** Every number that changes while you watch — timecodes, frames, BPM, milliseconds, start/end/duration — uses `tabular-nums` so it never jitters. Monospace is reserved for hex color codes.

## Layout

The editor is a fixed, full-window desktop layout with resizable panels (re-resizable): an Effects sidebar on the left (280–420px, default 360px), the video column in the center, a Preview/Bluetooth panel on the right (240–300px, default 300px), and the timeline across the bottom (200–420px tall, default 340px). The video column holds the video (16px inset, `object-contain`) above a 56px transport bar.

The timeline stacks a 44px header (project name · time · zoom), a time ruler, a 64px effect track, and a waveform lane that grows to fill the remaining height.

Home is a single centered column (max 576px) with generous top spacing (96px) and the brand block, primary actions, then recent projects.

Spacing runs on a 4px base: 4 / 8 / 12 / 16 / 24px. Panels use 16px padding; groups inside a panel use 12px gaps; dialog bodies use 24px padding and 20px between fields. Desktop only; the layout does not reflow for narrow viewports.

## Elevation & Depth

Depth is tonal: each step up the neutral stack reads as "closer", and 1px hairlines at 7–12% white separate regions. Panels are flat. A faint top highlight plus a tiny drop (`shadow-raised`) gives controls and cards a touch of tactility at rest. Real shadows are reserved for things that float over the arena.

### Shadow Vocabulary
- **Raised** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.3)`): secondary buttons, palette items, cards, the selected segment. Barely visible; a tactile edge, not a lift.
- **Popover** (`box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 12px 32px -8px rgba(0,0,0,0.6)`): dialogs, color picker, the drag overlay.
- **Primary Button** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.4)`): the lit top edge of the primary action.

### Named Rules
**The Tonal-First Rule.** Separate with tone and hairlines first. A shadow is allowed only when something genuinely floats above other content (dialog, popover, dragged item).

**The Only Glow Rule.** Colored glow (`drop-shadow`/`box-shadow` in Borahae Glow or an effect color) is reserved for light sources: the lightstick preview and the app icon. Never on buttons, cards, or text.

## Shapes

Gently rounded and consistent: 4px for tiny swatches, 6px for compact controls (icon buttons, field controls, color swatches, effect blocks), 8px for standard controls and cards (buttons, inputs, palette items, the effect track), 12px for containers (dialogs, recent-projects list, empty states, color picker). Fully round only for the play button, switch, and status dots. Borders are always 1px; dashed borders mean "empty, add something here" (empty states, add-color, drop ghost).

## Components

### Buttons
Quietly tactile: a lit top edge and a 1px press-down on click.
- **Shape:** gently rounded (8px); heights 28 / 36 / 40px for sm / md / lg.
- **Primary:** Borahae Glow fill, Deep Plum Ink semibold text, lit top-edge shadow. One per view.
- **Secondary (default):** Control Gray fill, Hairline Strong stroke, Raised shadow; hover steps to Pressed Gray.
- **Ghost:** no fill, Lilac Mist text; hover adds Control Gray fill and Bone White text. Used for Cancel.
- **Tonal:** Borahae Glow at 10% with Glow text (Connect). **Danger:** Soft Coral at 10% with Coral text (Disconnect).
- **States:** 150ms color/shadow transitions, `translateY(1px)` on active, 40% opacity when disabled, 2px Borahae focus ring with 2px offset.
- Keyboard shortcuts appear inside the button as a dimmed suffix (`⌘N`) when the action has one.

### Icon Buttons
- 28px (sm) or 36px (md) square, 6px radius, Lilac Mist icon; hover adds Control Gray fill. Always carry an accessible label that doubles as a tooltip, including the shortcut ("Undo (⌘Z)").
- **Play/Pause** is the exception: a Bone White circle with a dark icon — the one solid control in the transport.

### Inputs / Fields
- **Dialog inputs:** 36px tall, Panel Shade well, Hairline Strong stroke, 8px radius. Focus: stroke shifts to Borahae Glow at 70% plus a 3px Glow halo at 15%.
- **Property field controls** (select, number, color button): 28px tall, Raised Shade fill, 6px radius, Hairline Strong stroke; hover strengthens the stroke to Shadow Lilac; same focus halo.
- **Sliders:** 4px Pressed Gray track with Borahae Glow fill, 12px Bone White thumb; hover adds a 4px Glow halo, active scales the thumb to 1.15.
- **Switch:** 36×20px pill, Pressed Gray off / Borahae Glow on, white 16px knob; `role="switch"`.
- **Segmented control:** Panel Shade track with 4px inset; the active segment lifts to Pressed Gray with Raised shadow.
- **Error:** Soft Coral tinted box with an alert icon, `role="alert"`.

### Cards / Containers
- **Palette items:** Raised Shade, Hairline border, Raised shadow, 8px radius, 10px padding; icon in a 32px Glow-tinted tile; a grip icon fades in on hover to signal dragging.
- **Lists** (recent projects, devices): one container with 1px Hairline dividers, rows highlight on hover; no per-row cards.
- **Dialogs:** Raised Shade, Hairline Strong edge, 12px radius, Popover shadow; header, scrollable body, and a footer bar on Panel Shade separated by a hairline. Backdrop is black at 55% with a 2px blur.
- **Empty states:** dashed Hairline Strong container, 44px icon tile, one line of title and one teaching sentence.

### Timeline (signature component)
- **Header:** project name with a Borahae dot when there are unsaved changes, centered `current / total` time (total in Dusk Gray), zoom slider flanked by zoom icons.
- **Effect track:** Arena Floor well, 8px radius, inset Hairline. Effect blocks render their own colors with a 12%-white inner edge; labels are white at 90% with a dark text-shadow and ellipsize when narrow. Selection is a 2px Borahae ring offset by 2px.
- **Playhead:** 2px Borahae needle with a rounded tab at the top.
- **Waveform:** centered, mirrored bars in Borahae Glow at 20–65% opacity scaled by amplitude, filling the remaining lane.

### Lightstick Preview (signature component)
The simulated Army Bomb sits alone on Panel Shade, centered, with its glow as the only colored light in the panel. Header shows "Preview" and a live frame counter; Bluetooth controls sit below a hairline.

## Do's and Don'ts

### Do:
- **Do** keep chrome neutral and let video, lightstick, and effect colors carry all saturation (The House Lights Rule).
- **Do** separate regions with 1px hairlines (`border` / `border-strong`) and tonal steps before reaching for a shadow.
- **Do** use the shared `Button` and `IconButton` components; give every icon button a label, and include its shortcut when one exists.
- **Do** use sentence-case semibold labels at 12px for panel headings.
- **Do** use `tabular-nums` for every changing number.
- **Do** keep text at 11px or larger (10px only for ruler ticks and effect-block labels).

### Don't:
- **Don't** use uppercase, wide-tracked eyebrow labels above headings or sections.
- **Don't** use Manrope for labels, buttons, or data.
- **Don't** use Borahae Glow for decoration or inactive states.
- **Don't** put colored glows on UI controls; glow belongs to light sources only.
- **Don't** overlay text on the video; titles and time live in the timeline header.
- **Don't** use solid saturated red for destructive actions; use the Soft Coral tint.
- **Don't** use monospace for anything except hex color codes.
