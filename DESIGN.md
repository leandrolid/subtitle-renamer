# Subtitle Renamer Design System

## 1. Atmosphere & Identity

Subtitle Renamer is a quiet desktop file utility for a safe three-step copy flow: choose a folder, review planned subtitle copies, then confirm and read results. The visual tone is calm, technical, and explicit; it favors ledger clarity over decoration.

The product name is always `Subtitle Renamer`. Screenshot references use `SubMatch`, but that name is reference-only and must not replace the app identity, document title, window title, or accessible labels. Files under `layout/` are read-only reference screenshots; they guide layout adaptation and are not generated proof or renderer output.

The renderer keeps the existing safety posture: vanilla HTML/CSS/JavaScript, CSP-safe local assets, native buttons, and plaintext DOM construction for every filename, directory label, backend code, and result row. Dynamic file data belongs in `textContent` or `<bdi>` containers, never in markup strings.

Reference deviations are intentional when screenshots contradict the engine or window contract:

- The folder surface visually resembles a drop zone, but it is a button-driven native picker and must not promise folder dropping.
- The scan is direct-file only and lists supported videos `mkv`, `mp4`, `avi`, `mov`, `m4v`, `webm` plus subtitles `ass`, `ssa`, `srt`, `vtt`.
- No recent-folder memory, file sizes, score values, manual rematching, overwrite prompts, output-language suffixes, nested-folder claims, or fourth workflow step may appear.
- The default viewport is `900x720`; the minimum supported viewport is `720x520`, so the wide screenshots are adapted rather than copied literally.

## 2. Color

Every color role has complete Light and Dark values. CSS must expose these roles as variables and consume variables only; SVG icon literals may mirror the same values because image-loaded SVG cannot read page CSS variables.

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Canvas | `--color-canvas` | `#f7f6f2` | `#0c0f14` | App background |
| App bar | `--color-app-bar` | `#ffffff` | `#121722` | Top bar and fixed chrome |
| Surface | `--color-surface` | `#ffffff` | `#161b26` | Panels, cards, menus |
| Surface raised | `--color-surface-raised` | `#fbfaf7` | `#1d2430` | Selection surface, table rows, active menu item |
| Surface muted | `--color-surface-muted` | `#f0eee8` | `#242b36` | Disabled controls and quiet insets |
| Text primary | `--color-text` | `#25231f` | `#f4f7fb` | Headings and primary labels |
| Text secondary | `--color-muted` | `#69645c` | `#a8b0bd` | Descriptions, helper text, counters |
| Text inverse | `--color-on-action` | `#ffffff` | `#ffffff` | Text on primary action blue |
| Border default | `--color-border` | `#d8d3c8` | `#303846` | Panel, menu, table, and card borders |
| Border strong | `--color-border-strong` | `#aaa397` | `#465061` | Active step, selected frame, focus fallback |
| Action blue | `--color-action` | `#1f66d1` | `#4c8dff` | Primary buttons, active progress stepper, focus outline |
| Action hover | `--color-action-hover` | `#174fa8` | `#6aa2ff` | Primary button hover and active menu highlight |
| Success | `--color-success` | `#2f6842` | `#60c083` | Completed copy status and matched rows |
| Warning | `--color-warning` | `#805b15` | `#d9a441` | Skipped files and caution status pills |
| Error | `--color-error` | `#8b2f24` | `#ff7b72` | Failed copy status and alert text |
| Neutral status | `--color-neutral-status` | `#6f6a61` | `#8f98a6` | Pending, unavailable, and future step states |

Light keeps the existing warm utility palette while switching action/status emphasis to blue. Dark closely follows the references: near-black canvas, charcoal chrome, subtle gray borders, bright blue actions, green success, amber warnings, and gray future states. Use borders-only depth; no gradients, shadows, translucent glass, or external image textures.

## 3. Typography

| Level | Token | Value | Usage |
| --- | --- | --- | --- |
| Font/UI | `--font-ui` | `ui-sans-serif, "Aptos", "Segoe UI", sans-serif` | All interface text |
| Font/mono | `--font-mono` | `ui-monospace, "Cascadia Mono", "SFMono-Regular", monospace` | File names, directory labels, IDs, backend codes |
| H1 | `--type-h1` | `650 1.5rem / 1.2 var(--font-ui)`, tracking `-0.02em` | Single app heading |
| H2 | `--type-h2` | `650 1.125rem / 1.35 var(--font-ui)` | Step titles and panel titles |
| H3 | `--type-h3` | `650 1rem / 1.35 var(--font-ui)` | Card and group titles |
| Body | `--type-body` | `400 0.9375rem / 1.55 var(--font-ui)` | Default copy |
| Small | `--type-small` | `400 0.8125rem / 1.45 var(--font-ui)` | Helper text, filenames, menu metadata |
| Label | `--type-label` | `700 0.75rem / 1.35 var(--font-ui)`, tracking `0.08em` | Uppercase labels, column headers, status pills |

Body text never drops below Small. Filenames and directory labels use `--font-mono`, wrap anywhere, preserve bidirectional plaintext behavior, and are never localized. Text contrast must remain readable in both Light and Dark themes.

## 4. Spacing & Layout

