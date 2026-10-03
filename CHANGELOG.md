# Changelog

Generated from [data/releases.json](data/releases.json). Edit that bilingual source, then run `pnpm release:build`. The same notes are bundled in the app under Settings → Release history.

Dates describe versions, not the build time of each deployment. Beta releases do not update the stable site. The history starts with the recorded 0.1.0 stable baseline; earlier unversioned updates are not reconstructed.

## 0.4.0-beta.7 — 2026-10-03 · Beta

Sites, equipment and consistent reports

- Saved calculations and leak-check assessments open in dedicated views. Report list structure and export actions are consistent.
- Sites can contain multiple devices. Optional device details include refrigerant, charge, manufacturer and model, and serial number.
- Selecting equipment fills empty report fields. Existing entries and locked reports stay unchanged. Sites and device details are included in backups.

## 0.4.0-beta.6 — 2026-10-03 · Beta

Clearer forms, details and printouts

- Data coverage sits at the end of Properties. Restriction search, status filters, result counts and date grouping form a coherent view.
- The report list prioritises the site and separates report type from draft status. Equipment details and linked records have a quieter layout.
- Report sections summarise recorded details. Review and finalise leads to missing fields, with regulatory context shown separately.
- Calculation formulas have dedicated blocks. Links to related calculators are separated from Calculate. The beta notice and Settings version row are more compact.
- Printouts identify the site and device immediately. Missing details and measurement context are grouped more clearly. Printouts use PhaseKit fonts, with reliable fallback fonts so printing remains available.

## 0.4.0-beta.5 — 2026-10-02 · Beta

A lighter beta notice

- Release history and Stable version use matching text links in the beta notice, retaining generous touch targets.

## 0.4.0-beta.4 — 2026-10-02 · Beta

Consistent refrigerant details and contextual help

- Blend chemical names use Refrigerant blend. Missing property values consistently show Data unavailable.
- Property and source disclosure content aligns with the heading text.
- Oil guidance opens below its heading. Information icons sit closer to their labels throughout the app while retaining their touch target size.
- Settings actions align to the left. Coverage buttons no longer have link underlines, and the version number alone links to release history.
- Feedback has a distinct button with a clear GitHub destination.
- The beta notice shows its version, matching Release history and Stable version buttons, and a brief note about separate records. The build revision remains in Settings.

## 0.4.0-beta.3 — 2026-10-02 · Beta

Print controls work offline

- Print controls are bundled with the app, so Print / PDF and return-to-report controls also work without a network connection.
- The preview remains independent of a suspended opener. The physical iPhone print dialog still needs device verification.

## 0.4.0-beta.2 — 2026-10-02 · Beta

Compact refrigerant details and independent print controls

- GWP calculation bases open from an information button. Longer property methods are grouped in a disclosure while brief conditions remain beside each value.
- Pure-substance composition is shown in basic information. Blend component names are links and mass percentages are plain values.
- The oil-type row is shorter and the stray zero from an empty alternatives list is removed. Duplicate restriction source links are consolidated.
- Coverage opens in an app view with refrigerant-specific details and a back button.
- Cycle temperature inputs sit on the left on phones. The heading information button is aligned correctly.
- Print controls and chart loading run in the preview window independently of a suspended opener. The physical iPhone print dialog still needs device testing.
- The CO₂e calculator leaves more room for Calculate on phones. Initial navigation no longer takes focus away while the first input is being filled.

## 0.4.0-beta.1 — 2026-10-02 · Beta

Clearer field reports and refrigerant properties

- Field forms are grouped into sections. Missing-item links open the relevant field, and observations and notes share one writing area.
- Commissioning details and recorded test protocols can share one printout. Included protocol sections are distinguished from attachments supplied separately.
- The commissioning leak-check interval uses the existing calculation engine and requests missing inputs.
- Existing report content is retained alongside the revised fields. Locking a record is distinguished from technical acceptance and signing.
- Property availability and explanations, oil names, restriction badges and Settings links are clearer. Reports are accessed through their main navigation section.
- Removed tab-like lines from the pressure–temperature calculator and reduced spacing and nesting in supporting disclosures.

