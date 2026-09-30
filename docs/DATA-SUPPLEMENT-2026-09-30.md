# PhaseKit refrigerant fact supplement — evidence review

Checked 2026-09-30. The seven selected facts are integrated into canonical data for beta.9; per-field source attribution is retained. These seven previously blank critical-point fields cover four fluids.

## Added facts

| Refrigerant | Field | Exact manufacturer value | Source |
|---|---|---:|---|
| R407C | `critical_temp_c` | 86.03 °C | [Honeywell Genetron 407C](https://www.honeywell-refrigerants.com/europe/product/genetron-407c/)
| R407C | `critical_pressure_bar_abs` | 46.29 bar | [Honeywell Genetron 407C](https://www.honeywell-refrigerants.com/europe/product/genetron-407c/)
| R410A | `critical_temp_c` | 71.36 °C | [Honeywell Genetron AZ-20](https://www.honeywell-refrigerants.com/europe/product/genetron-az-20/)
| R410A | `critical_pressure_bar_abs` | 49.02 bar | [Honeywell Genetron AZ-20](https://www.honeywell-refrigerants.com/europe/product/genetron-az-20/)
| R515B | `critical_temp_c` | 108.7 °C | [Honeywell Europe Solstice N15 SI TDS](https://www.honeywell-refrigerants.com/europe/?document=solstice-n15-r-515b-tds&download=1)
| R515B | `critical_pressure_bar_abs` | 35.8 bar | [Honeywell Europe Solstice N15 SI TDS](https://www.honeywell-refrigerants.com/europe/?document=solstice-n15-r-515b-tds&download=1)
| R455A | `critical_temp_c` | 85.6 °C | [Honeywell Solstice L40X page](https://www.honeywell-refrigerants.com/europe/product/solstice-l40x/) and [TDS](https://www.honeywell-refrigerants.com/europe/wp-content/uploads/2016/10/Solstice_L40X_technical_datasheet.pdf)

The pages identify these as critical properties, but Honeywell’s pressure units say only “bar”, not “bar abs”. Critical pressure is an absolute thermodynamic property, so the `critical_pressure_bar_abs` mapping is the schema-compatible interpretation; there is no numeric conversion. Preserve this note with the source record. R515B values use the new source ID `honeywell-r515b-metric-2026` for the Honeywell Europe SI TDS. Preserve the existing `honeywell-r515b-tds` source unchanged: its URL points to a separate US/imperial sheet. Source rows and per-field mappings are retained in the canonical CSV files.

## Source checks and limits

- R410A cross-check: Chemours’ [Opteon XL41 PUSH bulletin](https://www.chemours.com/en/-/media/files/opteon/o-xl41pb-opteon-xl41-push-bulletin.pdf?rev=4e30be51deac4ce2900c596177a2e59f) reports 71.35 °C and 4901.7 kPa absolute (49.017 bar), based on NIST Standard Database 23, Version 10.0. Honeywell reports 71.36 °C / 49.02 bar. These are close but not identical at source precision. The catalogue keeps Honeywell’s reported pair and does not average sources.
- R452B excluded: Honeywell’s L41Y product page gives critical temperature 77.1 °C and critical pressure 52.2 bar, while its storage/handling technical brochure lists R-452B critical temperature as 79.7 °C. Leave both critical fields blank pending revision resolution.
- R404A excluded: Honeywell’s live product page reports 72.05 °C / 37.29 bar, while its 2013 TDS reports 72.2 °C / 3668.6 kPa absolute. Both critical fields remain blank pending revision/model resolution.
- R448A excluded: one live Honeywell product page reports 83.7 °C / 46.6 bar, while a Honeywell N40 TDS extract reports 180.8 °F / 666.4 psia (about 82.67 °C / 45.95 bar). A separate Honeywell TDS extract agrees with the page; resolve the exact TDS revision before using either pair.
- R454B excluded: Honeywell’s live page reports Tc 77.0 °C, its TDS says 78.1 °C / 52.7 bar, and Chemours’ current XL41 bulletin says 78.10 °C / 5285.0 kPa absolute. There is an unresolved Tc and Pc source conflict.
- R455A Pc excluded: Honeywell TDS assets are revision-sensitive. The live product page and some indexed TDS copies report 46.6 bar, while a separate TDS download asset reports 46.5 bar. Keep Pc blank until the exact active revision is resolved. Tc 85.6 °C agrees across sources.

The additions use manufacturer factual extracts with attribution. They do not reproduce source tables, import bulk property data, add legal/PED classifications, or infer equipment approval. Canonical records retain source scope, check dates and per-field source bindings.

## Integration

R455A critical temperature cites the technical data sheet only in the canonical record. The imperial R515B source is unchanged; the new metric source is separate. Critical properties are source-specific catalogue facts, not the bounds of the numerical calculation model. Conflicted fields listed above remain unknown.

## NIST refrigerant point facts

Checked 2026-09-30. Two additional facts were verified against the NIST-hosted papers and integrated into the canonical records.

- **R1132(E) physical triple point:** Table 1, PDF page 4 (printed page 5), reports `Ttp = 184.9 K` and cites Tomassetti et al. [8]. Converted value: `184.9 − 273.15 = −88.25 °C`. Source: [NIST PDF, pub_id 958728](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=958728). This is the physical point. The paper separately states its EOS applicability starts at 240 K (PDF page 1); retain model `Tmin = 240 K` independently. The table does not state a triple-point pressure.
- **R1123 normal boiling point:** Table 3, PDF page 45, reports `Tb = 211.911 K`; its footnote says the table properties were determined in this work except molar mass, critical temperature, and triple-point temperature. Converted value: `211.911 − 273.15 = −61.239 °C`. Source: [NIST PDF, pub_id 930091](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=930091). “Normal boiling point” conventionally means 101.325 kPa absolute; the table does not repeat pressure next to the row.

Source IDs, scopes and `thermo_conditions_json` mappings are retained in the canonical CSV files.
