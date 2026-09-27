# Beta round two — refrigerant data completion

Reviewed 2026-09-26 · generated data version `2026-09-26.fffbb55a5c7e`.

## Changes

- R-437A now has an IPCC AR4 GWP of **1,639** and the sourced trade alias **Freon MO49**. These come from Chemours' [Refrigerant Expert user guide](https://www.chemours.com/en/-/media/files/freon/chemours-refrigerant-expert-tool-user-guidelines.pdf?rev=5ebd12c5810640a8a9b0cd776a5e8f12), whose refrigerant list identifies R-437A and labels the AR4 value. The alias is attributed to Chemours.
- R-717 now has a lower flammability limit of **15.4 vol%** and autoignition temperature of **651 °C**, from Section 9 of Linde's [anhydrous ammonia R-717 safety data sheet](https://static.prd.echannel.linde.com/wcsstore/LT_REN_Industrial_Gas_Store/pdf/SDS_LT/EN/Ammonia_anhydrous_R717_2.1_ENLT_tcm619-456579.pdf). Linde labels both as experimental/key-study values. The SDS does not specify test temperature for these figures, so no conditions were added.
- Refrigerant detail now describes a blend as having no single chemical name and marks its molecular formula as not applicable. Pure refrigerants with missing names or formulae remain unknown. Coverage reports now separate unknown applicable fields from fields that do not apply to blends.

R-437A's verified mass composition is already supported by the [UNEP Ozone Secretariat report](https://ozone.unep.org/system/files/documents/OEWG-47-INF-3-Rev-1.pdf): R-125 19.5%, R-134a 78.5%, R-600 1.4%, and R-601 0.6% by mass. The blend formula was not derived from these ingredients. The report's source note distinguishes its recipe evidence from legal GWP evidence.

## Search limits and remaining R-437A unknowns

I checked the Chemours refrigerant guide and product material, Honeywell's refrigerant application material, and the [US EPA SNAP listing](https://www.epa.gov/snap/substitutes-residential-and-light-commercial-air-conditioning-and-heat-pumps). The Chemours source gives the R-437A AR4 value and name, while the EPA page gives its US-program GWP and product identifiers without a matching AR4 basis. That US-program GWP was not substituted for an AR4 or EU value. These sources did not provide a supported R-437A critical temperature or critical pressure, so those remain unknown.

For R-437A, the remaining unknown applicable fields include PED fluid group, EU regulatory class/GWP, critical temperature and pressure, triple point, normal density, lower flammability limit, and autoignition temperature. Its single chemical name, molecular formula, and CAS number are not applicable to the blend as a whole. P–T and P–h calculation support are also unavailable for R-437A. No mixture formula or unsupported property value was inferred.

## Dataset coverage

The generated inventory contains 249 records. Current coverage is:

| Area                   |                        Covered |    Partial or unsupported |
| ---------------------- | -----------------------------: | ------------------------: |
| Identity               |                   249 verified |                 0 partial |
| Composition            | 249 verified or not applicable |                 0 partial |
| Safety group           |                   228 verified |                21 partial |
| EU/FI regulatory class |                   208 verified | 41 partial or unsupported |
| P–T curves             |                124 model-based |           125 unsupported |
| P–h grids              |                113 model-based |           136 unsupported |

The inventory is a deduplicated source union, not a complete ASHRAE Standard 34 catalogue. Blank applicable fields mean unknown. Model-based curves are separate from unsupported calculations. See the generated [coverage report](COVERAGE.md) for per-record unknown and not-applicable fields.

## Validation

`pnpm data:validate` passed for 249 refrigerants and 50 sources. `pnpm data:build` regenerated the dataset and coverage outputs. The refrigerant-data test run passed: 21 files and 210 tests.
