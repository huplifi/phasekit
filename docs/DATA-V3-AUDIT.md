# Inventory v3 source audit

Reviewed 2026-09-25 against the canonical CSVs. This is a spot-check of the new tranche, not a certification of every entry or a claim that the 249-record source union contains all refrigerants.

## Recipe and designation checks

The canonical dataset has 249 records, including 183 blends. Validation uses decimal arithmetic to require **exactly 100%** for every verified mass recipe. The 41 new blend recipes are field-attributed to their [UNEP Ozone Secretariat live list](https://ozone.unep.org/lists-substances-and-blends), [TEAP May 2025 table 6.1](https://ozone.unep.org/system/files/documents/TEAP-May2025-Progress-Report-vol1.pdf), or [TEAP May 2026 table 6.1](https://ozone.unep.org/system/files/documents/TEAP-May2026-Progress-Report-vol1.pdf). Source GWP numbers were not imported into EU legal fields.

| Spot-check | Source-listed mass composition | Canonical component IDs and fractions | Finding |
| --- | --- | --- | --- |
| R405A, historical list | R22/R142b/R152a/RC318 = 45/5.5/7/42.5 | `r22 .45; r142b .055; r152a .07; rc318 .425` | Matches |
| R466A, historical list | R32/R125/R13I1 = 49/11.5/39.5 | `r32 .49; r125 .115; r13i1 .395` | Matches |
| R486A, TEAP 2025 p60 | R1234yf/R134a/R13I1/R1234ze(E) = 21.9/6.3/38/33.8 | `r1234yf .219; r134a .063; r13i1 .38; r1234zee .338` | Matches |
| R493C, TEAP 2025 p61 | R290/R600a/R600 = 15.1/28.3/56.6 | `r290 .151; r600a .283; r600 .566` | Matches |
| R496A, TEAP 2026 p80 | R14/R23/R116 = 18/37.8/44.2 | `r14 .18; r23 .378; r116 .442` | Matches |
| R4101A, TEAP 2026 p80 | R32/R152a/R13I1 = 11/30.5/58.5 | `r32 .11; r152a .305; r13i1 .585` | Matches |
| R4102A, TEAP 2026 p80 | R134a/R1234ze(E)/R1233zd(E) = 10/60/30 | `r134a .1; r1234zee .6; r1233zde .3` | Matches |
| R4103A, TEAP 2026 p80 | R32/R152a/R13I1/R1234ze(E) = 10/22/17/51 | `r32 .1; r152a .22; r13i1 .17; r1234zee .51` | Matches |

The staged candidate file also validates every new component reference and exact mass sum. R507C resolves to an attributed historical alias of R507A, as the Secretariat lists the same 50/50 R125/R143a composition and names. These checks do not turn the source's blend GWP into a 2024/573 Annex VI value.

## Three new pure ingredients

| ID | Identity check | Source |
| --- | --- | --- |
| R31 | CH2FCl, CAS 593-70-4; EPA calls it HCFC-31 / monochlorofluoromethane, and the EU lists it as HCFC-31. | [EPA ODS table](https://www.epa.gov/ozone-layer-protection/ozone-depleting-substances); [EU 2024/590 Annex I](https://faolex.fao.org/docs/pdf/eur228346.pdf), PDF p30 |
| R13I1 | CF3I, CAS 2314-97-8, trifluoroiodomethane. CoolProp's pinned fluid file agrees with the EPA identity table. | [Pinned CoolProp file](https://github.com/CoolProp/CoolProp/blob/afce86ff977552663ca3a78d8ea318cc64dcbdfd/dev/fluids/R13I1.json); [EPA rule](https://www.epa.gov/system/files/documents/2024-04/ghgrp-final-preamble-and-rule-april-2024.pdf) |
| RC318 | Cyclic C4F8, CAS 115-25-3, octafluorocyclobutane. CoolProp identity agrees with EU PFC-c-318. | [Pinned CoolProp file](https://github.com/CoolProp/CoolProp/blob/afce86ff977552663ca3a78d8ea318cc64dcbdfd/dev/fluids/RC318.json); [EU 2024/573 Annex I](https://faolex.fao.org/docs/pdf/eur228342.pdf), PDF p49 |

The audit found and fixed two missed legal mappings: R31 is 2024/590 Annex I HCFC (ODP 0.020, GWP100 79.4); RC318 is 2024/573 Annex I PFC (GWP100 10,200, AR6). Their facts now use the correct legal field and source. This raises source-backed EU legal class coverage to 47 of 66 records marked `pure` and 161 of 183 blends by component; the importer keeps the legal overlay in [`inventory-v3-legal.json`](../data/staging/inventory-v3-legal.json).

## Name and fact attribution

All 66 records marked `pure` now have a non-code display name and a precise `fact_source_ids_json.chemical_name` source. Forty-five names use designation/CAS-checked EU, EPA, NIST or manufacturer overlays; the other 21 derive from pinned CoolProp `INFO.NAME` or the specific manufacturer row. The audit replaced RE143a's code-like `HFE143m` name with [NIST's CAS-matched “methyl trifluoromethyl ether”](https://pubs.acs.org/doi/10.1021/acs.iecr.2c01427). This name-source mapping is distinct from formula, safety, oil and legal fact sources.

R729 (air) is retained as a CoolProp **pseudo-pure model** under the present `kind=pure` field; it is chemically a mixture and no fixed mass recipe is claimed. The 66 count therefore means records marked `pure`, not 66 chemically pure substances. R13I1 and R40 occur in [EU 2024/590 Annex II](https://faolex.fao.org/docs/pdf/eur228346.pdf), a separate ODS legal class unsupported by the current calculation model; they remain legally unclassified. R485A's safety class is withheld because TEAP sources do not agree on an unconditional class. Many ignition/LFL, oil, PED and other properties remain unknown or model-specific; a safety class does not fill them by inference.
