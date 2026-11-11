# Electrical measurements and inspection reports

This addition keeps everyday electrical readings in **Tools → Electrical measurements** and formal inspection documents in the existing **Reports** catalogue. A reading can be recorded without creating a report. Formal electrical reports start through Reports → New report → Report template, with the measurement tool retaining its direct shortcut. The interface and exports support Finnish and English.

## Data and field mapping

The existing schema-v1 backup remains readable. Electrical fields are additive: `electricalMeasurements` and `electricalReports` default to empty arrays, and `electricalSession` is optional. IndexedDB, the existing serial durable writer, backup validation and merge rules remain the persistence boundary. “Saved” means saved in this browser/device; it does not mean server synchronisation. Failed local writes remain visible and can be retried without clearing entered data.

| Inspection content                             | Stored fields                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Site and installation identity                 | `siteId`, `siteName`, `siteAddress`, `equipmentId`, `equipmentName`                           |
| Work and inspection boundaries                 | `workDescription`, `scope`                                                                    |
| Builder and contact details                    | `builder`, `builderContact`                                                                   |
| Electrical work supervisor and contact details | `electricalSupervisor`, `supervisorContact`                                                   |
| Inspector and contact details                  | `inspector`, `inspectorContact`                                                               |
| Applied standards, including versions          | `standards` — entered by the inspector; no default standard is supplied                       |
| Methods and functional tests                   | `methods`                                                                                     |
| Scoped visual inspections and observations     | `visualInspection` — free text, without an assumed universal checklist                        |
| Instrument details and readings                | `measurements[]`, including each reading's `meter.brand`, `meter.model`, `meter.serialNumber` |
| Assessment, defects and deviation explanations | Per-reading `assessment`, `assessmentNote`; report `evaluation`, `findings`, `deviations`     |
| Conclusion and restrictions on use             | `conclusion`, `conclusionNote`                                                                |
| Signatory name and inspection date             | `signature`, `inspectionDate`                                                                 |
| Template/applicability review acknowledgement  | `applicabilityVerified`                                                                       |
| Document history                               | `status`, `revision`, `previousRevisionId`, `createdAt`, `updatedAt`, `finalizedAt`           |

A measurement also preserves its ID, session ID, site/equipment identity, point, measurement type, raw result, unit, measurement timestamp, technician, optional note and optional bounded raster photo. Source readings keep their original author, date and site when included in a report.

## Point sheet and study reminders

The tool presents all nine reading types directly for the current point. Notes,
photos, instrument settings and learning guidance expand per row. Empty rows do
not create stored readings until edited and do not imply mandatory missing
checks. Recorded, assessed and blank states remain distinct. Optional `pointId`
groups new readings; older readings without it remain separate points, even if
their names match. Copying a point clears every copied result, assessment, note
and photo while retaining useful context. Active point cards use a uniform border
and a subtle background rather than a thick side accent.

Study reminders explain purpose, preparation and the information needed to judge
a result. The chosen Finnish study reference is **SFS 6000-6:2022**; SESKO lists
part 6:2022 and Tukes' S10-2026 list still references the 2022 SFS 6000 series.
The full standard was not available in this task, so **numeric acceptance limits
have not been verified or encoded**. Manufacturer procedure reminders are kept
separate from normative acceptance criteria. Old or foreign-scope insulation
threshold tables were not adopted as Finnish limits. A qualified review of the
actual standard's methods, conditions and limits remains required before adding
such values.

