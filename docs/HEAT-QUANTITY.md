# Heat quantity and heating time

Beta route: `#/heat-quantity`. Introduced in 0.3.0-beta.2. This is a constant-property sensible-heat calculator, not a phase-change or heat-loss model.

## Contract

`Q = m c (T_final − T_initial)`. Solve for signed energy, positive mass, final temperature or positive specific heat. Energy can be entered in kJ or kWh (`1 kWh = 3600 kJ`). A volume input in litres is converted to kg using explicitly supplied density; density is irrelevant for a mass input. Inverse mass/specific-heat calculations reject zero temperature difference and inconsistent energy direction.

Time uses `t_minutes = |Q_kJ| / (60 P_kW)`; required power uses the same relationship solved for P. Power is the constant heat-transfer magnitude into/out of the material, not appliance electrical input. Time and power exclude container heat capacity, heat losses, heat-transfer-rate variation and phase change. Cooling energy is negative while cooling duration and power magnitude are non-negative.

Fields not required for the chosen unknown are not parsed. Editing an input, material or mode clears the previous result and save control. Absolute temperatures below −273.15 °C are invalid. The water preset is conservatively restricted to temperatures strictly between 0 and 100 °C at ordinary atmospheric conditions, including a calculated final temperature. Other materials still require the user to retain the same phase; custom values do not add a phase-change model.

## Reference properties

Source: [OpenStax College Physics 2e, §14.2, Table 14.1 and Example 14.1](https://openstax.org/books/college-physics-2e/pages/14-2-temperature-change-and-heat-capacity), checked 28 September 2026. Factual values are converted from J/(kg·K) to kJ/(kg·K); no temperature interpolation is implied.

| Material        |   c, kJ/(kg·K) | Source basis                                                  | Density preset                                                   |
| --------------- | -------------: | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Liquid water    |          4.186 | Table reference 15 °C                                         | 1000 kg/m³, textbook approximation from Example 14.1             |
| Dry air         |          1.015 | cₚ, 20 °C, constant pressure 1 atm; not cᵥ for a rigid vessel | None; actual-condition density must be supplied for volume input |
| Solid copper    |          0.387 | Table reference 25 °C                                         | None                                                             |
| Solid aluminium |          0.900 | Table reference 25 °C                                         | None                                                             |
| Kiisseli        | 3.9 (estimate) | Assumed 90 mass-% water and 10 mass-% carbohydrate; see below | User supplied if needed                                          |
| Custom          |  User supplied | Exercise or other user-provided property                      | User supplied if needed                                          |

These are explicitly labelled representative constant values, not a temperature-dependent material database. Selecting custom clears inherited properties; kiisseli replaces them with its own explicit estimate and no density. Editing a preset marks the used property as user-supplied. Solving c records it as a calculated result, not a looked-up property. The liquid thermal-power calculator shares the water reference but continues to start with custom properties.

## Records and verification

The additive `heat-quantity` tool kind uses the existing report persistence, equipment linking, backup and print paths. Records freeze the selected material, relevant entered properties, property basis, solve mode, assumptions, exact result strings and source metadata. The chosen unknown is the report's main result. Old backups remain readable; older app versions do not understand the new tool kind, so moving a beta backup to stable requires a compatible stable version.

Unit tests cover six modes, independent water/time examples, heating/cooling signs, inverse round trips, volume conversion, irrelevant inputs and invalid boundaries. Storage/report tests cover exact backup round trips and correct headline selection. Browser checks cover material changes, kiisseli, stale results, reports/printing, bilingual mobile layout and the shared liquid-water preset.

## Kiisseli estimate — beta.4

At the user’s request, kiisseli has a ready-to-use, editable **3.9 kJ/(kg·K)** estimate. The assumed composition is **90% water and 10% carbohydrate by mass**, not a measured recipe or a universal food property.

[ASHRAE Handbook 2018 Refrigeration, chapter 19, Table 1 and §7](https://handbook.ashrae.org/Handbooks/R18/SI/r18_ch19/r18_ch19_si.aspx), checked 28 September 2026, provides the carbohydrate model and mass-weighted mixture method. At 20 °C the carbohydrate model `1.5488 + 0.0019625 T − 0.0000059399 T²` gives 1.58567404 kJ/(kg·K). Using the existing water reference 4.186 gives `0.9 × 4.186 + 0.1 × 1.58567404 = 3.925967404`, rounded to **3.9**. The water reference temperature remains 15 °C; this mixed-reference approximation is deliberately coarse, not an exact 20 °C property model.

The UI and frozen report mark the preset as a composition estimate and retain the assumption and both source references. Changing the value marks it user-supplied. Density is not inferred; a volume input still needs an explicit value. The model applies to unfrozen kiisseli without phase change.
