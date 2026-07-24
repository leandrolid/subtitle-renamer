# Subtitle Renamer Design System

## 1. Atmosphere & Identity

Subtitle Renamer feels like a quiet file utility: precise, calm, and resistant to surprises. The signature is ledger clarity: selected folders, planned copies, skipped files, confirmation, and outcomes are separated like a plain operations sheet rather than a dashboard.

## 2. Color

| Role | Token | Light | Usage |
| --- | --- | --- | --- |
| Surface/canvas | `--color-canvas` | `#f7f6f2` | App background |
| Surface/base | `--color-surface` | `#ffffff` | Main window and cards |
| Surface/muted | `--color-surface-muted` | `#f0eee8` | Inset regions and disabled controls |
| Text/primary | `--color-text` | `#25231f` | Body text and headings |
| Text/muted | `--color-muted` | `#69645c` | Descriptions, counters, secondary labels |
| Border/default | `--color-border` | `#d8d3c8` | Panel and control borders |
| Border/strong | `--color-border-strong` | `#aaa397` | Dividers and selected-folder frame |
| Accent/action | `--color-action` | `#2f4d3a` | Primary actions and focus outline |
| Accent/action-hover | `--color-action-hover` | `#243c2d` | Primary action hover |
| Status/warning | `--color-warning` | `#805b15` | Skipped or cautious copy state |
| Status/error | `--color-error` | `#8b2f24` | Failed copy state |
| Status/success | `--color-success` | `#2f6842` | Completed copy state |

Colors are light-only. Every CSS color must use these variables except the SVG icon, whose fills use the same token values literally because SVG cannot read page CSS variables when loaded as an image.

## 3. Typography

| Level | Token | Value | Usage |
| --- | --- | --- | --- |
| Font/UI | `--font-ui` | `ui-sans-serif, "Aptos", "Segoe UI", sans-serif` | All interface text |
| Font/mono | `--font-mono` | `ui-monospace, "Cascadia Mono", "SFMono-Regular", monospace` | File paths, IDs, and metadata |
| H1 | `--type-h1` | `1.5rem / 1.2`, weight `650`, tracking `-0.02em` | Single app heading |
| H2 | `--type-h2` | `1rem / 1.35`, weight `650` | Region titles |
| Body | `--type-body` | `0.9375rem / 1.55`, weight `400` | Default copy |
| Small | `--type-small` | `0.8125rem / 1.45`, weight `400` | Helper text and filenames |
| Label | `--type-label` | `0.75rem / 1.35`, weight `700`, tracking `0.08em` | Uppercase labels |

Body text never drops below the Small token. Filenames use `--font-mono` inside wrapping plaintext/bidi-safe containers.

## 4. Spacing & Layout

All spacing derives from `--space-1: 4px`.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight inline gaps |
| `--space-2` | `8px` | Compact stacks |
| `--space-3` | `12px` | Control padding |
| `--space-4` | `16px` | Card padding and row gaps |
| `--space-5` | `20px` | Window padding |
| `--space-6` | `24px` | Section gaps |
| `--space-8` | `32px` | Major shell gutters |
| `--shell-min` | `320px` | Minimum supported content width |
| `--shell-max` | `1120px` | Maximum desktop shell width |

The shell uses a single-column flow at narrow widths and a two-column work area once space permits. No spacing value may bypass the token scale.

## 5. Components

Selected folder area: a bordered surface with a label, wrapped plaintext path, and a native secondary button. Spacing uses `--space-3` and `--space-4`; the path uses `--font-mono`, `unicode-bidi: plaintext`, and wraps anywhere.

Work groups: planned copies, skipped files, and outcome groups share the same section pattern: title row, muted explanation, and bordered list. Dynamic groups start with `hidden` until later behavior populates them.

Action bar: a footer region containing native buttons only. Primary uses the action color token; secondary uses surface tokens; disabled states use muted tokens and remain focusable only when enabled.

Inline confirmation: a hidden group near the action bar with plain text and native confirm/cancel buttons. Later behavior can reveal it without introducing dialogs.

## 6. Motion & Interaction

| Token | Value | Usage |
| --- | --- | --- |
| `--motion-fast` | `120ms ease-out` | Button color and transform changes |
| `--motion-standard` | `180ms ease-in-out` | Surface state changes |
| `--focus-ring` | `0 0 0 3px color-mix(in srgb, var(--color-action) 24%, transparent)` | Visible keyboard focus |

Only `transform` and `opacity` may animate. `prefers-reduced-motion: reduce` disables transitions and transform feedback.

## 7. Depth & Surface

Depth strategy is borders-only. The shell uses no box shadows, gradients, or translucent effects; hierarchy comes from tokenized surface color, borders, dividers, and spacing.
