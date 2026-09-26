# Beta UX round two — 26 September 2026

Status: implemented and published to the separate beta as commit `50242f8` (PR #3). At that release, stable `main` was `0.1.0` and the beta application version was `0.2.0-beta.1`.

## Implementation plan and ownership

1. **Shared controls and layout (parent).** Reuse underlined exclusive choices for pipe modes, CO₂e input units and chart framing. Keep independently selected guide curves separate. Align labels and actions, establish button line height and supporting-copy spacing, and emphasise the main result with its unit. Keep prose readable; reserve monospace for formulas and values.
2. **Checklist stability (parent).** Separate persistent help from short save status so each keystroke cannot change the preceding content height. Preserve immediate local persistence, focus and keyboard operation. Verify creation controls and footer alignment on desktop and mobile.
3. **Picker and version (parent).** Hold a viewport-bounded dialog height while only the results scroll; adapt to visual viewport changes, keep the search position stable and avoid background scrolling. Use root package version `0.2.0-beta.1` as the common application version, with channel and build revision visible in Settings and the beta banner.
4. **Chart and frozen report (Sol, chart_polish).** Centre framing on the four actual cycle points with symmetric padding, clip source curves, label sparse guide curves and expose independent selected states. Move save/print after the plot. Store validated numeric chart vectors with each new cycle report and generate a deterministic vector SVG without a later data lookup.
5. **Equipment and records (Sol, records_polish).** Show the current device in collapsed summaries; link directly to a selected record; allow reassignment, unlinking and deletion from device history. Preserve original measurements and source metadata. Improve compact report tables, highlight superheat/subcooling and include the frozen chart in PDF/PNG exports. Keep legacy records readable.
6. **Data completion (Luna, data_research).** Search primary sources for R437A and missing common refrigerant properties. Record attributable additions and unresolved gaps. Distinguish mixture-inapplicable fields from unavailable information; never manufacture a single molecular formula for a blend or substitute a regulatory GWP basis.

## Acceptance criteria

- Chart full/fit choices share the standard underline style. T/s/v states are visibly distinct and keyboard accessible. Fit has balanced margins around the actual cycle.
- Save/print follows the cycle chart. New saved cycle reports retain a printable vector chart even if the source dataset changes. Imported chart vectors are bounded and validated; arbitrary SVG is not accepted.
- Add-device labels do not split awkwardly. Device records open exactly, show current assignment before expansion, and can be moved or detached without changing captured calculation values.
- The picker does not jump between all, one and zero search results. It stays within the available viewport with scrollable results.
- Primary values are prominent; secondary explanation and method details do not compete with them. Button text and neighbouring help have consistent spacing.
- Settings and beta banner report the same application version and build identity.
- Checklist text editing retains focus and scroll position during automatic saves and after reopening. Select/create controls and footer actions align.
- CO₂e units and pipe tabs follow the same exclusive-choice convention. Source limits remain visible and detailed methods remain available.
- Every data addition has a specific source and basis. Remaining unsupported models and external review gates remain explicitly open.

## Verification evidence

- Baseline reproduction: the new checklist scroll regression test against the previous beta build detected **24 px** of movement during typing (allowed tolerance 2 px). The changing save-status paragraph is separated from persistent help in this patch.
- Sol cross-review identified PNG aspect-ratio distortion, special-character record routes, and image-load failure handling; these are included in the patch before integrated verification.
- Integrated checks and publication evidence will be recorded after the candidate is frozen.

## Integrated verification

- Data validation: 249 refrigerants and 50 sources; dataset `2026-09-26.fffbb55a5c7e`.
- TypeScript, ESLint, 212 unit tests (22 files), production build and `git diff --check` passed.
- Complete Playwright suite passed: 202 cases across desktop/mobile Chromium and WebKit, including offline, language/theme and axe accessibility checks. Targeted reruns cover subsequent report layout and current-device summary refinements.
- New regressions cover stable typing/scroll/focus and failed-storage truthfulness, constant picker bounds, aligned controls, exclusive keyboard choices, cycle centring and independent guide curves, frozen chart JSON/reload/print, and current versus original equipment identity.
- Manually inspected desktop light/mobile dark output and generated a real A4 PDF. Important cycle metrics and the vector chart are now grouped before detailed state values; the chart and its heading stay together. PNG export uses the same aspect ratio.
- Local visual evidence is in `output/beta-round-two/` (ignored generated review artifacts). This is browser emulation, not a claim of a physical iPhone keyboard, printer or assistive-technology run.
- Sparse thermodynamic guides remain bounded by validated model data. No unsupported gap is filled with invented curves. Older saved reports without chart vectors remain readable but cannot retroactively gain a frozen chart.

The mobile chart uses the measured container width and fewer enthalpy ticks rather than clipping a desktop-width SVG. The saved/exported chart remains a fixed vector representation, independent of screen size.

Final chart integration: 24 targeted cycle/chart browser tests passed across desktop Chromium, mobile Chromium and mobile WebKit; 390px coverage checks all four points, label size and absence of horizontal scrolling.
