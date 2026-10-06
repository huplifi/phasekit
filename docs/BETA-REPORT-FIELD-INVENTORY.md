# Beta report field and stage inventory

Reviewed 2026-10-02 against `packages/core/src/field-tools.ts`, the report editor and the saved-report schema. This inventories the five existing report types for BETA-19–28. Classification means **keep**, **conditional**, **automatic**, or **legacy**. A stage checkbox records that the operator worked through a stage; it is not a pass result, test certificate, signature, or legal approval. Stored field keys and the top-level `notes` value remain in the backup format.

## Shared report data

| Field ID | Decision | Reason and display rule |
| --- | --- | --- |
| `id`, `kind`, `title`, `updatedAt`, `checkedIds` | Keep | Record identity, type, title, save time and stage progress. `updatedAt` is automatic save metadata, not work or signature date. |
| `equipment`, `performedOn`, `technician` | Keep | Equipment identifier, actual work date and person performing the work. A linked equipment card can fill the identifier once; the user must confirm it is the actual object. |
| `notes` | Keep | Main multiline observations and notes. Old `fields.finding` is shown together with it, but both raw values remain untouched until explicit edit. |
| `signatureName`, `date`, `instructions` | Legacy | Shown and exported only when old records contain them. A typed name is not a verified signature. The generic manufacturer-instruction/version field is not required for every report; equipment-specific criteria remain near the relevant test. |
| `finding` | Legacy merge | Existing text is preserved. New editing uses the combined notes surface. Long old pairs exceeding the `notes` storage limit stay separately editable. |

The common `equipment`, `performedOn`, and `technician` keys are independent of the similarly named equipment card, report creation timestamp, and responsible-person signature. No old text is parsed into a new numerical measurement.

## Tightness test (`tightness`)

Stages, in order: `instructions` → `preparation` → `measurements` → `leaks` → `review`. This is a recording workflow; a pressure-strength test and a tightness test are distinct. The stage does not decide when a pressure test is legally required.

| Field IDs | Decision | Reason |
| --- | --- | --- |
| `medium` | Keep | Identifies test medium. |
| `criterion` | Keep | Equipment-specific pressure, duration and acceptance limits with instruction reference. No refrigerant-only default. |
| `start`, `end` | Keep | Time, pressure and temperature with units for interpretation. |
| `finding` | Legacy merge | Findings go to combined observations/notes; old value retained. |

## Evacuation (`evacuation`)

Stages: `instructions` → `preparation` → `measurement` → `hold` → `review`. Pump-running achieved pressure and isolated-system hold-start pressure are different measurements. The former remains available but is not required for a coherent hold record. No universal 2.7 mbar target or holding limit is prefilled.

| Field IDs | Decision | Reason |
| --- | --- | --- |
| `vacuumUnit`, `targetPressure`, `holdAcceptanceCriterion` | Keep | Absolute pressure unit and equipment-specific target/hold limit. The criterion includes source/instruction reference. |
| `holdStartPressure`, `holdEndPressure`, `holdMinutes` | Keep | Actual isolated-system readings and duration; positive finite values, never defaulted. |
| `achievedPressure` | Conditional | Optional supplementary pump-running reading; do not copy it into hold-start. |
| `instrumentName`, `measurementLocation` | Keep/conditional | Gauge make/model and connection point for interpreting readings. Connection point is descriptive and may be omitted when unneeded. |
| `evacuationMinutes`, `criterion`, `instrument`, `vacuum`, `hold` | Legacy | Earlier free text or rarely recorded duration shown only if saved. Nothing is silently moved into structured fields. |
| `finding` | Legacy merge | Combined observation editing retains old data. |

## Commissioning (`commissioning`)

Stages: `instructions` → `preconditions` → `charge` → `measurements` → `controls` → `handover`. `commissioningPurpose` distinguishes technical commissioning from installation-certificate preparation. An old report without this key keeps the installation-certificate path. Stage completion and form completeness do not establish technical acceptance or a responsible-person signature.

