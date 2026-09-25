# Verification record

Updated 25 September 2026 for the local PhaseKit v3 web candidate.

## Checks

| Check | Result |
| --- | --- |
| `pnpm build` | Passed; TypeScript, data build and production PWA assets generated. |
| `pnpm lint` | Passed, zero warnings. |
| `pnpm test` | 146 tests across 10 files passed. |
| `pnpm data:validate` | Passed: 249 refrigerants, 43 sources. |
| Chromium browser workflows | 52/52 passed at 390×844 mobile/touch and 1440×900 desktop. |

Browser coverage includes FI/EN, both themes, axe checks, keyboard help and modal focus, 200% text without page overflow, favourites, comparison, direct refrigerant links, saved calculations, offline reload, P–T bidirectional entry and unit conversion, SH/SC, CO₂e conversion and log(p)–h. After the final PH chart sizing and removal of the unused quality-estimate field, all 6 PH browser checks passed again.

Integration testing found and fixed the accidental Properties-tab rename, internal Fahrenheit precision rejection, stale refrigerant state on direct leak-check navigation, and inaccessible scrolling chart/table regions. Test setup was corrected to reload after service-worker activation before going offline; it does not assume a first-load controller when the worker does not claim clients.

## Data and calculation scope

Dataset `2026-09-25.f4c6e6e3fbfc`, SHA-256 `f4c6e6e3fbfc60314deb6f9f214149b9c5cd6ad350d0a6aaaba8ca927a8d8294`.

The imported source union grew from 205 to **249 records**, with 183 source-backed blend mass recipes. All recipes sum exactly to 100%. There are 66 records marked pure, including the documented pseudo-pure Air model; this is not a count of chemically pure substances. The union is not an exhaustive register of all known refrigerants.

| Coverage | Records |
| --- | ---: |
| Safety class | 167 |
| ODP | 129 |
| Typical oil code | 121 |
| Alternative oil code | 81 |
| Normal boiling point | 125 |
| Autoignition temperature | 4 |
| Numeric lower flammability limit | 6 |
| Source-backed EU/FI legal class or component classification | 208 |
| Offline P–T model | 124 |
| Offline p–h model | 113 |

Names, recipes, oils, law and thermodynamics have separate provenance. Missing fields remain unknown rather than zero. R13I1/R40 ODS Annex II handling, R485A conflicting safety classification and many ignition/density/PED properties remain incomplete. See [coverage](COVERAGE.md), [data audit](DATA-V3-AUDIT.md) and [architecture](DATA-ARCHITECTURE.md).

P–T uses `pt-2026-09-25.abf00eafe8777a3e`: 30,564 held-out evaluations, maximum tested pressure error 0.0961% and inverse-temperature error 0.0238 °C. P–h uses `ph-2026-09-25.d8daa2309a3dda04`: 29,741 held-out evaluations, no source failures, maximum tested enthalpy interpolation error 1.896 kJ/kg against the 2 kJ/kg acceptance threshold. These measure interpolation against CoolProp, not total physical measurement/model uncertainty. Reported PH superheat/subcooling use the same dense P–T provider as the standalone tool.

The log(p)–h chart is a bounded subcritical model with saturation boundaries and schematic point connections; it is not a full process simulator. Point 4 assumes h4=h3. No COP, electrical power or blend vapour quality is inferred. Unsupported substances and invalid phase/range inputs remain blocked. See [P–T](THERMODYNAMICS.md) and [p–h](PH-THERMODYNAMICS.md) model documentation.

## Packaging and remaining limits

The PWA precaches 34 entries, about 5.51 MiB, including both thermo models, source data, fonts and transparent theme logos. Main JavaScript is approximately 771 kB gzip. Vite's uncompressed chunk warning remains non-fatal. Local preview is available on port 4173; existing installed service workers may show the app's update prompt before using this build.

These checks establish a local browser candidate. Physical iOS/Android installs, VoiceOver/TalkBack, store packages, developer signing and a qualified engineering/regulatory review have not been completed. Native packaging remains the later stage requested by the user. No store release is claimed. The public Sites deployment completed on 25 September 2026; see [deployment record](DEPLOYMENT.md).

## Final diagram refinement

The chart now uses a denser enthalpy grid and logarithmic pressure subdivisions, with separate high/low-pressure guides. The four calculated cycle connections retain horizontal pressure legs, vertical h3=h4 expansion and sloping compression. Labels use Imu, Kuumakaasu and Neste, with measurement-location help. Build/typecheck and lint pass; all 6 mobile/desktop PH browser checks passed again, including cycle geometry, offline use, unit conversion and accessibility. The chart still does not include temperature, entropy or specific-volume isolines.

## PH boundary diagnostics

The boundary error now identifies the blocked T1/T2/T3 point, entered temperature, absolute pressure, model saturation temperature and signed temperature offset. It distinguishes the table limitation from an equipment requirement. Enthalpy values and the 1 K calculation boundary are unchanged. All 8 PH unit tests and 6 PH mobile/desktop browser tests, build/typecheck and lint passed. Exact reproduction of the user report awaits both pressures and gauge/absolute selection; the screenshot alone supplies T2=60 °C, T3=35 °C and the follow-up supplies T1=0 °C.

## Signed input on mobile

