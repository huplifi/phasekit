# Refrigerant designation staging and source limits

`data/staging/epa-inventory.json` is a **US EPA designation supplement**. It is not an ASHRAE Standard 34 import and does not establish a complete inventory of known refrigerants.

The public [ASHRAE refrigerant designations page](https://www.ashrae.org/technical-resources/standards-and-guidelines/ashrae-refrigerant-designations) states that ASHRAE publication/IP content may not be entered into an AI tool or used to create AI derivative works without written permission. No designations, composition table, safety classifications, or prose were ingested from that page or its addenda. Any future import from ASHRAE needs an authorised source and documented reuse rights.

## Staged sources and denominator

Checked 2026-09-25:

| Public source | Source version | R-designated rows in source | Staged contribution |
| --- | --- | ---: | ---: |
| [US EPA SNAP blend compositions](https://www.epa.gov/snap/compositions-refrigerant-blends) | Page updated 2026-03-30 | 44 | 44 blends with mass fractions |
| [US EPA Technology Transitions GWP reference table](https://www.epa.gov/hfcs/technology-transitions-gwp-reference-table) | Page updated 2026-04-02 | 37 | 27 additional identities; 10 overlap |
| **Union** | | | **71 unique designations** |

The 44-row count includes only `R-`-designated blend rows on the EPA composition page, excluding unnumbered trade products. The 37-row count includes only `R-`-designated rows on the EPA GWP page. These denominators describe those two EPA pages, not the ASHRAE universe. CoolProp and other data sources may already contain some or all staged designations; reconcile by canonical ID and preserve provenance before import.

The [EPA data license](https://edg.epa.gov/epa_data_license.html) states that EPA data are generally public domain unless otherwise specified. The staged records are factual designation/composition extracts with direct source URLs, source date and reuse note; no page prose is copied into product copy.

## Import rule

`components: []` means composition was **not supplied by the staged source**. `name: null` and `safetyGroup: null` likewise mean unavailable, not “none” or an assumed safety rating. The GWP reference table contributes identities only: its US-rule GWP values must never overwrite EU 2024/573 Annex I/II/VI GWP facts. A legal calculation must remain blocked until its required EU-basis facts and component composition are independently established.

Mass fractions in the 44 composition entries sum to one and preserve the EPA-listed component ratios. They still require a separate legal classification and traceable EU GWP basis. In particular, R513A is staged as 44% R134a and 56% R1234yf; the EU Annex VI weighted result is a separate rules/data calculation, not a value imported from the EPA GWP table.

Coverage gaps remain: newer or historical refrigerants absent from these EPA tables; refrigerants designated by other authorities; safety groups; thermodynamic properties; and legal approval/application status. The product must not describe this staging file or an import based on it as “all known refrigerants”.
