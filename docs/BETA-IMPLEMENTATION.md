# Beta implementation — 26 September 2026

Status: integrated beta candidate; publication and browser verification recorded below. The owner authorised the latest feedback and remaining roadmap work, with public beta publication isolated from stable production.

## Outcome and boundaries

Deliver a coherent, tested beta with consistent mobile/desktop controls, useful field conversions, pipe expansion, discoverable checklist persistence and practical reports. Advance source-backed refrigerant and thermodynamic coverage and native preparation where local tooling permits. Never fill unknown scientific data by guessing. Qualified reviews and physical-device tests remain external evidence requirements.

`main` and phasekit.app remain on the existing release. Feature changes are integrated on `feature/tools-data-preview`, tested, then prepared for a persistent `beta` branch and separate Netlify project. Beta must identify itself and explain its separate browser storage. No automatic beta-to-production promotion.

## Ownership

- Luna: catalogue/filter/picker JSX, shared navigation/icons and all application CSS.
- Sol: report summaries, print/image export and saved report actions.
- Sol: checklists and pipe expansion, followed by thermodynamic isolines.
- Coordinator: conversions, persistence status, inspection print entry, beta build metadata, release configuration, source integration, final verification and documentation.

Owners coordinate shared interfaces before editing. Later data/native work follows only after ownership becomes available.

## Acceptance and verification

- All twelve feedback items are implemented or explicitly classified with evidence and remaining prerequisites in the final report.
- Normal, boundary and invalid scientific inputs have meaningful tests; signed differences/contraction stay signed.
- Offline data retains source and applicability information. Generated assets stay within the PWA caching budget.
- Mobile/desktop, light/dark and FI/EN affected routes are checked visually in addition to tests. Real-device checks are not claimed from browser emulation.
- Full integrated typecheck, lint, tests, data validation, build and relevant browser paths pass after agent changes are combined.
- Beta deployment is tied to the tested Git commit; production commit is checked separately. DNS/TLS evidence is recorded, or exact Namecheap steps are supplied if access prevents configuration.

## Initial external constraints

- The local machine currently has Command Line Tools, but no selected full Xcode, Java runtime or Android SDK. Native project preparation can proceed, but native builds/device validation require those toolchains.
- Qualified regulatory review and recruitment of real user pilots cannot be substituted by automated verification.

## Delivered feedback

1. Filter labels and fields align; on/off options use switches. Checklist completion retains large custom checkboxes because it records a completed task rather than toggling a setting.
2. The picker renders all matching records in its scrollable dialog.
3. Favourites remain first; the duplicate Favourites tab is removed.
4. The converter adds BTU/h and refrigeration tons, absolute vacuum units and length. Notes and save actions have consistent spacing.
5. Checklists expose saving/saved/error status and local persistence, and print complete or partial observations directly.
6. Saved cards identify their quantity and values. Current results and inspections print directly; saved tool records export PNG or exact JSON. Display rounding is marked and does not change snapshots. Oversized image reports direct the user to PDF instead of silently truncating content.
7. Volume and flow remain available, with explicit limits.
8. Pipe thermal expansion uses sourced copper/stainless coefficients and temperature bounds, preserving contraction signs.
9. Lucide SVG icons replace emoji-dependent arrows; compare and conversion have distinct symbols.
10. Browser checks cover alignment, touch controls, themes, localisation, storage, reports and offline behaviour. Screenshots are also inspected; browser emulation is not a physical-device claim.
11. A separate Netlify project deploys the persistent `beta` branch. The owner configured the CNAME; public DNS and HTTPS 200 were confirmed on 26 September 2026. Stable `main` remains unchanged.
12. [ROADMAP.md](ROADMAP.md) retains external and unsupported work explicitly.

## Additional roadmap progress

- 29 newly sourced ASHRAE safety groups: 228 known of 249, with 21 still unresolved. Dataset `2026-09-26.3bbc1ce9b0a5`, 48 sources.
- Optional bounded T/s/v guides on all 113 existing P–h models. Independent validation checked 11,229 withheld midpoints with a maximum 1.970 kJ/kg source-model difference. This does not extend the cycle solver's domain or claim a complete manufacturer chart.
- Straight-pipe Darcy–Weisbach pressure loss with explicit fluid properties, laminar/turbulent branches and a blocked transition region. No two-phase flow, fittings, oil return or refrigerant sizing recommendation.
- Capacitor 8.5.2 iOS and Android projects generated and synchronised. Native compilation, signing, device tests and store release remain unperformed because the required toolchains are absent.
- Practical pilot scripts and regulatory review forms prepared. They do not count as completed pilots or qualified approval.

## Verification evidence

- ESLint, TypeScript (also part of the production build), data validation and production build pass.
- Unit suite: 206 tests pass across 20 files.
- Browser suite: 166/166 pass across desktop/mobile Chromium and WebKit. Affected light/dark screenshots were inspected, including aligned filters and the bounded guide chart.
- Independent guide validation evidence: `data/ph/isoline-validation.json`.
- PWA precache: 34 entries, about 6.03 MiB total. The largest individual JavaScript asset is about 3.55 MB and remains below the configured 6 MiB per-file ceiling. Vite's large-chunk warning remains; offline coverage is verified by browser tests.
- Native `cap add ios`, `cap add android` and `cap sync` succeeded; no native binary was built.
- Production baseline before publication: `1ff0dce5367596758150f426c0f7de46005a59c6`.

Initial browser runs found stale test expectations after localisation and a JSON download timeout on mobile Chromium. Numeric assertions now distinguish displayed locale formatting from exact exported values; downloads use an attached anchor with delayed object-URL revocation. Visual inspection also caught label alignment missed by the input-only assertion; both are now checked.

See [feedback](FEEDBACK-2026-09-26.md), [roadmap](ROADMAP.md), [beta workflow](BETA-RELEASE-WORKFLOW.md) and [release gates](RELEASE-GATES.md).
