# Refrigerant safety-group beta audit

Checked 2026-09-26. This audit records a bounded source review of the 50 refrigerants whose `ashrae_safety_group` field was blank at the start of this pass. It is not a claim that the remaining refrigerants have no assigned class.

## Verified additions

The [ASHRAE Handbook 2025 Refrigerants chapter, Tables 1 and 2](https://handbook.ashrae.org/Handbooks/F25/SI/F25_Ch29/F25_Ch29_si.aspx) expressly identifies its safety classifications as based on ANSI/ASHRAE Standard 34-2022. I added only classifications printed for the exact designation and composition already represented by each record. Every updated row cites source ID `ashrae-handbook-f25-safety` in its safety source and field-level provenance.

The following records now have a directly printed classification:

| Group | Records |
| --- | --- |
| A1 | R13I1, R401C, R407I, R427C, R448B, R460C, R461A, R464A, R470A, R470B, R482A, R501, R509A, RC318 |
| A2 | R412A, R415A, R415B, R440A, R462A, R510A |
| A2L | R467A |
| A3 | R432A, R433A, R433B, R433C, R436A, R436B, R436C, R601 |

These are 29 directly supported additions. Classification is not inferred from blend constituents. In particular, the R509 row in the Handbook is R509A; it does not establish a class for the distinct R509 composition in this catalogue.

## Still unresolved

These 21 records remain blank. “Not located” below describes only this pass's checked source set, not the absence of a classification elsewhere.

| Record | Reason retained blank |
| --- | --- |
| R1123 | No directly applicable classification located in the checked ASHRAE Handbook table or government reference. |
| R1234ze(Z) | No exact-designation classification located in the checked sources. Do not transfer the classification of R1234ze(E). |
| R1243zf | No exact-designation classification located in the checked sources. |
| R141b | No directly applicable class located in the checked ASHRAE table; BITZER's reference table also leaves its safety field blank. |
| R161 | Conflicting checked evidence: the Handbook Table 1 prints A2, while a Handbook footnote says HFC-161 is not listed in Standard 34 or ISO 817; DCCEEW's table gives n/a. Not imported pending resolution against the current standard. |
| R236EA | DCCEEW gives n/a; its notes describe n/a as substances with other roles, not an assigned refrigerant safety class. |
| R245ca | DCCEEW gives n/a; no directly applicable class located in the checked sources. |
| R31 | No exact-designation classification located in the checked sources. |
| R365MFC | DCCEEW gives n/a; no directly applicable class located in the checked sources. |
| R405A | The Handbook Table 2 safety-group cell is blank; no independent exact class located. |
| R406B | No directly applicable class located in the checked Handbook or government reference. No blend-component inference. |
| R41 | DCCEEW gives n/a; no directly applicable class located in the checked sources. |
| R411C | No exact-designation classification located in the checked sources. |
| R485A | Existing source review found non-equivalent/conditional TEAP classifications; see [DATA-V3-AUDIT](DATA-V3-AUDIT.md). No unconditional class added. |
| R504 | The Handbook Table 2 safety-group cell is blank; no independent exact class located. |
| R505 | The Handbook Table 2 safety-group cell is blank; no independent exact class located. |
| R506 | The Handbook Table 2 safety-group cell is blank; no independent exact class located. |
| R509 | The Handbook discusses R509A and says R509 is an allowed designation for that changed designation. This catalogue's R509 composition is 46/54 R22/R218, distinct from R509A at 44/56; the class was not transferred. |
| R729 | No directly applicable class located in the checked sources. Its air pseudo-pure model identity is not a basis to infer a class. |
| R732 | No exact-designation classification located in the checked sources. |
| RE143A | No exact-designation classification located in the checked sources. |

The [DCCEEW HFC refrigerants safety/GWP reference](https://www.dcceew.gov.au/environment/protection/ozone/rac/global-warming-potential-values-hfc-refrigerants) says its classifications generally come from AS/NZS ISO 817:2016, falling back to reputable sources including ASHRAE, and directs users to independently check classifications. Its “n/a” entries are not safety groups. This reference was used to flag conflicts or non-class entries, not to fill gaps.

## Source-version limit and scope

The ASHRAE Handbook tables reviewed here cite Standard 34-2022. ASHRAE's current addenda page identifies Standard 34-2024 as the superseding edition, with addenda published after it. This pass did not obtain and compare the consolidated current 34-2024 text. The 29 imports are therefore attributed to the exact 2025 Handbook tables and their stated 2022 basis; they should not be represented as a complete current-standard audit.

No aliases, compositions, thermodynamic properties, environmental values, or regulatory fields were added in this pass. Twenty-one safety groups remain unresolved, and existing status fields remain partial where appropriate.
