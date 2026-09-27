# Beta field reports — 26 September 2026

Goal: complete a field record on a phone, find its saved draft, review its measurements and print an understandable report. This beta remains separate from stable production.

## Scope and acceptance

- Reports replaces Saved in the four-item navigation and collects existing calculations, leak checks and field records. Search by report/site/equipment and filter by kind or draft/final state. Existing saved links continue to resolve.
- Draft changes persist automatically, with visible saving/saved/error feedback at both ends of the editor. Existing checklist records remain readable; old combined fields are preserved without guessed conversions.
- Date, technician and printed signature name are separate. Finalising freezes the record; editing starts a new revision. Finalised means the document was completed, not that technical acceptance has been established.
- Evacuation records separate achieved pressure while pumping, evacuation duration, isolated standing-test start/end pressures and duration. Acceptance limits remain equipment-specific. Printed results lead with the standing test and an explicitly comparable pressure difference.
- Commissioning separates refrigerant/charge, LP/HP, pressure units/reference and suction/discharge/liquid temperatures. Valid supported measurements may produce a frozen calculation and log(p)–h chart. Missing or unsupported inputs must not produce invented output.
- Service and refrigerant addition/recovery use the same modest record workflow. New standalone calculators, cloud synchronisation and work-order management are later work.
- Print layouts identify the report type, site/equipment, recorded application version when known, generated version, revision and dates. Measurements precede checklists, and paper signatures have a dedicated line.

## Small fixes included

- Blue checked controls replace lime in field checklists only.
- Saved leak checks use the same summary typography as calculations, with the refrigerant, assessment type and actual result.
- Drafts are discoverable in Reports and reopen directly, with a visible saved state beside the final actions.
- Previous beta.3 fixes remain regression requirements: icon spacing/alignment, picker count spacing and scroll cue, stable favourite position, update notice, release-history link, chart label collisions, pressure–temperature result, leak-check explanation and result context, paired save/print actions and printed inspection dates.

## Ownership and verification

Parent: persistence schema, Reports navigation/catalogue, integration, release metadata and delivery. Editor agent: templates and field editor. Cycle agent: existing-model calculation adapter and storage regressions. Print agent: shared report export and print tests. All agents share this feature branch with non-overlapping write surfaces.

Required evidence: type/lint/unit checks; browser persistence, legacy record, revision, mobile and print paths; actual A4 PDF inspection; beta deployment/version and unchanged stable branch. No update to refrigerant coverage counts is warranted without data changes.

## Local verification

- TypeScript, ESLint, deterministic build and 264 unit tests passed.
- The first full browser run passed 274 cases and retained two known WebKit offline-history skips. Ten failures were obsolete test selectors/titles; after updating them, all 78 affected report, equipment, print, offline and editor regressions passed across Chromium/WebKit phone and desktop profiles. The added invalid-imported-date case is included in that targeted run.
- Drafts survive reload and can be reopened from Reports. Final records remain byte-for-byte unchanged when their linked device is renamed/deleted; editing a final record creates a new ID/revision. Notes and finalisation retain the generated chart; changing cycle measurements clears it.
- A 300-character equipment location survives prefill and storage; over-limit data is rejected before an existing record is overwritten. Invalid imported work-date prose falls back to the valid update date in device history.
- Actual mobile screenshots reviewed: paired pressure/temperature inputs and the Reports action. Actual A4 PDFs reviewed with backgrounds disabled, including evacuation, commissioning, frozen cycle diagrams, long notes and existing leak-check/pipe reports.

Physical printer output, a real-device Safari update and assistive-technology testing are not covered by the automated runs. No user browser storage was cleared or modified during verification.

- Final pagination pass: 28 print cases passed across all four browser profiles. The evacuation example fits one A4 page including its signature and version footer; section headings stay with their content and the closing signature/footer block stays together.
