# Changelog

Generated from [data/releases.json](data/releases.json). Edit that bilingual source, then run `pnpm release:build`. The same notes are bundled in the app under Settings → Release history.

Dates describe versions, not the build time of each deployment. Beta releases do not update the stable site. The history starts with the recorded 0.1.0 stable baseline; earlier unversioned updates are not reconstructed.

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