References: [SESKO's 2022 standard parts](https://sesko.fi/standardointi/sahkoasennukset/sfs-6000-uudistus-2022/),
[Tukes' current technical requirements and S10 list](https://tukes.fi/sahko/sahkotyot-ja-urakointi/sahkoasennusten-tekniset-vaatimukset).

## Results, snapshots and revisions

- Results are text. Decimal commas, decimal points, qualifiers and instrument messages are retained. Empty input is not zero; a comparator alone is not a completed reading. Display helpers avoid adding the unit twice when it is already in the raw result.
- Copying a measurement point retains its context and type but creates a new ID/time and clears result, assessment, assessment note, note and photo.
- Report creation selects existing readings and deep-copies them. A report contains readings from one site; a report covering multiple pieces of equipment at that site does not claim the first equipment as its overall identity.
- Report assessment edits affect the report snapshot, never the source reading. Correcting a draft snapshot's point, result, unit or meter details clears that snapshot's previous assessment. A wrongly included reading can be removed from the draft.
- Recorded, assessed and finalised are separate states. No technical limits or automatic conformity decisions are applied. A fully documented report with defects, or a conclusion **Not approved for commissioning**, can be finalised. An accepted conclusion cannot coexist with a failed included reading.
- Finalisation requires identifying and substantive fields, assessed complete readings, and explicit acknowledgement that the template/applicability/assessment criteria have been checked. A final document is locked in the application. Correction creates a new draft ID with incremented revision and a link to the original; the original remains. The new revision requires renewed applicability acknowledgement and signatory/date entry.
- Backup import merges missing IDs and preserves existing local records with matching IDs. Bounded schemas reject duplicate IDs, malformed metadata, unsafe image URLs and oversized input. This is application history preservation, not a cryptographic tamper-evident archive.

## Sources and production review

The content baseline is [Tukes: Sähköasennusten käyttöönottovaiheen tarkastukset](https://tukes.fi/sahko/sahkoasennusten-kayttoonottovaiheen-tarkastukset), reviewed for this implementation on **11 November 2026**. The page is a live source; no publication/version date is asserted here. It is a baseline for documenting the installation/work, responsible parties, conformity explanation, standards, methods, results and inspector signature.

**The template is not itself a verified standard-specific inspection form.** Before production use, a qualified professional must check its content, the inspection items that apply to the actual work/site and any acceptance limits against the applicable standards and their versions. The UI and PDF retain this limitation. Standards are deliberately entered as free text with versions, and visual observations are scoped free text. There is no claim that every listed measurement applies to every installation.

Meter reminders use the manufacturer's [Fluke 1662/1663/1664 FC Users Manual](https://media.fluke.com/75807436-7228-4144-8190-b309010baaca_original%20file.pdf), reviewed for this implementation on **11 November 2026**. The verified source edition is **10/2015, Rev. 3, 12/2024** (PDF cover). Recheck the edition when updating the guidance. Guidance is shown only for the exact supported brand/model combinations `Fluke 1662`, `Fluke 1663` and `Fluke 1664 FC`. A brand or family name alone never enables it. Other instruments can still record results.

| Reminder                                          | Manual printed pages | PDF starting page |
| ------------------------------------------------- | -------------------- | ----------------- |
| RLO continuity                                    | 29–30                | 33                |
| RISO insulation resistance                        | 26–28                | 30                |
| ZI loop impedance                                 | 31–38                | 35                |
| ZI Hi Current / prospective short-circuit current | 36–38                | 40                |
| ΔT RCD time                                       | 39–46                | 43                |
| IΔN RCD current                                   | 47–50                | 51                |
| V voltage                                         | 25–26                | 29                |

The reminder is not the full operating procedure or a site test plan. It does not supply a universal test voltage, current, connection or acceptance threshold. Phase sequence and “other” have no verified model-specific reminder in this version.

## PDF and signature semantics

PDF uses PhaseKit's existing offline print/PDF preview and bundled renderer. It includes the draft/final status, revision lineage, substantive fields, raw readings, original measurement timestamps/authors, meter information, assessments, notes, photos and the template limitation. Drafts are visibly marked **LUONNOS / DRAFT**.

The supported signature workflow is **paper signature**. A final document says “Finalised — sign the printed document”, includes the signatory name/date and provides a handwritten signature line. A typed name is explicitly not an electronic signature. Finalising does not claim that the paper has already been signed or that a signatory's identity has been electronically verified.

## Verification evidence

Focused domain/storage checks exercise legacy loading, unchanged raw readings, copy resets, snapshot isolation, duplicate/unsafe/oversized import rejection, failed-result finalisation, conflicting approval rejection, immutable final editing, revision creation, backup merge and independent persisted versions. Existing field-report/equipment persistence checks remain part of compatibility verification.

The inspection browser scenarios exercise the real Tools recording flow, report creation from that session without reentering readings, bounded photo attachment, actual draft/final PDF downloads, a documented failure conclusion, correction reset behaviour, preserved original report/source history, catalogue integration, a 320-pixel layout and automated accessibility checks. Final integrated commands/results belong to the delivery verification record; this document does not assert pending browser or deployment results.
