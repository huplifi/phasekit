# PhaseKit P–T coverage audit

**Snapshot:** `pt-2026-09-30.fb555ea6f935452c`; CoolProp 7.2.0 (`98b3523d5daa98454618d381d2ae53f7471d216b`); generated 2026-09-30. This read-only audit covers all 249 canonical refrigerants. Full per-record data: [CSV](PT-RANGE-AUDIT.csv).

## Coverage and validation

The current dataset supports **134/249** records: 65/66 pure fluids and 69/183 blends. All supported records have bubble and dew branches. Model resolution: 59 CoolProp pure-fluid EOS, 6 upstream pure-fluid EOS JSON supplement, 4 designation-specific pseudo-pure EOS, 61 CoolProp predefined mixture, 4 explicit-composition HEOS blend. 115 records remain unsupported: 1 pure fluid and 114 blends. Unsupported means no exact runtime pure model, pinned supplemental EOS, predefined mixture, or explicit composition recipe was available; it does not imply that the refrigerant lacks saturation properties.

The matching held-out validation snapshot covers 68028 checks with 0 failed source evaluations. Worst relative pressure error is 0.1294% at r431a:bubble:-171.33374C; worst inverse-temperature error is 0.03651 °C at r436a:dew:111.90879C. The data, coverage manifest, and validator report all carry `pt-2026-09-30.fb555ea6f935452c`.

## Added EOS coverage

The pinned upstream supplement adds **six pure-fluid models**: R1123, R1130(E), R1132a, R1132(E), R1224YDZ, R1336mzz(Z). Each JSON file hash matches `data/coolprop-supplement/manifest.json`; source commit `afce86ff977552663ca3a78d8ea318cc64dcbdfd`; runtime CoolProp 7.2.0 / `98b3523d5daa98454618d381d2ae53f7471d216b`; license [MIT](../licenses/CoolProp-MIT.txt). The manifest records one EOS reference for each fluid. These rows now have numerical P–T coverage; the file hashes and version bindings are in the manifest and CSV artifact.

Four blend records now use explicit component mass recipes from the UNEP Ozone Secretariat report, converted to mole fractions using component molar masses: **R452B, R454C, R455A, and R513B**. The mass and mole fractions each sum to 1. The generator uses only built-in HEOS binary interaction parameters; the recipe manifest records each pair and policy. These are composition-derived HEOS mixture models, not designation-specific pseudo-pure EOS.

## Refreshed canonical source facts

| Refrigerant | Updated fact(s) | P–T/model result |
|---|---|---|
| R407C | Tc 86.03 °C; Pc 46.29 bar(a). | Model Tc 86.195 °C; dew endpoint 83.195 °C. |
| R410A | Tc 71.36 °C; Pc 49.02 bar(a). | Model Tc 71.344 °C; dew endpoint 68.344 °C. |
| R515B | Tc 108.7 °C; Pc 35.8 bar(a). | PT unsupported; canonical property does not create an EOS. |
| R455A | Tc 85.6 °C; critical pressure left blank (conflicting source figure excluded). | No scalar model Tcrit; dew endpoint 72.411 °C; gap to source Tc 13.19 K. |
| R1132(E) | Physical triple point -88.25 °C (NIST-hosted manuscript cites 184.9 K). | Supplement model Tmin -33.15 °C; curve begins -32.15 °C, 55.10 K warmer than physical triple point. |
| R1123 | Normal boiling point -61.239 °C (211.911 K, NIST-hosted paper). | Upstream EOS supplement provides a P–T curve; curve starts -77.00 °C. |

Attribution: Honeywell product information supplies the R407C and R410A critical values; the R515B metric TDS supplies 108.7 °C / 35.8 bar; the R455A TDS supplies 85.6 °C critical temperature only. R455A critical pressure stays blank because the source review excluded a conflicting figure. NIST-hosted papers support R1132(E)’s physical triple point and R1123’s normal boiling point. R515B remains PT-unsupported despite its updated properties.

R407C model Tc is 86.195 °C versus source 86.03 °C (+0.165 K); R410A model Tc is 71.344 °C versus source 71.36 °C (−0.016 K). R455A’s explicit-mixture model has no scalar CoolProp mixture Tcrit; its 72.411 °C dew endpoint is numerical coverage, not a physical limit, 13.19 K below the source critical temperature. R452B’s bubble curve ends at 52.647 °C while its dew curve reaches 67.647 °C; the 15 K side-specific gap is preserved as solver coverage and not bridged.

R410A remains covered at 56 °C on both sides. The shipped log-pressure interpolation there is 35.084 bar(a) dew / 35.165 bar(a) bubble; the Chemours SI table reports 34.931 / 35.033 bar(a), respectively (about 0.44% / 0.38% lower; Table 1, printed p. 6 / PDF p. 5). See [Chemours SI table](https://www.chemours.com/en/-/media/files/freon/freon-410a-si-thermodynamic-properties.pdf).

## Coverage boundary interpretation

CoolProp `Tmin`, `Ttriple`, `Tmax`, and `Tcrit` are equation-of-state metadata. Canonical refrigerant triple/critical values are recorded separately. For known model critical temperatures, the generator stops at a conservative margin below Tc. For models without scalar Tc, generated endpoints remain solver/model coverage only. A curve endpoint alone does not prove the physical phase boundary.

The generator selects one widest validated continuous interval per side; it can omit disconnected valid islands but cannot connect across a solver-failed interval. Nine observed failures remain version-pinned with ±5 K numerical guards. All are listed in `data/pt/solver-failures.json` and checked against emitted side ranges.

Blend bubble and dew temperature extents can differ because each side is validated independently. The per-record audit includes each side’s temperature/pressure endpoints, bounds, endpoint differences, explicit recipe provenance, and solver-exclusion status.

## Integrated beta.9 verification

The complete model chain uses this P–T snapshot: 131 p–h grids (34,433 checks, no source failures, maximum error 1.896 kJ/kg) and 131 guide-curve sets (13,031 midpoint checks, maximum error 1.970 kJ/kg). These error checks measure interpolation against the source model, not real-world accuracy. The runtime rejects version mismatches between P–T, p–h and isoline datasets.

All 424 unit tests, TypeScript, ESLint, canonical data validation and the production build passed. Browser regression results and the release deployment are recorded on the beta.9 pull request. Physical iPhone validation remains a separate user check.
