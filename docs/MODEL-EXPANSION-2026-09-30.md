# PhaseKit PT/PH coverage expansion evidence

Luna (max) performed this independent source/model review; the ten candidate models below are integrated in beta.9. Runtime: CoolProp 7.2.0, git revision `98b3523d5daa98454618d381d2ae53f7471d216b`. The six upstream pure-fluid files are from CoolProp commit `afce86ff977552663ca3a78d8ea318cc64dcbdfd`; all loaded successfully into the 7.2 HEOS runtime through `add_fluids_as_JSON("HEOS", [fluid])`.

## Six pure-fluid sample vectors

At 20.00 °C, Q=0 and Q=1 have equal pressure for pure fluids. Enthalpy units are J/kg. The final column is Hmass at P = 1.5 × Psat(Q=0), T = 293.15 K. These are deterministic model vectors for generator/loader regression, not measured values.

| Fluid | Psat, Pa | h(Q=0) | h(Q=1) | Hmass(P,T) |
|---|---:|---:|---:|---:|
| R1123 | 1,872,476.34 | 231,083.014 | 377,243.383 | 230,485.215 |
| R1130(E) | 36,453.19 | 223,371.591 | 525,126.894 | 223,380.163 |
| R1132a | 3,594,719.17 | 242,305.893 | 336,994.059 | 234,457.212 |
| R1132(E) | 1,453,032.71 | 236,023.358 | 458,747.915 | 235,866.645 |
| R1224yd(Z) | 123,047.088 | 222,428.292 | 389,379.623 | 222,447.005 |
| R1336mzz(Z) | 60,232.485 | 223,809.250 | 394,545.674 | 223,819.119 |

SHA-256 of exact upstream JSON payloads:

| File / CoolProp INFO.NAME | SHA-256 |
|---|---|
| `R1123.json` / R1123 | `b015c9e2b9a0b6e60cdc8e9331506507080ba0dc363da5cd969ce6d183cf6afd` |
| `R1130(E).json` / R1130(E) | `c0d3df88247742b0887ce6f91162e3ba794167ff385d98551847adefec3a79dc` |
| `R1132a.json` / R1132a | `9e9da96eaf79c756c8acc7ee50eca6cc2f671339bedd1bd24f51dfe13dabb0d5` |
| `R1132(E).json` / R1132(E) | `65727bd385167e5a1a7a587f0331058a2139dd866d3b3966fc36debb6d5be7fc` |
| `R1224yd(Z).json` / R1224YDZ | `56109aad8d5a45281616adc0201718de9aa03e164c46dfe8c1728bc502ceb1d3` |
| `R1336mzz(Z).json` / R1336mzz(Z) | `1f293dbb0e264ed90d0762d049826ccf25feea6e9fc996de52bb4a58dbc76a8f` |

Per-fluid EOS bibliography keys are stored in `data/coolprop-supplement/manifest.json` and match the upstream `CoolPropBibTeXLibrary.bib` at the pinned commit: `Akasaka-IJR-2020-R1123`; `Huber-IJT-2025-R1130E`; `Akasaka-IJT-2026-R1132a`; `Akasaka-IJT-2024-R1132E`; `Akasaka-IJT-2023-R1224ydZ`; `McLinden-JCED-2020-R1336mzzZ`.

## Blend checks at 20 °C

All calculations used canonical verified mass fractions from `data/components.csv`, set directly through `AbstractState.set_mass_fractions`; CoolProp converted those to the listed mole fractions. Saturation pressure units are Pa; enthalpy units are J/kg. Hmass uses 1.5 × bubble pressure at 293.15 K.

| Blend | Canonical mass fractions | Derived mole fractions in component order | Psat bubble / dew (Pa) | Hmass(P,T) |
|---|---|---|---:|---:|
| R452B | R1234yf .26 / R125 .07 / R32 .67 | .144829320423 / .037049791728 / .818120887849 | 1,385,504.61 / 1,341,636.16 | 238,866.138 |
| R454C | R1234yf .785 / R32 .215 | .624850453425 / .375149546575 | 1,043,094.16 / 847,055.551 | 236,502.644 |
| R455A | R1234yf .755 / R32 .215 / R744 .03 | .578970450753 / .361416054623 / .059613494624 | 1,238,475.86 / 906,867.121 | 236,666.071 |
| R513B | R1234yf .585 / R134a .415 | .557755201004 / .442244798996 | 613,511.523 / 613,507.232 | 229,312.627 |

