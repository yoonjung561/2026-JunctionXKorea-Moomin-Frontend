# Design QA — 키워드 분석 결과

- source visual truth path: `/Users/yjkwak/Documents/junction/design-source-keyword-results.png`
- implementation screenshot path: `/Users/yjkwak/Documents/junction/design-implementation-keyword-results.png`
- mobile implementation screenshot path: `/Users/yjkwak/Documents/junction/design-implementation-keyword-results-mobile.png`
- side-by-side comparison path: `/Users/yjkwak/Documents/junction/design-comparison-keyword-results.png`
- viewport: desktop 1280 × 720 CSS px, mobile 390 × 844 CSS px
- source pixels: 1280 × 720
- implementation pixels: 1280 × 720
- density normalization: source and implementation were captured at matching 1× dimensions; no resampling was required before the side-by-side comparison
- state: 키워드 9개와 5개 회기를 포함한 `client_utterance_keywords` 응답을 사용한 분석 완료 상태

## Full-view comparison evidence

The source and implementation were combined in `design-comparison-keyword-results.png`. Both retain the same core composition: persistent client sidebar, restrained white/gray workspace, compact result header, rounded keyword summary card, blue frequency bars, and the start of the trend card within the first viewport. The implementation intentionally omits the source's session tab strip because the current API response does not define a selectable document/session collection for that control.

## Focused region comparison evidence

A separate focused crop was not needed. At 1280 × 720, the keyword labels, counts, percentages, card padding, bar lengths, header hierarchy, border radii, and trend legend are readable in the combined comparison without magnification.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: IBM Plex Sans KR/Poppins hierarchy, compact sizes, muted metadata, and medium-weight headings match the existing product language and reference density.
- Spacing and layout rhythm: sidebar width, header height, card spacing, bar-row rhythm, and rounded surfaces follow the reference proportions. The missing session strip is an intentional data-model constraint, not visual drift.
- Colors and visual tokens: the existing MoomIn blue, pale-blue bar fills, gray tracks, white surfaces, and hairline borders are consistently reused.
- Image quality and asset fidelity: the result screen contains no source imagery or non-standard image assets. The trend graphic is a data-driven SVG chart rather than a decorative replacement asset.
- Copy and content: labels describe actual `client_utterance_keywords` aggregation, actual counts, percentages, and either session-based or utterance-segment trends without claiming normalized values that the API does not provide.
- Responsive behavior: the 390 × 844 capture keeps the header action, labels, bars, counts, card padding, and scroll flow visible without horizontal clipping.
- Accessibility and interaction: the trend chart has an accessible image label and point labels; the raw JSON remains available in a native details disclosure; browser console contained no errors or warnings during the rendered result checks.

## Comparison history

- Initial comparison: no P0/P1/P2 issue found, so no corrective visual iteration was required.

## Implementation checklist

- [x] Aggregate keyword counts and percentages from the backend schema.
- [x] Render the top keyword frequency bars.
- [x] Render session-based trends when session labels exist.
- [x] Fall back to utterance-order segments for a single-session document.
- [x] Preserve the raw response for debugging.
- [x] Verify desktop and mobile layouts.
- [x] Verify the production build and type check.

## Follow-up polish

- P3: If the backend later exposes total client word count per session, the trend can optionally add the reference design's normalized comparison mode alongside actual counts.

final result: passed
