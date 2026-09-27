# Preview testing guide

Use the Deploy Preview linked in the pull request. This branch must stay unmerged during testing. The existing phasekit.app release and its local browser data are separate.

## Suggested checks

1. **Catalogue.** Search R513A, open Filters and select EU Annex II-1. R513A should remain visible because its verified recipe contains both Annex I and Annex II-1 components. R404A should match Annex I. Combine with P–T/p–h availability; clear all filters. Oil-code filtering is reference information, not compressor approval.
2. **Unit conversion.** Under Tools, open Unit converter. A −18 °F temperature difference is −10 K. A temperature of −40 °C is −40 °F. Zero bar gauge with a 1.01325 bar atmosphere is 101.325 kPa absolute. These are three distinct conversions.
3. **CO₂e.** For R410A with its EU basis, converting 20.875 t CO₂e back to mass gives 10 kg. The component view shows 5 kg of R32 and 5 kg of R125; their contributions total 20.875 t CO₂e. Change the input and check that the old result disappears.
4. **Inspection date.** R134a, 10 kg, stationary refrigeration, no detector or hermetic exemption: assessment date 26 September 2026, completed inspection 31 January 2026. The current assessment gives 12 months and a next date of 31 January 2027. Without a completed inspection, no next date is invented. Save and reopen the assessment, then inspect/copy its explanation.
5. **Field calculations.** Thermal: 60 l/min, 1000 kg/m³, 4.18 kJ/(kg·K), inlet 15 °C and outlet 10 °C gives −20.9 kW (fluid cooling). These are user-specified properties, not a built-in fluid claim. Electrical: balanced three phase, 400 V line voltage, 10 A and power factor 0.8 gives approximately 5542.56 W real and 6928.20 VA apparent power. Pipe: 20 mm internal diameter, 10 m and 0.5 l/s gives approximately 3.14159 litres and 1.59155 m/s; it does not recommend that pipe size.
6. **Reports and equipment.** Open Saved → Manage equipment; add a test site. Save a successful calculation against it with notes. Reload, inspect the frozen inputs/results/sources, export JSON and print to PDF. Deleting the equipment must preserve the earlier report and its recorded equipment name.
7. **Checklists.** Create an evacuation or commissioning list, enter equipment instructions and observations, check a step, reload and reopen it. Export text and try cancelling deletion. A checkmark does not certify that the equipment passed a test.
8. **Phone and offline.** Try Finnish/English and both themes. After one online load and service-worker activation, reload offline and use the tools. Test actual phone keyboards, minus/comma input, print/share dialogs, enlarged text and one-handed scrolling. These device observations complement automated browser tests.

## Data and rollback

Settings exports a full backup including equipment, reports and checklist drafts. Older schema-v1 production backups can be imported into this preview. Keep the original file. Do not use the older production app to round-trip a newer preview backup: it does not understand the new collections. No account sync or automatic migration exists.

When reporting a problem, include the preview URL, refrigerant, every input and unit, pressure reference/atmosphere, language, browser/device and observed versus expected result. For calculations, use complete measurement values rather than a cropped result screenshot.
