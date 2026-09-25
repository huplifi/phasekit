# PhaseKit — second feedback round, 25 September 2026

This is a historical implementation record. Current behaviour and later changes are described in VERIFICATION.md.

## Objective and acceptance

Broader source-backed data is the primary deliverable. Implement the interface fixes and three unfinished calculators with offline support while preserving favourites, backups and saved calculations.

1. **Data:** expand ODP, safety, flammability, oil and thermodynamic facts, verified blend recipes and EU component classifications. Add field-specific attribution. R514A at 26 kg is a named regression case. Do not guess missing facts; record before/after coverage and outstanding gaps.
2. **Tool workflow:** keep Tools visible. Put search and favourites inside each calculator. Changing refrigerants preserves measurements and invalidates old results. Selecting a refrigerant and favouriting it are separate actions. Allow comparison selection from Tools and from a refrigerant detail page.
3. **Detail view:** chemical subscripts, a filled favourite star without a dark outline, and a fourth Restrictions tab. Use compact, filterable restrictions with neutral date/status typography and one disclosure icon. The user's four-tab decision supersedes the original three-tab scope.
4. **Calculators:** bidirectional P–T with bubble/dew and explicit absolute/gauge pressure; SH from dew and SC from bubble; kg ↔ t CO₂e with a visible selected GWP basis. Providers must be versioned, available offline and validated within declared domains. Do not extrapolate.
5. **Verification:** unit/integration tests, saved-snapshot preservation, CSV validation, lint, typecheck and build; mobile/desktop, both languages, both themes, keyboard, axe, enlarged text and offline cold starts. Verify the production build in a browser.
6. **Native packaging later:** retain Capacitor compatibility. Store submission, developer accounts, signing identities and temporary native iOS installation are separate work.

## Historical ownership and integration

- Coordinator: plan, shared contracts, routing, calculator UI, data-gap messages, integration and final checks.
- Data agent: canonical CSV, sources/imports, field attribution, schemas/build and coverage.
- Thermodynamics agent: offline P–T data/provider, calculation functions and tests, using dedicated `data/pt` and `core/generated` paths.
- UI agent: refrigerant picker, comparison, four detail tabs, chemical formulas and favourites.

Agree shared contracts before parallel changes, with one writer per file. Integrate data/providers before the common production build. Do not rewrite build output during browser tests or disturb the user's existing browser calculations; use isolated test contexts.

## Starting state and accepted refinements

The initial inventory had 205 records, 44 verified blend recipes and 21 verified safety classes. The P–T provider was a stub and three tools were marked as upcoming. There was no Git checkout. Preserve original design and handoff files.

Remove redundant home-page navigation text and emphasise the all-refrigerants action. Move repeated source/review metadata into disclosures. Keep the picker closed initially, even when no fluid is selected; show favourites and results inside the opened picker. Present the selection compactly. Favourite-removal undo uses the red status colour and expires after five seconds.

Language does not change the ruleset: the implemented region remains EU/Finland. Other countries require sourced rules and independent tests, not just a region selector. Default to a verified EU GWP basis under either 2024/573 or 2024/590. Charge and unit fields have equal heights. Shared information buttons explain equipment, assessment date, GWP basis and region, with touch, keyboard, Escape and outside-dismissal support.

## Recorded outcome

Interface corrections and all three calculators were implemented. At this stage, 137 unit/integration and 38 mobile/desktop browser cases passed. Six targeted browser cases passed after the final GWP result-row change. Lint, typecheck and CSV validation passed. An already-open PWA updates through its own prompt.

Coverage reached 142 verified blend recipes, 134 safety classes, 128 ODP facts and 121 oil notes. Offline P–T supported 122 records. The 205-record source union was not proof of worldwide inventory or property completeness; flammability and ignition facts remained particularly sparse. Native packages and physical-device testing were deferred.

The final logo mapping follows the user's correction: the light asset on the light theme, the dark asset on the dark theme, for both header and favicon. Both SVGs were verified offline.
