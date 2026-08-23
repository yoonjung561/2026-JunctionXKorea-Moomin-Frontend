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

---

# Design QA — 로고 교체

- source visual truth path: `/var/folders/zc/rns9wltx66j_rww4hl1_lqmw0000gp/T/codex-clipboard-39070645-804a-47cd-8b57-bfa5fb59607d.png`
- implementation screenshot path: `/Users/yjkwak/Documents/junction/design-implementation-logo.jpg`
- focused comparison path: `/Users/yjkwak/Documents/junction/design-comparison-logo.png`
- viewport: desktop 1280 × 720 CSS px
- source pixels: 1527 × 259 RGBA
- implementation pixels: 1280 × 720 at 1× density
- focused implementation crop: 268 × 72
- density normalization: source wordmark was proportionally normalized to its implemented 148 × 25 CSS-pixel size before focused comparison
- state: 문서 업로드 초기 화면, 좌측 사이드바 상단 로고 표시 상태

## Full-view comparison evidence

`design-implementation-logo.jpg` confirms that the supplied wordmark sits in the existing 268px client rail without changing the page hierarchy, sidebar width, or upload flow. The logo is sharp, fully visible, and aligned with the existing 22px sidebar inset.

## Focused region comparison evidence

`design-comparison-logo.png` places the normalized source asset beside the browser-rendered sidebar crop. The mark, `count.sel` word shape, aspect ratio, black fill, transparency, and 148 × 25 display size match without stretching or code-drawn replacement.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the logo lettering remains part of the supplied raster asset; no substitute font or reconstructed text was used.
- Spacing and layout rhythm: the existing 72px brand row and 22px horizontal inset are preserved; the 25px-high wordmark is vertically centered.
- Colors and visual tokens: the source's black mark is preserved against the existing white sidebar surface.
- Image quality and asset fidelity: the exact supplied 1527 × 259 transparent PNG is rendered through Next Image at its native aspect ratio with no crop, distortion, CSS drawing, or placeholder.
- Copy and content: the previous `MoomIn` text lockup is fully replaced by the supplied `count.sel` mark, with matching `alt="count.sel"` accessibility text.
- Interaction and accessibility: the logo is informational and exposes descriptive alt text. The upload-page DOM and primary controls remain intact.
- Browser verification: local page opened at 1280 × 720; the logo loaded successfully and the browser console contained no errors or warnings.

## Comparison history

- Initial focused comparison: no P0/P1/P2 mismatch found; no corrective iteration was required.

## Implementation checklist

- [x] Reuse the exact supplied logo asset.
- [x] Remove the previous CSS-drawn icon and text lockup.
- [x] Preserve source aspect ratio and sidebar alignment.
- [x] Verify browser rendering and accessibility tree.
- [x] Verify browser console, ESLint, TypeScript, and production build.

## Follow-up polish

- No P3 follow-up is required for the scoped logo replacement.

final result: passed
