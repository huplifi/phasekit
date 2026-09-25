# Roadmap expansion preview

26 September 2026. Working branch: `feature/tools-data-preview`.

## Delivery boundary

This work is an unmerged pull request with a Netlify Deploy Preview. Do not push to `main`, merge the pull request, change the production branch or publish a production deploy. Netlify was inspected: production uses `main`; Deploy Previews are enabled for pull requests. The production baseline is `1ff0dce`.

## Scope and ownership

- Data agent: source-eligible refrigerant enrichment, canonical CSV and persistent import overlays, audit evidence.
- Conversion agent: general converter and CO2e component breakdown, independent calculation tests.
- Field-tools agent: thermal/electrical calculators, bounded pipe volume/velocity calculations and practical work checklists.
- Coordinator: scheduling and sharing, filters, record/equipment storage integration, routes, preview publishing and integrated verification.
- Additional bounded review/documentation work may use Luna after an active agent frees a slot.

## Acceptance

Every new tool must have a usable FI/EN mobile interface, explicit inputs/units, invalid-input handling, offline behaviour and independent calculation examples. No inferred missing refrigerant facts, mixed GWP bases, silent extrapolation or automatic engineering approval. Existing stored snapshots remain frozen and old JSON backups import without loss. New histories and checklist drafts participate in backup/restore and deletion.

Leak-check scheduling uses an explicitly entered completed inspection date and the computed interval, never the assessment date as an implied completed inspection. Shared summaries include assumptions, rule/data versions and sources. Search distinguishes verified classifications from unknowns; no usage recommendation is inferred from a broad refrigerant family.

The final build is generated only after agents finish canonical source changes. Run data validation, unit/integration tests, lint, typecheck, production build and browser checks, then verify the exact commit in CI and the Netlify preview. Confirm production remains on its existing baseline.

## External gates

Qualified regulatory/engineering sign-off, physical iOS/Android and assistive-technology validation, developer identities, signing and store submission cannot be substituted with automated tests. Native readiness work must not claim a store release or require purchases. Record remaining limitations in the roadmap and preview handoff.