## 0.3.0-beta.9 — 2026-09-30 · Beta

Broader refrigerant models and checked calculation ranges

- R410A heat-pump measurements now work at 56 °C. Calculation ranges have been checked for every supported fluid, and out-of-range messages show the supported interval.
- Pressure–temperature and log(p)–h coverage extends to additional refrigerants, with model, mixture composition and source versions retained.
- Seven missing critical-temperature or pressure facts have been added from manufacturer sources.
- Added a research-sourced R1123 boiling point and corrected the R1132(E) physical triple point, keeping it separate from the model lower limit.

## 0.3.0-beta.8 — 2026-09-28 · Beta

A consistent app icon

- The beta app icon restores the original waves with clearer tonal separation between the mark and background.
- Matching artwork is prepared for beta and stable, with only a BETA badge distinguishing the channels.

## 0.3.0-beta.7 — 2026-09-28 · Beta

Schematic symbols for field work and study

- New Schematic symbols reference with separate Refrigeration and Electrical tabs, visual browsing and name search.
- 77 symbols with meanings, representation types and source notes are available offline.

## 0.3.0-beta.6 — 2026-09-28 · Beta

Readable heating durations

- Heat-calculation durations use hours, minutes and seconds. Long durations also use days and explicitly explained approximate months and years.
- The result card, saved calculations and printouts share this presentation. Exact minute values remain unchanged in storage and JSON exports.

## 0.3.0-beta.5 — 2026-09-28 · Beta

Clearer app icons

- The familiar app mark now stands out against a navy background without decorative waves. The beta badge remains legible in greyscale.
- Every tool has its own icon. An automated check prevents duplicate tool identity icons.

## 0.3.0-beta.4 — 2026-09-28 · Beta

A heat-capacity estimate for kiisseli and distinct tool icons

- Kiisseli now has an editable specific-heat estimate of 3.9 kJ/(kg·K), assuming 90% water and 10% carbohydrate by mass. The composition assumption and sources are retained in saved and printed results.
- The thermal-power tool now uses a flow icon to distinguish it from the heat-quantity calculator.

## 0.3.0-beta.3 — 2026-09-28 · Beta

Electrical calculations in either direction

- The electrical calculator can solve power, current or voltage from known values. Single- and three-phase AC calculations use the entered power factor.
- Ohm’s law can solve current, voltage or resistance. The form shows only the inputs needed for the selected calculation.
- The selected quantity becomes the main result on screen, in saved calculations and in print. Existing electrical records remain readable.

## 0.3.0-beta.2 — 2026-09-28 · Beta

Heat quantity, heating time and kiisseli

- A new heat calculator solves energy, heating/cooling time, required thermal power, mass, final temperature or specific heat capacity.
- Material selection includes sourced reference properties for water, dry air, copper and aluminium, plus custom properties. The homework-inspired kiisseli option asks for the user’s own specific heat value.
- Results can be saved as equipment-linked calculations and printed. Reports retain the properties used, sources and calculation assumptions.
- The liquid thermal-power calculator shares the water reference properties. Calculations assume constant properties without phase change; heating time uses heat transferred to the material and excludes losses.

## 0.3.0-beta.1 — 2026-09-27 · Beta

Start of the next update cycle

- The new beta cycle starts from stable 0.2.0. This version introduces no new calculation features.
- Upcoming changes will be tested in the separate beta first. The BETA icon and PhaseKit Beta installation name distinguish it from the stable app.

## 0.2.0 — 2026-09-27 · Stable

Field reports and expanded refrigeration tools

- Reports, calculators and interface improvements tested in beta are now available in the stable release.
- Reports brings together field records, drafts and saved calculations. Commissioning, evacuation, tightness, service and refrigerant records can be linked to equipment, finalised and printed.
- Printouts emphasise measurements and results. Cycle charts retain selected guide curves, comparisons include oil types, and print previews provide a return to the app.
- Includes unit conversion, thermal power, electrical and bounded pipe calculators, clearer leak-check due dates and component CO₂e breakdowns.
- Existing stable-version records are retained. Beta and stable still use separate local storage; transfer records through the JSON backup in Settings.