Temperature inputs in PH, PT and SH/SC now request the standard text keyboard so mobile users can access a minus sign. Gauge pressure inputs use the same keyboard; positive-only quantities retain the decimal keypad. Negative comma-decimal PH input is exercised end to end. Build/typecheck and lint pass. Of 28 tool browser checks, 26 passed initially; two new assertions expected an ASCII minus instead of the Finnish locale Unicode minus. After correcting that test expectation, both passed on rerun. Physical iOS keyboard behaviour has not been tested on a device.

## Combined SH/SC tool

The SH/SC tool now accepts LP and HP together and named suction, hot-gas and liquid measurements. It calculates superheat from LP/dew and suction, and subcooling from HP/bubble and liquid, in one submit. Hot gas is an optional measurement displayed with the result and does not affect either temperature difference. Both outputs clear together on changes; both pressure values and all three temperature values convert together. Reversed pressure levels and below-absolute-zero temperatures are blocked. Gauge atmosphere edits preserve the readings.

Build/typecheck and lint passed; all 24 selected tool browser checks passed, covering paired values, Fahrenheit, gauge conversion, negative comma-decimal input, invalid pressure order, accessibility, CO2e and existing tools. Both paired-calculator browser cases passed again after compacting the unit controls; the mobile screenshot was inspected.

## Unified refrigeration-cycle tool and supplied R134a example

The old `/ph` and `/shsc` routes now use one refrigeration-cycle form and one tool-menu entry. SH/SC results are independent of diagram availability, missing/invalid hot-gas input, the PH table's 1 K offset restriction and PH phase/range failures. Signed differences remain signed; the subtraction is displayed explicitly. A diagram failure has its own status message and does not erase valid SH/SC values. All outputs invalidate together on edited measurements.

The supplied paper example was reproduced in the browser with R134a, LP 1.91 bar(g), HP 9.15 bar(g), suction 10 °C, hot gas 60 °C, liquid 35 °C and reference atmosphere 1.01325 bar(a). It gives SH 10.019231 K and SC 5.010938 K, and all four cycle lines render on mobile and desktop. Absolute pressures are 2.92325 and 10.16325 bar. The paper states SH 10.04 K and SC 4.99 K; the small difference is not treated as exact agreement. With suction 0 °C at the same LP, the PH table's near-saturation restriction still applies, while the temperature difference can be shown. This release does not expand the PH interpolation domain.

Build/typecheck and lint pass. Thirty of 32 selected browser cases passed initially; two migrated offline tests still used the old exact implicit-label selector. After updating the selector, both offline tests passed, and two new paper-example tests also passed: 34 distinct cases verified in total. Negative SH (-10 K), positive subcooling, positive offsets below 1 K, invalid optional hot-gas text, gauge/Fahrenheit conversions, accessibility, shared routes and existing calculators are covered. The paper-example chart screenshot was inspected.

## Mobile form refinements — 2026-09-26

Cycle unit controls align to the right on narrow screens; LP/HP share a row and the three temperature inputs sit beside their labels. The leak-check date control has an explicit shrinkable border-box width and retains native date editing. The PT slider is removed and subgrid aligns the conversion icon to the input row. Touch refrigerant selection keeps focus on the dialog's close button, leaving the list visible; fine-pointer desktop search retains autofocus. Search explicitly disables autocomplete, autocorrection and capitalisation, with a refrigerant-specific input name.

CO2e keeps its existing gated calculation: a compact kg / t CO2e selector replaces the separate direction dropdown, resets the input/result on a changed direction and preserves input on reselecting the active unit. The long conversion explanation is contextual help and the heading uses the same SVG icon as PT. Calculation math and refrigerant data are unchanged.

Build/typecheck and lint pass. Forty-eight distinct browser cases passed across Chromium mobile/desktop and a targeted WebKit mobile project: geometry, date editing at 390 and 320 px, input-centred arrows, keyboard/touch focus, favourites and focus return, contextual help accessibility, first-viewport CO2e submit visibility, both conversion directions, offline tools and the supplied R134a cycle example. One initial new test used the wrong translated button name; the corrected selector passed, and all 17 final layout/picker cases passed after the heading alignment finish. Local screenshots were inspected. Physical iPhone keyboard and contact AutoFill UI were not tested; browsers may ignore autocomplete preferences. The existing large-bundle build warning remains.

## GitHub / Netlify baseline — 2026-09-26

The complete local suite passed before the initial GitHub publication: 149 unit/integration tests across 10 files, 76 browser cases (Chromium mobile/desktop and targeted mobile WebKit), lint and production build/typecheck. The Node runtime used locally was 26.7.0. CI and Netlify are configured for Node.js 24; their remote execution is separate evidence and is not implied by the local results.

The public source baseline includes all mobile refinements, English project documentation, the original-code MIT licence, third-party notices and a Netlify static deployment configuration. Native source handoff archives and the old Sites mirror remain local and ignored. Font licence text is retained verbatim, including upstream whitespace. See DEPLOYMENT.md for the hosting transition and unconfirmed domain steps.


The first GitHub Node.js 24 / Ubuntu run passed clean dependency installation, data validation, lint, typecheck, unit tests and the production build. Browser checks exposed macOS-specific `/private/tmp` screenshot destinations: 38 cases failed while writing screenshots, with the other 38 passing. Screenshot paths now use Playwright's per-test output directory, so they are portable and isolated between retries. CI preserves browser failure artifacts for diagnosis.