| Field IDs | Decision | Reason |
| --- | --- | --- |
| `commissioningPurpose` | Keep | Explicit `installation` or `technical` intent; certificate-only questions are hidden for technical commissioning. |
| `refrigerantId`, `chargeKg` | Keep | Reused once for properties and conditional leak assessment. Charge stays as entered. |
| `refrigerantSafetyClass`, `refrigerantGwp`, `refrigerantGwpBasis`, `refrigerantSourceNote` | Conditional | Certificate item 3. The safety class and applicable GWP basis need traceable sources; catalogue unknowns do not become guesses. |
| `conditions`, `pressureUnit`, `pressureReference`, `atmosphericReference`, `lp`, `hp`, `suctionC`, `dischargeC`, `liquidC` | Keep/conditional | Operating conditions and measurements support test-run interpretation and cycle calculations. Not all five cycle readings are legally mandatory for every run. Atmospheric reference matters for a gauge-to-absolute conversion. |
| `charge`, `pressures`, `temperatures` | Legacy | Earlier combined text remains exportable; no numerical backfill. |
| `installationLocation`, `installerCompany`, `installerQualificationNumber`, `responsiblePerson`, `responsibleQualificationNumber` | Conditional | Installation location, business, identities and personal licence numbers. Installer and responsible person are distinct roles. |
| `installerCompanyQualificationNumber` | Legacy only | Beta.2 supplementary field is no longer requested. Non-empty recorded values remain visible and exportable; no number is moved between roles. |
| `leakEquipment`, `leakDetection`, `leakHermetic` | Conditional | Explicit rule inputs; no interval is derived from charge alone. |
| `leakHermeticLabel`, `leakResidential` | Conditional | Asked only when the hermetic branch makes them relevant. Missing answers never become exemptions. |
| `leakCheckInterval`, saved `leakCheckEvidence` | Automatic/conditional | EU/FI engine result and compact rule/data/date/input evidence. Only a resolved result may populate the interval; old saved values are not rewritten on opening. |
| `pressureTestRequired`, `pressureAssessmentBasis` | Conditional | Guided assessment of pressure-equipment documents or expert basis. The app does not infer test applicability from refrigerant/charge. |
| `pressureTestExemptionReason`, `pressureTestReportReference` | Conditional | A documented rationale if no pressure test is required; a real report reference if it is required. |
| `tightnessRecordMode`, `evacuationRecordMode`, `testRunRecordMode` | Conditional | Explicit internal or external protocol route. Old records infer external only when they contain that report reference. |
| `tightnessTestReportReference`, `evacuationReportReference`, `testRunReportReference` | Conditional | Shown for the selected external route; references identify documents and do not prove that files were delivered. |
| `tightnessMedium`, `tightnessCriterion`, `tightnessStart`, `tightnessEnd`, `tightnessFinding` | Conditional | Internal tightness protocol. Every part is needed before the internal record is counted as present. |
| `vacuumUnit`, `targetPressure`, `holdAcceptanceCriterion`, `holdStartPressure`, `holdEndPressure`, `holdMinutes`, `instrumentName`, `evacuationFinding` | Conditional | Internal evacuation protocol. Existing `criterion` can satisfy the acceptance-limit field for old records; achieved pressure is supplementary. |
| `achievedPressure`, `measurementLocation`, `evacuationMinutes`, `criterion`, `instrument`, `vacuum`, `hold` | Conditional/legacy | Additional evacuation context and old text retained. |
| `testRunMeasurements`, `testRunFinding` plus `conditions` | Conditional | Internal test-run protocol. Recorded operating measurements may also use existing LP/HP/temperature fields or old `pressures`/`temperatures` text. No pass result is inferred from numbers. |
| `operatorDeclaration` | Conditional | Explicit business declaration; edited substantive fields clear previous confirmation. It is not a signature. |
| `finding` | Legacy merge | General commissioning observations and handover notes remain in combined notes. |

The three protocol statuses are `internal`, `external`, or `missing`. A selected external route without a reference is missing. A selected internal route requires its own measurements, limits and observations, even if an old external reference remains in storage. The pressure-test route is separate from the tightness protocol.

## Service (`service`)

Stages: `assessment` → `work` → `verification`. These correspond to initial condition, performed work and observed result; a service record does not automatically stand in for the continuing statutory refrigerant journal.

| Field IDs | Decision | Reason |
| --- | --- | --- |
| `initialCondition`, `workPerformed`, `measurements` | Keep | Fault/starting state, work and before/after values with units. Long entries use multiline controls. |
| `finding` | Legacy merge | Follow-up goes into combined observations/notes, old field retained. |

## Refrigerant work (`refrigerant`)

Stages: `identification` → `weighing` → `completion`. Mass movements and provenance are dated events. This template alone does not assert a complete five-year equipment journal.

| Field IDs | Decision | Reason |
| --- | --- | --- |
| `refrigerantId`, `reason` | Keep | Substance and work reason. |
| `addedKg`, `recoveredKg` | Conditional | Record actual mass handled; blank is unknown, not zero. |
| `cylinderId`, `cylinderBeforeKg`, `cylinderAfterKg` | Conditional | Traceable source/receiver and weighing evidence where a cylinder is involved. |
| `finding` | Legacy merge | Further handling and observations in combined notes. |

## Completion and compatibility checks

- `commissioningMissingFields` returns exact field IDs for navigation. In technical mode it does not demand installation-certificate declarations. In installation mode, an unresolved pressure-test decision, missing protocol, invalid charge/GWP, absent leak interval or declaration remains visible. This is **presence validation**, not legal approval.
- `checklistEditorFields` handles conditional visibility; `checklistReportFields` keeps all saved fields available to export. Hidden conditional and legacy values are retained byte for byte until the user edits them.
- The backup schema remains additive: `fields` is a string map, old report IDs/kinds/notes are unchanged, and the new provenance snapshot is a bounded string. The export must not print raw JSON evidence as user prose.
- A common small-system mobile path needs equipment identity, work date, refrigerant and charge, only applicable leak-assessment questions, the selected test records, actual operating observations and handover. No optional measurement or checkbox is auto-passed.
