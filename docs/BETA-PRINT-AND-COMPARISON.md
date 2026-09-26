# Beta.6 — print navigation, chart views and report tags

Scope: the September 26 evening feedback on returning from print previews in the installed iPhone app, printed chart detail, comparison printing/oils, and inconsistent report rows. Based on beta merge `0764a6b`; stable `main` is outside this release.

## Ownership and acceptance

- Coordinator: calculator view state, frozen backup validation, save-state integrity, integration tests and beta delivery.
- Chart agent: frozen selected guides and view bounds, fine-grid SVG, proportional PNG dimensions and legacy compatibility.
- Print/list agent: explicit print/back controls, close-unavailable fallback, consistent report row layout and tags.
- Comparison agent: two/three-refrigerant print table, sourced oil guidance and source attribution; independent integration review.

Print controls are visible on screen, keyboard accessible and hidden on paper. Printing requires an explicit gesture after images load. Returning first closes the preview; if unavailable, it reloads the original app route. Persisted reports recover on this fallback. Physical installed-iPhone behaviour still needs a real-device check.

New cycle records freeze view bounds, selected T/s/v vectors and their dataset version. Later view changes preserve report notes and do not mutate previous records. Legacy snapshots retain their fitted view without invented guide data. PNG layout uses the same dynamic aspect ratio as the SVG.

Comparison output retains factual limits, missing values, GWP basis, oil guidance and source attribution. It does not imply refrigerant interchangeability or compressor compatibility.

The report catalogue uses one content/chevron grid across field records and saved calculations, with type tags and separate field-report status. Existing actions, disclosure behaviour and deep links remain available.

## Verification

- TypeScript, ESLint, production build, whitespace checks and all 278 unit tests passed.
- Complete four-profile browser run: 336 passed, with the 2 existing WebKit offline-reload skips.
- Focused browser regressions cover print controls/close-unavailable return, frozen guide selections through save/reload, two/three-column comparison printing, blocked popups, and mixed catalogue rows at 390 px.
- Visual PDF review covered every page of the two/three-refrigerant comparisons and the fitted cycle with all guides. Grid lines, guide legends, table columns and source appendices remain legible; controls are absent on paper.
- Independent review found and fixed a save-in-flight view race and dynamic-height SVG distortion in PNG export. Backup validation preserves the additive guide/view fields and rejects invalid guide pressure vectors.
- Linux CI exposed a test-only race when Chromium closed the preview before acknowledging the back-link click. The test now accepts only an already-closed preview, still requires the close event and intact original editor, and passed 24 repeated four-profile cases.
- No user browser records were changed; tests used isolated contexts. Automated WebKit is not a physical installed-iPhone verification.
