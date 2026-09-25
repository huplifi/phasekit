# Unit conversion and CO₂-equivalent components

## General unit converter

`packages/core/src/conversions.ts` is a pure, offline decimal conversion function. The UI is `UnitConverter` at `/convert`. Supported dimensions are pressure, temperature, temperature difference, mass, energy, power, volume and volumetric flow. These dimensions cannot be mixed. Energy is not power, and litres are not litres per second.

Inputs accept a decimal comma or point, an optional sign, and at most 40 digits through the existing shared parser. Empty or invalid edits immediately remove the previous result. Results are rounded to 14 significant digits in the core and displayed at 12 significant digits; this is a conversion precision, not measurement accuracy. The text keyboard allows negative values on iOS.

Pressure explicitly specifies absolute or gauge at each end. Gauge conversions require a positive atmospheric reference in bar(a); the visible default is the standard atmosphere, 1.01325 bar. Absolute pressure below zero is rejected, including when both input and output are gauge. Zero absolute pressure is supported for unit conversion. Temperature below 0 K is rejected. Temperature **differences** preserve signs and use only scale factors, without the Celsius/Fahrenheit offsets.

### Constants and sources

Reviewed on 26 September 2026 against [NIST SP 811, Appendix B.9](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9) and its [footnotes](https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes):

- SI decimal prefixes; 1 bar = 100,000 Pa; 1 mbar = 100 Pa.
- 1 lb = 0.45359237 kg; inch = 0.0254 m; standard gravity = 9.80665 m/s². PSI is calculated from these definitions rather than a shortened decimal coefficient.
- 1 Wh = 3,600 J; 1 kWh = 3.6 MJ.
- 1 m³ = 1,000 L; 1 L = 1,000 mL; minute = 60 s; hour = 3,600 s.
- Celsius = kelvin − 273.15; Fahrenheit = Celsius × 9/5 + 32. A Fahrenheit interval is 5/9 of a kelvin interval.

## CO₂e component breakdown

The existing converter still determines the headline result using the selected, verified GWP fact. `co2e-breakdown.ts` separately reconciles that result against a verified mass recipe and verified component GWP facts. Both conversion directions pass the converter's **actual calculated kg**, never the user-entered tonnes value as kg.

The recipe must have verified composition coverage, positive fractions with source references, unique component IDs, and an exact 100% mass sum. Missing, unsupported or nested mixture components prevent a complete total. Partial rows may still show their sourced masses, but missing GWP is never assumed to be zero. Pure substances have one 100% row.

Components normally require the same fact key and exact basis as the selected total. The only cross-basis mapping is explicitly defined for `EU-2024/573-Annex-VI-mass-weighted`: the regulation-prescribed Annex I AR4/AR6, Annex II AR6 and Annex VI component values under `gwp_eu_2024_573_100yr`. The UI explicitly explains that these statutory values can originate in different IPCC assessments. This follows [Regulation (EU) 2024/573, Article 3(1) and Annex VI](https://eur-lex.europa.eu/eli/reg/2024/573/oj). It is not an arbitrary substitution of IPCC vintages, and ODS values under Regulation 2024/590 are not used as a fallback.

Each row shows mass fraction, kg, GWP, contribution in tonnes CO₂e, the exact basis and source references. A complete result reports the component total, weighted GWP and reconciliation. Differing source values or rounding produce an explicit difference; they do not overwrite the headline converter total. Reconciliation compares weighted GWP, so a zero charge cannot hide a basis/value mismatch. This analysis covers the whole charge and does not determine periodic leak-check obligations.

## Verification

`conversions.test.ts` covers independent conversion vectors, absolute/gauge references, absolute zero, signed differences, malformed inputs and dimension mismatch. `co2e-breakdown.test.ts` covers R410A and R513A, inverse conversion, mismatched assessment/ODS bases, incomplete provenance, total differences and zero-mass reconciliation. `tests/e2e/converters-preview.spec.ts` checks interactive stale-result clearing, pressure reference conversion, reverse CO₂e breakdown and mobile overflow.