R455A was checked against Honeywell's Solstice L40X (R-455A) TDS, which states composition 75.5/21.5/3 R1234yf/R32/R744 and publishes pressure/temperature pairs. At 100 kPa the model gives bubble/dew −52.5407/−39.4717 °C versus Honeywell −52.30/−39.45 °C (errors −0.241/−0.022 °C). At 450 kPa the model gives −14.7066/−2.2293 °C versus −14.30/−2.16 °C (errors −0.407/−0.069 °C). The same TDS reports vapor pressure 1,042.2 kPa at 25 °C; the model gives Q=1 pressure 1,046.188 kPa at 25 °C (+0.38%), while Q=0 is 1,404.022 kPa. The sheet's scalar “vapor pressure” is not phase-labelled, so the comparison to Q=1 is a close plausibility check rather than an exact phase-to-phase specification. Manufacturer source: https://www.honeywell-refrigerants.com/europe/wp-content/uploads/2016/10/Solstice_L40X_technical_datasheet.pdf (also indexed as the official Honeywell TDS).

Three blends stay unsupported because exact mixture initialization fails on missing binary pairs; no parameters were synthesized. R448A's CoolProp 7.2 predefined recipe exists, but both predefined and canonical-mass initialization fail for [29118-24-9, 354-33-6] (R1234ze(E)/R125). R515B and R515A fail for [29118-24-9, 431-89-0] (R1234ze(E)/R227ea). R452B, R454C, R455A, and R513B initialize using existing built-in HEOS pairs and return valid Q=0/Q=1 and Hmass(P,T) states.

## Independent physical checks

- R1130(E): the NIST 2025 EOS paper's Table 4 implementation vectors match the CoolProp-loaded JSON. At T=320 K and density 0.02 mol/dm³, model p=0.052290174 MPa and h=52,732.4121 J/mol versus published 0.05229 MPa and 52,732.4 J/mol. At 12.5 mol/dm³, model p=3.39671257 MPa and h=24,883.2814 J/mol versus 3.39671 MPa and 24,883.3 J/mol. Primary source: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=959344 .
- R1132a: experimental saturation data in the 2023 Perera et al. paper report 3.616 MPa at 293.40 K; the imported EOS gives 3.61534440 MPa (−0.018%). Primary source: https://pubmed.ncbi.nlm.nih.gov/37089911/ .
- R1123: NIST EOS fixed points are Tc=331.73 K, Pc=4.5488 MPa, triple=195.15 K, NBP=211.911 K; the imported EOS returns 331.729985 K, 4.548777 MPa, 195.15 K, 211.91078 K. Primary source: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=930091 .
- R1132(E): NIST EOS paper reports Tc=348.82 K, Pc=5.1737 MPa, NBP=220.51 K and physical triple=184.9 K. The imported EOS returns Tc=348.82 K, Pc=5.173676 MPa, NBP=220.5125 K. The model's `Tmin`/`Ttriple` is 240 K, the EOS validity lower bound; keep generated coverage above 240 K and don't label this model bound as the physical triple point. Primary source: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=958728 .
- R1224yd(Z): independently measured critical values are Tc=428.69±0.02 K and Pc=3.331±0.003 MPa; the model returns 428.6900 K and 3.334038 MPa. Primary measurement source: https://trc.nist.gov/ThermoML/10.1021/acs.jced.9b00374.html .
- R1336mzz(Z): Chemours Opteon MZ TDS says NBP 33.4 °C, Tc=171.3 °C, Pc=2.9 MPa and vapor pressure at 25 °C=0.07 MPa; model returns 33.453 °C, 171.350 °C, 2.90371 MPa and 0.073561 MPa. The pressure comparison is at the one-significant-digit precision shown in the TDS. Primary source: https://www.chemours.com/fr/-/media/files/opteon/opteon-mz-heat-transfer-fluid-technical-info.pdf?rev=007c975010bf470d8581cf8f447a9c61&sc_lang=fr .

## Read-only review of the new loader and generator path

- `data/coolprop_runtime.py` verifies runtime version/revision, every JSON SHA-256, fluid INFO.NAME, and CAS before loading. The PT, PH, isoline generators, and corresponding validators import the same loader. No edits are needed for the six exact pure EOS files.
- Explicit recipes are generated only from verified canonical component rows; fractions are set as mass fractions, and the full-precision derived mole fractions are used in the HEOS fluid string. Each recipe records component source IDs and the policy `built_in_HEOS_parameters_only`. I independently confirmed the resulting HEOS composition-string form resolves `Tmin` and both Q branches for all four candidate blends.
- The three missing-binary-pair blends fail at `AbstractState` initialization, so the bounded fallback to unsupported is correct and avoids guessing.
- Review finding resolved: the shared loader now uses explicit RuntimeError checks for runtime version, content hashes and identities, including under `python -O`.
- Bibliography keys are traceable to `CoolPropBibTeXLibrary.bib` at the pinned CoolProp source revision, but they are opaque IDs in PhaseKit's manifest. The new `sources.csv` row pins the upstream commit and file set, which is enough to reproduce the implementation; surfacing full paper citations would make the primary scientific provenance easier to inspect.

Reproduce the integrated checks with the generators and validators documented in [THERMODYNAMICS.md](THERMODYNAMICS.md) and [PH-THERMODYNAMICS.md](PH-THERMODYNAMICS.md).
