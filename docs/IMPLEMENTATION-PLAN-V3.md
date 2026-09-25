# PhaseKit — data content and readability, 25 September 2026

This is a historical implementation record. The later unified cycle form and mobile refinements supersede parts of this plan; see VERIFICATION.md.

## Objective

Remove internal field identifiers and repeated source metadata from the interface. Explain exactly which facts are missing and broaden sourced coverage. Never turn an unknown into zero or infer a chemical name from the molecular formula alone.

## Historical ownership

- Coordinator: integration, offline/footer behaviour, settings, shared contracts, tests and final coverage reporting.
- Data agent: canonical CSV, schemas/build, sourced names/classes/properties, structured oil codes and new-record integration.
- Inventory agent: source research and candidate staging, without editing canonical records.
- UI agent: detail view, search/filter controls, comparison explanations, localisation and shared presentation components.

## Acceptance

Localise family labels and order safety groups by flammability class (1, 2L, 2, 3, with A/B adjacent), with short explanations rather than an overall-risk ranking. A missing chemical name must be identified as such. Use Basic information and Restrictions as user-facing terms, removing the redundant overview restriction button.

Show readable GWP bases and one combined provenance disclosure per environmental section; select a verified EU basis for the overview when available. Present typical and possible oils as structured codes with expandable explanations and manufacturer guidance. Remove the routine offline-ready/version footer from each page; keep version/review dates in Settings and show actual offline status in the header.

All data additions need refrigerant- and field-specific attribution. Record coverage changes and remaining gaps. New identities do not automatically gain P–T or regulatory support. The source union does not establish a complete worldwide refrigerant inventory.

## Verification

Validate CSV, data tests, relevant regressions, lint, typecheck and build. After building, check mobile/desktop, Finnish/English, both themes, search/filters, the R142b name and ODS GWP, one environmental provenance disclosure, structured oil codes, offline reload and saved snapshots. Do not rebuild the tested output concurrently with browser checks.

## Ref Tools-inspired workflow

Use two directly editable P–T fields. The last-edited value is the calculation input and the other updates without a submit button. Refrigerant and phase-boundary changes preserve the input and recompute its counterpart. Unit controls sit beside field headings and convert the input. Unsupported or out-of-range input clears the derived value rather than showing a previous refrigerant's result. The originally planned temperature slider used the same offline provider; it was removed in the subsequent mobile feedback round. Display the assumed atmosphere beside gauge-pressure results.

Open refrigerant selection in a native modal dialog with search and All/Favourites filters. Keep the underlying calculator in place, allow favourite changes and return focus on closure. Support Escape and an explicit close button. The supplied Ref Tools screenshots are interaction references, not a source of copied calculation data.

## Log(p)–h and leak-check results

The original plan introduced a separate diagram tool; it was subsequently combined with SH/SC. Inputs are suction, hot-gas and liquid temperatures plus low and high pressures. Point 4 uses the disclosed isenthalpic assumption h4 = h3. Use PhaseKit SVG styling and the source-attributed CoolProp enthalpy model; do not copy Danfoss diagrams or datasets. Support is limited to validated offline domains, excluding unsupported, critical and ambiguous two-phase inputs. Calculate SH/SC without claiming COP or electrical power. Lines connecting measured points are schematic, not a simulation of the entire process path.

The thermodynamics agent owned enthalpy grids, interpolation, model validation and core tests; the data agent implemented the diagram view after its data audit; the coordinator handled routing/integration/browser checks. The UI agent improved the decisive CO₂e/mass quantity, refrigerant family and checkboxes in the leak-check view without changing the rule engine for that presentation work.

## Recorded outcome

V3 was integrated into a local production build with 249 refrigerants and 43 sources, P–T support for 124 and p–h support for 113. Field-specific gaps remain visible. Validation, lint, typecheck and 146 unit tests passed, as did 52 browser workflows and six targeted PH cases after the last chart adjustment. Screenshots were inspected. Current scope and remaining regulatory/native-device limits are documented in VERIFICATION.md.
