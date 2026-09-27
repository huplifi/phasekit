# Qualified EU/FI regulatory review packet

Status: prepared for a qualified reviewer; no approval or sign-off has been obtained. The implemented scope is the periodic leak-check assessment in [RULES.md](RULES.md), with broader restrictions and data limits in [RELEASE-GATES.md](RELEASE-GATES.md). Review the cited legal text and current Finnish guidance independently at the time of assessment. Record the exact ruleset and data versions from exported results; saved snapshots do not silently recalculate.

## Review questions

1. Confirm the separate EU 2024/573 Annex I CO₂e and Annex II section 1 mass calculations for mixtures. In particular, verify the component-fraction method, shortest applicable interval, and R513A 50 kg example (31.46 t CO₂e Annex I and 28 kg Annex II-1; proposed 6-month interval without a detector). State where the legal text is explicit, where Finnish guidance supports an interpretation, and where expert judgement remains.
2. Decide the labelled-hermetic mixed-gas `or` case in Article 5(1). The current engine returns `unsupported` when the branches disagree; advise whether a narrower answer can safely be made and cite its basis. Check the strict "less than" boundaries and residential exception.
3. Confirm the Article 5/6 detector, interval and equipment-category treatment, including truck/trailer, other mobile equipment around 12 March 2027, ORC, switchgear and fire-protection alternatives. Identify any case for which the current input fields cannot support a conclusion.
4. Confirm Regulation 2024/590 ODS thresholds, labelled-hermetic exemption and the fact that detector presence does not double its intervals. Check R22 at the 3/30/300 kg and 6 kg hermetic boundaries.
5. Review the legal GWP basis, verified blend mass fractions, source/version mapping and missing-data handling. Confirm whether any model-derived or secondary blend recipe is being treated too strongly. Review contextual restriction notices separately from periodic checks.

## Independent cases to run

Use the boundary table in [RULES.md](RULES.md) as the expected-outcome reference, then enter cases in the beta and export snapshots. At minimum run R134a immediately below and at the 5/50/500 t CO₂e tiers; R1234yf below and at 1/10/100 kg; R22 below and at 3/30/300 kg; R513A at 50 kg with and without a detector; labelled-hermetic cases immediately below and at their strict thresholds; and at least one missing-source and one unsupported equipment path. For repeating-decimal charge equivalents, assess exact score-tier tests or clearly chosen decimal values either side, as the decision record explains.

For each case, capture:

```text
Reviewer / qualification / date:
Current legal and guidance source URL, article/annex, version or access date:
Beta build, ruleset version, data version and source IDs:
Refrigerant, charge, unit, equipment, date, detection and hermetic inputs:
Independent calculation and expected state/interval:
PhaseKit state/interval/decisive rule and exported snapshot reference:
Finding (agree / disagree / interpretation unresolved / source missing):
Reasoning and exact correction requested:
Severity and affected cases:
Reviewer decision (approved for defined scope / changes required / unresolved):
Signature or written approval reference, if supplied:
```

The reviewer should identify the scope of any approval precisely. An unresolved interpretation, missing legal input or incorrect boundary result remains a release blocker for the affected claim. Do not convert silence, a meeting or test attendance into approval.