All spacing derives from the 4px base token. CSS may combine tokens with `calc()` when a repeated layout needs it, but no arbitrary pixel values are allowed outside this scale.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight inline gaps, outline offsets |
| `--space-2` | `8px` | Compact gaps, status pill padding |
| `--space-3` | `12px` | Control padding, row gaps |
| `--space-4` | `16px` | Card padding and section gaps |
| `--space-5` | `20px` | Shell padding at compact sizes |
| `--space-6` | `24px` | Major vertical rhythm |
| `--space-8` | `32px` | Desktop gutters, large empty-state spacing |
| `--space-10` | `40px` | Touch-friendly button and step target height |
| `--space-12` | `48px` | App bar and large icon frame |
| `--radius-1` | `4px` | Small pills and menu items |
| `--radius-2` | `8px` | Buttons, inputs, table rows |
| `--radius-3` | `12px` | Cards, selection surface, menus |
| `--shell-min` | `720px` | Tauri minimum window width contract |
| `--shell-default` | `900px` | Tauri default window width contract |
| `--shell-max` | `1120px` | Maximum desktop shell width |
| `--content-readable` | `672px` | Centered step 1 and step 3 content width |
| `--content-review` | `896px` | Wider step 2 mapping review width |

At `900x720`, show the app bar, progress stepper, current step content, status, and reachable action row without horizontal scrolling. At `720x520`, stack dense controls, allow vertical scrolling, keep action rows reachable, and convert the mapping table to readable cards or a single-column grid without hiding data.

The shell is centered in the window. Step 1 and step 3 use a centered composition with generous margins; step 2 uses the wider review surface for the mapping and skipped-file ledger. The top bar remains compact and stable across themes.

## 5. Components

Top app bar: compact local chrome containing the app icon, `Subtitle Renamer` identity, current helper copy, and a top-right Settings menu trigger. The bar uses surface/app-bar tokens, one bottom border, and no shadow.

Progress stepper: a non-clickable three-step progress stepper with connector lines. Current step uses `--color-action`; completed steps use the same action role plus text or an SVG check; future steps use neutral status and border roles. Each step exposes localized title and subtitle text.

Folder selection surface: a large bordered native button for choose-and-scan. It may visually borrow the dashed-box structure from the references but must state direct-file scanning, native picker behavior, and the supported extensions. It does not advertise folder dropping or retained history.

Mapping review: step 2 presents planned copies and skipped files from current DTO truth only. Desktop uses a semantic mapping table with source label, target label, and status/reason; compact width may use row cards. Skips have source plus localized reason, never target placeholders or score text.

Status pills: small bordered labels using success, warning, error, or neutral tokens. They summarize actual states such as ready, skipped, completed, failed, or pending. They do not introduce unsupported review states.

Confirmation and results: step 3 lists executable target labels and copy safety assurances before execution. After copy, the same step renders results groups for completed, failed, and pending rows. The confirmation copy says contents are copied, sources stay untouched, and existing targets are not overwritten by the engine.

Action rows: native buttons only. Primary actions use action blue; secondary and tertiary actions use surface and border tokens. Disabled actions use muted tokens. Back never silently discards a plan; destructive reset language must be explicit.

Settings menu: a top-right Settings menu with nested Theme and Language menus. Theme options are System, Light, and Dark. Language options are English and Português (Brasil). Menu items use `role="menuitem"` or `role="menuitemradio"`, maintain `aria-checked`, and support keyboard and pointer operation without hover-only paths.

Focus treatment: all native buttons, menu items, and table/card interactive elements use a visible blue focus outline derived from `--color-action` and `--focus-ring`. Focus must meet contrast in Light and Dark themes.

## 6. Motion & Interaction

| Token | Value | Usage |
| --- | --- | --- |
| `--motion-fast` | `120ms ease-out` | Button color, opacity, and transform feedback |
| `--motion-standard` | `180ms ease-in-out` | Menu, surface, and step state transitions |
| `--focus-ring` | `0 0 0 3px color-mix(in srgb, var(--color-action) 28%, transparent)` | Visible keyboard focus |

Only `transform`, `opacity`, and color/border-color transitions may animate. Reduced motion removes transforms and transitions while preserving state changes. Hover and active feedback are allowed only when they do not change layout.

Settings interaction follows desktop menu expectations: open from the trigger, cycle with arrow keys, Home/End jump, Enter/Space activate, Right opens a submenu, Left closes it, Escape closes the deepest open menu then the root, and outside pointer closes with sensible focus restoration.

Locale and theme changes rerender visible static and dynamic chrome without losing the current plan. System theme follows the OS only while Theme is System; explicit Light or Dark selections take precedence and persist through guarded local storage with in-memory fallback.

## 7. Depth & Surface

Depth strategy is borders-only. Hierarchy comes from surface roles, border strength, typography, spacing, and restrained status color. Do not add `box-shadow`, gradient fills, translucent glass, remote fonts, remote icons, or external assets.

Component surface rules:

- App bar: `--color-app-bar` plus a single `--color-border` divider.
- Main panels and Settings menu: `--color-surface` with `--color-border`.
- Active selection, active menu item, and table rows: `--color-surface-raised` with `--color-border-strong` when selected.
- Disabled or quiet insets: `--color-surface-muted` and muted text.
- Results groups: same panel/list system as mapping review, with status color used only for labels, borders, and text accents.

The final UI must look consistent when compared across Light and Dark themes: same structure, same 4px rhythm, same component rules, and the dark version closest to the screenshots without copying their unsupported product name or unavailable data.
