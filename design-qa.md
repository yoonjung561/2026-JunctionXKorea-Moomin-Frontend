# Design QA

## Evidence

- Source visual truth: `design-source-desktop.png`, `design-source-mobile.png`, `design-source-analyzing.png`
- Implementation: `design-implementation-desktop.png`, `design-implementation-mobile.png`
- Combined comparisons: `design-comparison-desktop.png`, `design-comparison-mobile.png`
- Desktop viewport and pixels: 1440 × 1000 CSS px, 1440 × 1000 image px
- Mobile viewport and pixels: 390 × 844 CSS px, 390 × 844 image px
- Density normalization: source and implementation were captured through the same browser viewport override and compared at identical pixel dimensions.
- State: source upload screen with seven illustrative mock files; implementation upload screen with the truthful empty state before a user selects a document.

## Full-view comparison

The combined desktop and mobile images compare the source on the left and the implementation on the right. The shell proportions, 268px desktop sidebar, responsive horizontal client list, title hierarchy, dashed upload card, blue accent treatment, surface colors, radii, file-list container, footer note, and primary CTA placement match the source structure. The implementation intentionally replaces the source's seven illustrative mock files with an empty state so the list reflects actual user-selected files.

## Focused-region comparison

A separate crop was not needed because the upload card, file-list header, responsive client navigation, and footer controls are fully visible and readable in the full-view captures. The individual source and implementation captures were also inspected at original resolution for typography, spacing, borders, and control states.

## Required fidelity surfaces

- Fonts and typography: IBM Plex Sans KR and Poppins are loaded from the same Google Fonts source with matching 400/500/600 weights, sizes, hierarchy, and Korean fallbacks.
- Spacing and layout rhythm: source shell widths, 52/64px desktop pane spacing, 12px card radii, upload-card gaps, responsive stacking, and footer alignment are matched.
- Colors and tokens: source ground, surface, text-opacity, border, accent, and tint values are reproduced as local CSS variables.
- Image and asset fidelity: the visible upload icon is copied from the source SVG. No placeholder image, emoji, or substituted illustration is used.
- Copy and content: upload instructions, supported-document chips, client names, privacy note, and CTA copy match the source. Mock uploaded filenames are intentionally omitted until a real document is chosen.

## Comparison history

### Pass 1

- Finding: the hidden native file input appeared as an extra accessibility control and the drop region created nested interactive controls.
- Severity: P2.
- Fix: removed the interactive role from the drag target, changed the visible picker control to a label associated with the hidden input, and removed the input from the visual/accessibility layout.
- Post-fix evidence: `design-implementation-desktop.png` and `design-implementation-mobile.png` show one visible file-selection control with no duplicate browser control.

### Pass 2

- Finding: the mobile client cards used a narrower override than the source and exposed more of the third card.
- Severity: P2.
- Fix: restored the source 190px minimum client-card width at the mobile breakpoint.
- Post-fix evidence: the final implementation uses the same responsive client sizing rule as the source.

## Findings

No actionable P0, P1, or P2 visual differences remain. The empty uploaded-file state and disabled CTA are expected functional states, not design drift.

## Primary interactions and console

- File selection and drag/drop handlers are wired to the hidden native input.
- `분석 시작` remains disabled until a real file is selected.
- The button sends a `multipart/form-data` request containing `file` to `/agent/analyze` without manually setting `Content-Type`.
- Loading, success JSON, retry, and error states are implemented.
- Browser console inspection on the rendered upload screen returned no warnings or errors.

## Follow-up polish

None required for the upload screen.

final result: passed

---

# Multi-speaker selected-state QA

## Evidence

- Source selected-state visual: `design-source-speaker-selected@2x.png`
- Normalized source: `design-source-speaker-selected.png`
- Browser-rendered implementation: `design-implementation-speaker-selected.png`
- Side-by-side comparison: `design-comparison-speaker-selected.png`
- Source pixels: 2942 × 1644 at 2×, normalized to 1471 × 822
- Implementation pixels: 1471 × 822 at 1×
- State: two detected speakers visible, `발화자 2` preselected from `client_speaker_label`

## Findings

- No actionable P0/P1/P2 mismatch remains for the requested change.
- The implementation preserves the existing modal shell, typography, color tokens, guidance strip, and footer action while restoring the two-column speaker comparison shown in the selected-state reference.
- The Agent-selected speaker uses the reference's blue border, blue metadata, and filled selection control. Unselected speakers retain the neutral border and outline control.
- The reference capture is visibly browser-scaled relative to the sidebar, while the implementation stays at the project's existing 100% scale. Component proportions and selected-state styling were therefore compared rather than treating source zoom as a CSS requirement.
- No photographic, illustrative, or custom raster assets are present in this modal state.

## Interaction and responsive checks

- Each speaker control exposes `aria-pressed`; exactly one speaker is selected at a time.
- The initial selected value comes from `client_speaker_label`, not mock UI state.
- Cards are generated dynamically from API labels and switch to one column on narrow screens.
- Browser console contained no application errors in the rendered selected state.

## Comparison history

- First comparison: the two-card layout and selected card matched the requested state. The omitted multi-session checkbox and direct-designation control were already absent from the existing implemented flow and were intentionally not introduced by this scoped change.

final result: passed

---

# Speaker confirmation modal QA

## Evidence

- Source visual truth: `design-source-speaker-confirmation@2x.png`
- Normalized source: `design-source-speaker-confirmation.png`
- Browser-rendered implementation: `design-implementation-speaker-confirmation.png`
- Side-by-side comparison: `design-comparison-speaker-confirmation.png`
- Viewport: 1512 × 824 CSS px
- Source pixels: 3024 × 1648 at 2×, normalized to 1512 × 824
- Implementation pixels: 1512 × 824 at 1×
- State: analysis complete, `client_speaker_label` detected, confirmation dialog open

## Full-view and focused comparison

The normalized source and implementation are shown together in the side-by-side comparison. The complete modal copy, card, guidance strip, and footer controls remain legible at this size, so a separate focused crop was not required.

## Required fidelity surfaces

- Fonts and typography: Korean sans hierarchy, weights, line heights, and muted metadata treatment follow the source using the project's existing IBM Plex Sans KR/Poppins stack.
- Spacing and layout rhythm: the main-area scrim, centered 748px modal, 16px radius, header divider, card rhythm, guidance strip, and right-aligned footer follow the source. The shorter modal is intentional because the requested flow presents one Agent-selected speaker instead of two selectable candidates.
- Colors and visual tokens: existing accent, tint, neutral line, scrim opacity, and warm guidance colors remain consistent with the source.
- Image and asset fidelity: the source modal has no required photographic or raster asset. No replacement illustration or placeholder asset was introduced.
- Copy and content: the source selection question is adapted to a single-speaker confirmation question. Speaker name and samples come from `client_speaker_label` and `client_utterances`.

## Findings and comparison history

The first normalized comparison found no actionable P0, P1, or P2 mismatch. The one-card composition, shorter height, and changed confirmation copy are intentional product requirements rather than fidelity regressions.

## Interaction and runtime checks

- Dialog semantics include `role="dialog"`, `aria-modal`, and labelled title/description relationships.
- Confirm and reject handlers are connected to the existing completion screen without a new route.
- Browser console contained no application errors in the rendered confirmation state; only the React development-tools informational message was present.
- ESLint, TypeScript, and the optimized Next.js production build passed.

final result: passed
