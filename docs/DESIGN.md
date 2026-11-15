# SoinLAB documentation extension

This interface extends the approved SoinLAB visual system into a reading-focused component reference. It does not redefine the marketing website or the Gutenberg component package.

## Foundations

- Desktop: 1500 px centered container at 1920 px. A 232 px catalog and 48 px gap; reference pages add a 184 px outline. Reading content is capped at 920 px; prose is limited to 68ch.
- Mobile: 24 px edges at 400 px, 16 px edges below 360 px. The catalog becomes a native dialog drawer below 1001 px. The same article and prop values remain present. Tables reflow into labelled rows below 761 px.
- Spacing follows 4 px increments. Rules and intrinsic glyph/icon geometry are exceptions.
- Controls: 12 px corners; larger surfaces: 16 px. Utility tabs and code labels use subordinate 8/4 px corners.
- Main actions: 48 px minimum; orange action: 56 px with 20 px bold white text. Icon controls: 44 px targets.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#FCFDFE` |
| Quiet surface | `#F2F5F7` |
| Text | `#1D252B` |
| Secondary text | `#5B6873` |
| Rule | `#E2E8EC` |
| Brand orange | `#F56800` |
| Accessible orange text | `#A84200` |
| Orange tint | `#FFF0E5` |
| Glass surface | `rgba(255,255,255,.72)` |
| Panel shadow | `0 16px 48px -20px rgba(34,54,68,.18)` |

The fixed-position effect is provided by a sticky 80 px header (72 px on mobile), with 40 px backdrop blur. Search and the mobile drawer use 40 px blur; the surrounding scrim uses 8 px. The section preview uses 28 px blur. Reading surfaces remain opaque. Browsers without backdrop-filter get solid fallbacks.

## Type

Barlow Condensed 600 supplies Latin headings. It does not contain Cyrillic: Roboto Condensed 600 is the explicit fallback for Russian headings, preserving the condensed proportions. Manrope 400/600/700 supplies body text, controls and navigation. Code uses the platform monospace stack. All webfonts are self-hosted with their licenses.

Desktop overview H1: 72/76; reference H1: 64/68; mobile H1: 48/52. H2: 32/40 desktop, 28/32 mobile. Body: 16/28. Dense labels and API/code: 12 px. No page-entry animations delay reading.

## Behavior

- Search uses a native modal dialog with a labelled combobox, keyboard result selection, group filtering, empty-state recovery and restored focus.
- Mobile catalog uses the same category/component source as desktop.
- Code can be copied exactly. If clipboard permission fails, source text is selected and the result is announced.
- Overview tabs pair verified JSX with a structural preview; arrow keys, Home and End navigate them.
- Reference anchors clear the sticky header; an outline marks the current section on scroll.
- Hover feedback changes surface/edge/colour in 150–180 ms. Press feedback is 100 ms. Reduced-motion disables transforms and transitions.

## Validation

Production build and browser checks cover overview, reference, pattern guide, search and drawer. Widths checked: 1920, 1440, 1280, 1024, 768, 400 and 320 px. The original 39 catalog entries, descriptions, prop data and examples remain the source of truth.