## 0.2.0-beta.6 — 2026-09-26 · Beta

Print navigation, charts and comparisons

- Print previews have a back link and a manual Print / PDF button. Controls stay off paper.
- Cycle printouts include a finer grid and the selected temperature, entropy and specific-volume guides. New saved calculations retain their chart view.
- Refrigerant comparisons can be printed and now include sourced oil types and their limitations.
- Report list rows share a consistent layout, type tags and separate draft/final status labels.

## 0.2.0-beta.5 — 2026-09-26 · Beta

Clearer reports and installation-document preparation

- Reports and saved calculations share one chronological catalogue with clearer search, report creation and equipment management.
- Commissioning records now support installation-document preparation under Finnish Decree 1063/2025 §9: responsible person, licence numbers, test-report references and evacuation readings. Completing fields does not replace attachments, technical acceptance or the responsible person’s signature.
- Printed measurements, tables and provenance are more compact. Signature and printed-name lines are completed on paper.
- Overdue leak checks are highlighted in red against the assessment date. Copy and share actions are inside the explanation disclosure.
- The date-input width fix now covers report forms. Equipment empty-state padding and supporting-copy spacing are corrected.

## 0.2.0-beta.4 — 2026-09-26 · Beta

Field reports for everyday work

- Reports brings together field records, drafts and saved calculations, with site/equipment search and type filters.
- Automatic save feedback also appears beside the final actions. Editing a finalised report creates a new revision and preserves the original.
- Work date, technician and printed signature name have separate fields. Evacuation and standing-test measurements and commissioning readings are recorded individually.
- Supported commissioning measurements can generate frozen superheat/subcooling results and a log(p)–h diagram, retaining sources and chart data with the record.
- Printouts show report type, key measurements, version information and a signature line. Service and refrigerant movement templates are included.
- Checklist ticks are blue and saved leak-check summaries share consistent titles and typography. Existing records and original free text remain available.

## 0.2.0-beta.3 — 2026-09-26 · Beta

Clearer results and field reports

- Saved calculations lead with their main result. Equipment association, breakdown and sources have their own sections.
- Consistent print layouts for calculations and work checklists. Leak-check reports show refrigerant, charge, and previous and next inspection dates when available.
- The pressure–temperature result card follows the last edited value. Leak-check explanations and save/print actions are easier to find.
- A single switch fits the chart to the cycle. Guide labels avoid overlap, with all selected values also available in a separate list.
- Improved picker spacing and a continuation cue. Marking a favourite keeps the row in place while browsing.
- Clearer release-history link and available-update notice.

## 0.2.0-beta.2 — 2026-09-26 · Beta

Visible release history

- Settings now links to release history with dates, channels and key changes in Finnish and English, also available offline.
- The app history and GitHub changelog share one source of release notes.
- Updated README and coverage reports, including log(p)–h support in the coverage summary.

## 0.2.0-beta.1 — 2026-09-26 · Beta

Field tools and a clearer beta

- General unit conversion, thermal and electrical power calculators, and pipe volume, flow, thermal expansion and pressure-loss tools.
- Persistent checklists, equipment-linked calculations and reports. Saved records can be reassigned or unlinked from equipment.
- Saved refrigeration cycles include a frozen chart: vector SVG in PDF reports and PNG export. Improved chart fitting and guide-curve controls.
- The refrigerant picker stays in place during searches. Consistent tabs, buttons, helper text and result panels; fixed checklist scrolling while typing.
- Broader search filters, CO₂e component breakdown and the next leak-check due date. Expanded source-attributed refrigerant data.
- Separate beta.phasekit.app deployment with a beta version and build revision. The stable site remains separate.

## 0.1.0 — 2026-09-26 · Stable

Stable baseline

- Refrigerant search, favourites and comparison, with P–T, refrigeration-cycle, CO₂e and leak-check tools.
- Source attribution, data-coverage information, local records, Finnish and English, and offline use.
- This summary describes the stable version present on 26 September 2026. Earlier updates using the same version number are not listed separately.
