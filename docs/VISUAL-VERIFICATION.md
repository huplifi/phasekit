# Visual verification — 25 September 2026

The v2 design reference supplies the layout rhythm; current design tokens supply colours and type. User feedback in this task supersedes earlier three-tab, lime-star and permanently expanded tool-picker decisions.

The production UI has a closed refrigerant selector inside each calculator, with search and favourites visible only when opened. The Tools menu is always available and includes direct comparison. The detail card has Overview, Properties, Restrictions and Sources; repeated provenance is collapsed under Tietojen tausta. Chemical formulas use subscripts. Restriction rows use a single chevron, neutral mono dates, filtering and incremental expansion. Favourites use yellow; removal has a red Undo notification that expires after five seconds.

Charge and unit controls have matching heights. Reusable i-circle buttons provide click/touch/keyboard help for equipment type, assessment date, GWP basis and rules region. Escape, moving focus away and outside clicks close the help. Both the visible basis and numeric GWP appear in the CO₂e result.

## Final logo mapping

The user's final correction is authoritative: light theme uses `phasekit-logo-light.svg`; dark theme uses `phasekit-logo-dark.svg`. Both header and favicon follow this mapping. Public assets match the supplied masters byte-for-byte and both are cached offline. Earlier opposite-mapping screenshots are superseded by the captures below.

## Inspected production captures

Screenshots are kept outside the source repository. Each filename records its Chromium viewport project; mobile uses 390×844 and desktop uses 1440×900. Full-page screenshots include the fixed bottom navigation at the viewport's capture position; scrolling was separately exercised by browser workflows.

- Tools menu: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-tools.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-tools.png>).
- Closed selector and aligned fields: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-check.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-check.png>).
- Opened field help: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-help.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-help.png>).
- Superheat result: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-shsc.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-shsc.png>).
- Restrictions tab: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-restrictions.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-restrictions.png>).
- English dark P–T calculator: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-pt-dark.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-pt-dark.png>).
- Final light logo: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-logo-light.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-logo-light.png>).
- Final dark logo: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-mobile-chromium-logo-dark.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v2/phasekit-v2-desktop-chromium-logo-dark.png>).

Automated checks passed for keyboard operation, 200% text without page-level horizontal overflow, and axe rules on the exercised views. These are scoped browser checks; physical-device scaling, VoiceOver/TalkBack and user-pilot review remain unperformed release gates. See [VERIFICATION.md](VERIFICATION.md) and [RELEASE-GATES.md](RELEASE-GATES.md).


## V3 visual review — 25 September 2026

The v3 captures supersede earlier picker and P–T layouts above. Inspected the compact refrigerant selector with its family, custom checkbox and decisive CO₂e output, R142b properties, the modal favourites list, English dark P–T and the light log(p)–h cycle. The numeric GWP value has reserved layout width; favourite yellow now wins over the old lime CSS. The final p–h desktop chart shows the entire calculated cycle. Mobile uses an explicitly labelled horizontal scroll region so axes and numbers remain readable; keyboard access and 200% text were checked. Plot connections are schematic, with the isenthalpic segment dashed and bounded saturation curves left open.

Captures are outside the source repository:

- Leak-check selection and result: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-check.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-check.png>).
- Refrigerant picker: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-picker.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-picker.png>).
- P–T live calculation: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-pt.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-pt.png>).
- R142b properties: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-properties.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-properties.png>).
- Log(p)–h chart: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-ph-chart.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-ph-chart.png>).
- Log(p)–h full view: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-ph.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-ph.png>).
- English dark log(p)–h: [mobile](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-mobile-chromium-ph-dark.png>), [desktop](</Users/hupli/.codex/visualizations/2026/09/25/01a0d8ee-b6e7-7211-8a55-82566c694361/phasekit-v3/phasekit-v3-desktop-chromium-ph-dark.png>).
