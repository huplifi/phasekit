# Roadmap preview verification

26 September 2026 · `feature/tools-data-preview` · production baseline `1ff0dce5367596758150f426c0f7de46005a59c6`.

## Scope

This candidate expands source-backed refrigerant data, unit conversion, CO₂e component accounting, catalogue filters, periodic inspection scheduling/sharing, thermal/electrical/pipe calculations, work checklists, frozen reports and equipment history. It is intended for an unmerged Netlify Deploy Preview only. See [roadmap](ROADMAP.md) for remaining work and [preview plan](PREVIEW-PLAN.md) for acceptance criteria.

## Local evidence

- Canonical data validation: 249 refrigerants, 47 source records.
- Unit/integration checks: 190 tests across 17 files passed.
- Lint: passed, zero warnings.
- TypeScript and production build: passed; dataset `2026-09-26.137e4a256905`.
- Browser suite: 142 distinct scenarios verified across the integrated run and targeted corrections. The integrated run passed 138/142; its remaining print-window defect and tooltip-dismissal test setup were corrected, and all 12 report/filter checks passed. All 28 converter/cycle checks passed after adding frozen CO₂e/cycle report assertions.
- Final GitHub CI, commit and Netlify preview evidence are attached to the pull request; no production release is authorised.

Data enrichment adds 34 facts on 33 existing records: safety-group coverage increases from 167 to 199, and two R513A critical constants are added. The 249-record catalogue and P–T/p–h coverage remain unchanged. [Source audit](DATA-PREVIEW-AUDIT.md) documents exclusions, source rights and withheld conflicts.

## Acceptance matrix

| Requirement / risk | Observable evidence | Result |
| --- | --- | --- |
| Source-bounded enrichment | Canonical/audit checks; 34 attributed facts, no guessed missing groups | Pass for this tranche |
| Units and calculations | Independent examples, wrong units and invalid boundaries; signed outputs | Pass in tested domains |
| Durable history and compatibility | IndexedDB round-trip, schema-v1 migration, merge/rejection, browser reload/export | Pass locally |
| FI/EN, responsive and offline | Chromium/WebKit flows, 320px forms, offline reload and axe checks | Pass for automated scope |
| Production isolation | Feature branch; production main and Netlify remain on baseline | Verified before preview push; recheck in PR handoff |
| Physical devices, regulatory review, native/store delivery | No substitute evidence from web tests | External gates remain open |

## Regression coverage

Calculation tests distinguish temperature from temperature difference, pressure references, calendar-month clamping, invalid/missing fields, signed sensible heat, RMS electrical assumptions and exact component mass percentages. Canonical R513A and R404A records exercise mixed/pure Annex-group filtering rather than synthetic fraction fixtures alone.

Persistence tests restore old schema-v1 backups without new collections, retain frozen report/equipment/checklist content, merge without overwriting history and reject duplicate records, unsafe source URLs, oversized text and un-restorable merged state. A failed validation cannot overwrite the previous durable state.

Browser coverage includes mobile/desktop Chromium and targeted WebKit, signed/comma input, stale-result clearing, report save and reload, source retention, JSON export, printable report content, equipment deletion without history loss, checklist export/delete confirmation, inspection date retention, filter combinations, 320px layout, FI/EN and offline use. Automated axe checks supplement, not replace, manual accessibility review.

## Known limits

- Vite still warns about the main bundle size: data and offline thermodynamic tables remain bundled. The build precaches approximately 5.6 MiB. No new runtime service or secret is required.
- Equipment and checklist changes are stored locally. Storage errors remain visible; reports announce success only after durable saving.
- Report PDF uses the browser print workflow, not an automatic file-generation service. Actual mobile OS print/export dialogs need device testing.
- Fifty safety groups and many conditional properties remain unknown. No manufacturer substitution approval, refrigerant pressure-loss model, inferred COP, universal test threshold or full thermodynamic isoline model is added.
- Qualified engineering/regulatory review, real phone installation/flight-mode cold start, assistive-technology checks and native/store releases remain external gates. See [native readiness](NATIVE-READINESS.md) and [release gates](RELEASE-GATES.md).
- The preview has a separate browser-storage origin. Testing it does not migrate or edit production browser data; use explicit JSON backup/import when needed.
