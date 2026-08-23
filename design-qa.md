# Design QA — 키워드 상세 사이드바

- source visual truth path: `/Users/yjkwak/Documents/junction/design-source-keyword-sidebar.png`
- implementation screenshot path: `/Users/yjkwak/Documents/junction/design-implementation-keyword-sidebar.png`
- side-by-side comparison path: `/Users/yjkwak/Documents/junction/design-comparison-keyword-sidebar.png`
- viewport: desktop 1280 × 720 CSS px
- source pixels: 1280 × 720
- implementation pixels: 1280 × 720
- density normalization: both captures use matching 1280 × 720 dimensions at 1× density
- state: 분석 완료 화면에서 첫 번째 키워드 막대를 눌러 상세 사이드바를 연 상태

## Full-view comparison evidence

The two open-sidebar states are combined in `design-comparison-keyword-sidebar.png`. Both preserve the client rail, compact result card, highlighted selected keyword row, fixed right detail panel, summary count, five-column history bars, and stacked source utterance cards. The implementation uses the current product's result header rather than inventing the reference's unavailable session-tab data.

## Focused region comparison evidence

The sidebar is large enough in the full 1280 × 720 comparison to verify its header, total count, five-session bar proportions, timestamps, turn indices, utterance card padding, borders, and scroll continuation. A separate crop was not required.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: IBM Plex Sans KR/Poppins, compact metadata, blue numeric emphasis, and source-text hierarchy match the reference density.
- Spacing and layout rhythm: the 360px fixed panel, section dividers, 24px horizontal padding, summary row, bar area, and utterance card rhythm closely follow the reference.
- Colors and visual tokens: MoomIn blue, pale history bars, current-value emphasis, gray backgrounds, and hairline separators reuse existing tokens.
- Image quality and asset fidelity: this state contains no imagery or custom illustration assets. Both charts are data-driven interface graphics.
- Copy and content: the panel clearly distinguishes total keyword count, recent five-session counts, and API-derived client utterance originals. No utterance text is fabricated when a match is unavailable.
- Interaction and accessibility: every keyword row is a real button with selected state, the panel is labelled as complementary content, the history bars have an accessible graph label, and the close control is keyboard-operable. Opening the panel was verified in the browser; no console errors or warnings appeared.
- Responsive behavior: below the desktop breakpoint the panel becomes a full-width overlay and the underlying result content stops reserving desktop sidebar space.

## Comparison history

- Initial comparison: no P0/P1/P2 issue found, so no corrective visual iteration was required.

## Implementation checklist

- [x] Open the sidebar from each visible keyword row.
- [x] Display current count and percentage.
- [x] Display the latest five trend values as bars.
- [x] Match source utterances from `client_utterances` without creating placeholder quotes.
- [x] Display timestamps, page fallback, and turn index when available.
- [x] Support an empty-original state.
- [x] Verify lint, type checking, production build, browser interaction, and console output.

## Follow-up polish

- P3: The reference uses an icon-only close affordance; the implementation uses the clearer text label `닫기` because the project does not currently include an icon library.

final result: passed
