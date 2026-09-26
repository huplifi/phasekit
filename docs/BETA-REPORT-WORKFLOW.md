# Beta.5 — report workflow and installation records

Scope: the September 26 follow-up screenshots, commissioning requirements review, leak-check PDF and shareable explanation. The delivery target is the separate beta; stable `main` stays unchanged.

## Ownership and acceptance

- Coordinator: one chronological Reports catalogue, equipment empty state, global native date sizing, on-screen overdue/explanation grouping, release documentation and integrated verification.
- Editor agent: grouped commissioning fields, installation-document completeness checks, inline evacuation records, quiet editor header and legacy-value preservation.
- Print agent: shared compact print layout, tabular leak-check inputs/components, bounded metadata/source typography and handwritten signature/name lines.
- Research agent: primary-source Finnish installation-document requirements and applicability matrix in [COMMISSIONING-REQUIREMENTS.md](COMMISSIONING-REQUIREMENTS.md).

Reports and calculations use one searchable, newest-first catalogue. Creating a report and managing equipment are separate actions. Existing routes, records, frozen calculations, final revisions and backups remain readable.

All native date inputs use the same intrinsic-width reset, including inputs nested in labels. The equipment empty state must have inner padding. Supporting copy must be smaller than actions and separated from them.

Commissioning preparation must expose the information required by VNa 1063/2025 §9 rather than imply that a few measured values and ticked steps are an installation certificate. Referenced external protocols still need to be supplied, and the responsible person signs the paper document. Form completeness and technical/legal acceptance are different.

Every PDF keeps its key result prominent; detail rows, components and provenance use compact shared styling. Overdue dates are explicitly labelled against the assessment date, both on screen and in print; a due date equal to that date is not late. Sharing/copy actions live inside the explanation disclosure, separate from save/print actions and calculation/source details.

## Verification

- TypeScript, ESLint, production build and all 269 unit tests passed locally.
- The initial full four-profile browser run exposed an autosave status-height jump and outdated test selectors/expectations. After fixing them, all 104 targeted Chromium/WebKit desktop/mobile checks passed. The final complete browser run passed **308 tests with 2 existing WebKit offline-reload skips**, covering revision preservation, inline evacuation, report printing, date sizing, equipment empty-state spacing and the prior calculator/UI fixes.
- Isolated 390 px Chromium inspection confirmed the catalogue, equipment empty state, report date control, red overdue card and grouped explanation actions. Automated report date checks also cover 320 px widths.
- The R404A 20 kg assessment (last inspection 2025-11-01; assessment 2026-09-26) renders as one A4 page with a red overdue label, compact input/component tables, source information and footer. Decimal precision is retained with Finnish formatting.
- Final print-only spacing changes passed a fresh build/typecheck and all three desktop Chromium field-report print cases. Visually checked PDFs: commissioning draft with inline evacuation, evacuation final and direct pipe calculation each occupy one page. A complete commissioning record with installation details, frozen cycle calculation, chart, sources and signature area occupies three coherent pages. The draft's orphan signature/footer page was removed; the full report retains legible details rather than forcing a two-page limit.
- Actual iPhone Safari remains a separate physical-device check from automated WebKit. No real user records were modified during verification.

Release target: version `0.2.0-beta.5`, through a PR from `fix/beta-report-workflow` into `beta`. The baseline is beta `a8d3f5e`; stable `main` at `1ff0dce` is outside this release. Exact-head CI, the isolated deploy preview and the live beta version/revision are checked before calling publication complete.

Dataset content and coverage are unchanged (249 records; 124 P–T and 113 p–h models). This release changes report workflows and legal-document preparation, not regulatory assessment rules or engineering acceptance thresholds.
