# PhaseKit implementation contract

25 September 2026. Existing design files and Graphics masters are preserved. No existing Git checkout was present. User supplied the original missing v2 packet at `PhaseKit-update-v2/` during initial inventory. Its templates, tokens, reference image and README have been read; templates are not accepted as verified data.

1. Versioned CSV dataset, validation, deterministic generation, provenance and coverage.
2. Independently documented EU/FI rule vectors before pure decimal engine; source gaps fail closed.
3. React app: search and detail first, local favourites and snapshots, comparison, FI/EN, themes.
4. PWA production build, mobile browser workflow, offline cold reload and accessibility.

Ownership: coordinator owns root configuration, apps/web, packages/i18n and packages/ui, integration and final verification. Data agent owns packages/refrigerant-data, data and contributor/coverage documentation. Rules agent owns packages/core except contracts.ts, packages/rulesets/eu-fi, legal interpretation and rule fixtures. Asset agent owns fonts/icons only. Shared contracts are coordinator-owned and changes are agreed by message.

Acceptance: lint, strict typecheck, independent boundary tests, production build, mobile workflows including offline and automated accessibility must pass. Native store release, physical-device installation and qualified regulatory sign-off are separate unverified gates; no claim of production approval until satisfied.
