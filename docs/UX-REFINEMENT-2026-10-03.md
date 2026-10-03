# Beta UX refinement — 3 October 2026

## Scope and ownership

The owner gave GO for the collected screenshots and requested Sol/Luna implementers with one coordinator. Work is on `codex/ux-refinement-round`, based on live beta.5 (`9cdcffb`). Stable stays outside this release.

- Coordinator: integration, shared equation presentation, heat-quantity calculator, compact beta notice, Settings version row, release and focused verification.
- Sol editor: report filling, completeness review vs background information, section separators/summaries, sourced-property editing, FieldTools equation blocks and related-tool navigation.
- Sol print: clear document identity, draft completeness placement, applicable measurement context, brand fonts and robust print controls.
- Luna catalogue: Properties coverage at the bottom, restriction discovery, report-list hierarchy and equipment management.

## Acceptance

1. Coverage is quiet background at the end of Properties; actual refrigerant facts remain distinct.
2. Restrictions have search, a coherent status selector, separated result count and predictable grouping/date order. The content/rules remain unchanged.
3. Calculator equations have readable dedicated blocks, explanations and sources. Links to other tools do not compete with Calculate.
4. The beta notice is compact with matching text links; Settings version row uses the same text size/row rhythm as its neighbours.
5. Reports prioritise site, type/device, date and meaningful draft state. Equipment management and linked records remain accessible without nested competing cards.
6. Editors have clear sections and a review step that navigates to actual missing fields; regulatory context is separate. Autosave, backups, immutable final revisions and underlying validation rules remain intact.
7. Prints identify site/device prominently, keep incompleteness honest without a long opening checklist, retain applicable measured values, provenance, attachment references and signatures. Brand fonts have a reliable fallback; offline/opener-independent printing stays functional.

## Evidence boundary

Finlex's official original VNa 1063/2025 §9 was re-read on 3 October 2026: https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf. Its eleven content categories are not identical to a count of missing input fields in the app. The existing completeness model also captures supporting records and applicability. This presentation work does not amend the model or claim legal/technical approval from filled fields. No exhaustive amendment-history audit is claimed.

At the start of this round, the actual beta URL, https://beta.phasekit.app, served beta.5/revision `9cdcffb`. The user's screenshots show beta.4 under a different Sites hostname; those screenshots are not evidence that the Netlify beta publication failed.

## Verification plan

Run one integrated type/lint/build check, affected behaviour tests only, and inspect representative mobile views and draft/filled PDF output. Do not run the full browser suite or paid Deploy Previews for every change. Record concrete results here before publication; real iPhone AirPrint remains a physical-device check.

## Verification results

- TypeScript no-emit and ESLint for all changed TypeScript/JavaScript/test files passed. Release-history generation and the final Vite/PWA production build passed. Vite retains the pre-existing large-bundle warning; no dependency or model data changes.
- Print-focused unit tests: 17/17 passed (`field-report-print`, `round3-print`, `report-leak-check`).
- Chromium: 10/10 affected browser scenarios passed: measured draft/final print, frozen cycle, ten beta.9 legacy reports through import/print/export, long observations, installation field guidance/internal protocols, online/offline controls, return navigation and suspended opener.
- Mobile WebKit: 11/11 passed: four print-control scenarios, refrigerant details/accessibility, coverage/source navigation, equipment history/rename/delete with frozen records, mixed report alignment and two affected calculator behaviours.
- Additional mobile inspection checks coverage order and wrapping, restriction ordering/search, hidden-field focus, manual refrigerant-property persistence, technical-purpose review, and the report/equipment/formula presentation. Existing leak-check rules continue to use their sourced dataset values; editing the report's GWP metadata does not override that engine. Early inspection-script failures were incorrect test assumptions or a locator mismatch, not application fixes.
- Visually reviewed the commissioning draft and all three pages of the filled installation bundle: brand fonts, clear site/device, complete protocol text, provenance and grouped signature area. Evidence files are local under `output/ux-round/`; synthetic records only.

No full browser suite, dependency installation or paid Deploy Preview was requested. Following the owner's explicit minimal-test/build-cost preference, this beta round uses the relevant local checks above instead of the generic full-CI release recipe. The candidate commit/PR skips duplicate CI and preview builds; one merge into `beta` triggers the actual deployment. A redundant merge-triggered full CI run may be cancelled only after the merged tree matches the verified candidate. This is not a claim that the full CI suite passed.

Physical iPhone AirPrint/dialog behaviour remains a device check. Automated WebKit checks verify browser control dispatch and navigation, not a printer or iOS system dialog. The separate Sites URL is not republished by this Netlify beta release, and no browser storage is cleared.

## Publication

PR #26 merged into beta as `2b5b8f977fb60d09b7b6d6ca49efaef162553b06` on 3 October 2026. The merged tree exactly matched tested candidate `4803a1e`. The published HTTPS bundle and a fresh mobile-WebKit Settings visit both confirmed `0.4.0-beta.6` / `2b5b8f9` at https://beta.phasekit.app. The redundant full CI run `37130332710` was deliberately cancelled; it did not fail validation. No Deploy Preview was requested, and stable was not changed.
