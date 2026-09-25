# Preview data enrichment audit

Reviewed 26 September 2026 for `feature/tools-data-preview`. This tranche fills 34 missing facts on 33 existing refrigerants. It adds no refrigerants and makes no claim of exhaustive coverage.

## Coverage change

| Canonical measure          | Before | After |
| -------------------------- | -----: | ----: |
| Refrigerants               |    249 |   249 |
| Source records             |     43 |    47 |
| Recorded safety group      |    167 |   199 |
| Missing safety group       |     82 |    50 |
| Critical temperature       |     63 |    64 |
| Critical absolute pressure |     64 |    65 |

P–T and log(p)–h model coverage is unchanged. Added critical constants do not create a thermodynamic model or extend an existing model's valid range. Oil and ignition properties remain unchanged.

## Source and reuse review

- **Department of Climate Change, Energy, the Environment and Water (DCCEEW). 2024. [Hydrofluorocarbon refrigerants – global warming potential values and safety classifications](https://www.dcceew.gov.au/environment/protection/ozone/rac/global-warming-potential-values-hfc-refrigerants).** Adapted selected safety-classification facts only, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), following the department's [copyright notice](https://www.dcceew.gov.au/about/copyright). The page was updated 13 December 2024 and checked 26 September 2026. No third-party copyright restriction is attached to these selected table facts. No logos, page prose or complete tables are included. The department uses AS/NZS ISO 817:2016 where available and other reputable classification sources otherwise; the database's existing `ashrae_safety_group` field stores the shared group notation, not a claim that every value was extracted directly from ASHRAE. The source is general reference and asks users to independently verify classifications.
- **US Environmental Protection Agency. [SNAP refrigerated transport](https://www.epa.gov/snap/substitutes-refrigerated-transport)** and **[SNAP residential air conditioning](https://www.epa.gov/snap/substitutes-residential-and-light-commercial-air-conditioning-and-heat-pumps)**. Individual facts from the explicitly labelled safety-classification column only. No source prose or documents reproduced. [EPA's copyright conditions](https://www.epa.gov/web-policies-and-procedures/epa-disclaimers) vary by document; this review does not assert a blanket public-domain licence for everything hosted by EPA.
- **Chemours. [Opteon XP10 (R513A), thermodynamic properties, SI units](https://www.opteon.com/en/-/media/files/opteon/opteon-xp10-thermo-properties-si.pdf?rev=c5f4087c1e8c4d4f8c2922151995eee2), page 1.** Two attributed numerical product facts only. No table series, diagram, equations of state or REFPROP implementation is copied. This bulletin cites REFPROP 9.1 with Chemours interaction parameters; its values are manufacturer-model values.

Source titles, links, scope, review dates and reuse statements are also stored in `data/sources.csv` and appear with the corresponding facts. The DCCEEW material remains CC BY 4.0; the application's MIT licence does not replace it. ASHRAE handbook/standard content was considered during research but is not an imported source in this tranche.

## Fact checks

DCCEEW supplied 26 previously missing groups: R407D/E/G, R410B, R417C, R419B, R422E, R423A, R424A, R425A, R426A, R428A, R429A, R430A, R431A, R435A, R439A, R445A, R446A, R447A, R451A/B, R453A, R458A, R512A and R515A. Entries were matched by exact R designation. Safety groups were not inferred from blend ingredients.

EPA supplied R406A (A2), R414A (A1), R414B (A1), R416A (A1), R480A (A1) and R441A (A3). R480A is the exact designated blend, not an older or similarly named product formulation. All US use decisions, retrofit permissions, GWP figures and application categories were excluded.

R513A's critical temperature is 96.5 °C. Its 3765.7 kPa absolute critical pressure converts to **37.657 bar absolute**. The bulletin's boiling-point figure differs from the existing BITZER value; the existing value and its attribution are retained. Neither value is promoted into a legal GWP or a new P–T calculation source.

The DCCEEW composition columns contain discrepancies, including the R440A ingredient naming and some other blend rows. No composition facts were imported from this source. R440A is withheld from this tranche pending a separate source check. Missing pure-fluid classifications such as R41, R141b and R365MFC remain unknown; blanks and `n/a` are not interpreted as A1. The unresolved R485A classification remains withheld.

## Reproducibility and validation

The facts are appended to the existing `data/staging/property-composition-supplement.json`, which is already applied by `data/import_coolprop.py`. No importer, schema or data-build changes are required. `data/staging/preview-data-audit.json` records the reviewed additions and before/after counts; it is an audit manifest, not a second import input.

- `pnpm data:validate`: passed, 249 refrigerants and 47 sources.
- `pnpm exec vitest run packages/refrigerant-data/src/preview-data.test.ts`: four tests passed, covering canonical/overlay agreement, exact attribution, distinct safety groups, withheld classifications, and absolute-pressure conversion while preserving the prior boiling-point source.
- A field-level comparison against the pre-tranche CSV confirmed that only safety classification/status/source fields, R513A critical constants/source, fact attribution and review dates changed. Identifiers, recipes, legal classifications, GWPs, oil notes, aliases and model support were unchanged.

Dataset generation is owned by the preview coordinator and must run after all source changes are integrated. No production deployment is authorised by this audit.

## Remaining work

Fifty refrigerants still lack a supported safety group. Manufacturer-specific oil guidance, ignition properties, and many physical constants remain incomplete. Those need separate source and condition checks; a safety group alone does not establish installation suitability. No new designation was added merely to increase the inventory count.
