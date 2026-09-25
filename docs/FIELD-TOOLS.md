# Field tools

These tools are part of the preview feature branch. They must not be deployed to the production domain as part of preview validation.

## Liquid thermal power

Route: `#/thermal-power`. The calculator evaluates sensible heat transfer:

`P [kW] = density [kg/m³] × volume flow [m³/s] × specific heat [kJ/(kg·K)] × (outlet − inlet) [K]`.

The user supplies density and specific heat. There are no hidden water or glycol presets. Use supplier properties for the actual fluid composition and average operating temperature. The approximation assumes a single-phase liquid and constant properties across the interval; it is unsuitable for evaporation or condensation. Flow supports l/s, l/min and m³/h.

A positive result means heat enters the fluid; a negative result means heat leaves it. Zero flow or zero temperature difference produces zero power. Density and specific heat must be strictly positive; flow must be non-negative. Temperatures below absolute zero are rejected. This output is fluid heat transfer, not electrical input, shaft output or COP.

Basis: [Caleffi, On-Site Measurements of Circuit Performance](https://www.caleffi.com/en-us/blog/3-site-measurements-circuit-performance), sensible-heat rate and use of fluid properties at average temperature. Accessed 26 September 2026. The implementation uses SI units rather than the article's imperial conversion constant.

## Electrical calculator

Route: `#/electrical`. Modes:

- DC power: `P = U × I`.
- DC resistive load / Ohm's law: `I = U / R`, then `P = U × I`.
- Single phase: `S = U × I`, `P = S × PF`.
- Balanced three phase: `S = √3 × U(line-to-line) × I(line)`, `P = S × PF`.

AC uses RMS quantities and sinusoidal conditions (`PF = cos φ`). Three-phase voltage is explicitly line-to-line, and current is the current in one line, not the sum of three currents. The load must be balanced. These are electrical input quantities: no motor efficiency or shaft power is inferred. No cable, fuse or protective-device sizing is provided.

Voltage and current must be non-negative; resistance must be strictly positive. Power factor must be explicitly entered in [0, 1], including the valid zero boundary. Empty fields and non-numeric values block calculation.

Sources accessed 26 September 2026:

- [Schneider Electric, Electrical Installation Guide: Installed apparent power](<https://www.electrical-installation.org/enwiki/Installed_apparent_power_(kVA)>) — single/three-phase apparent power, voltage interpretation, power factor and efficiency.
- [Fluke, What is Ohm's law?](https://www.fluke.com/en-sg/learn/blog/electrical/what-is-ohms-law) — voltage, current and resistance relationship.

## Pipe volume and mean velocity

Route: `#/pipe`. Straight circular bore geometry:

`A = πd²/4`, `V = A × length`, `mean velocity = actual volume flow / A`.

The input is **internal diameter**, not nominal pipe size or outside diameter. Volume flow is at the pipe's operating conditions, not a standard-gas flow. Zero length or flow is valid; diameter must be positive. The output is a geometric calculation, not a refrigerant pipe-sizing recommendation. Fittings, compressibility along a run, pressure losses, two-phase flow and oil return are outside scope.

Sources accessed 26 September 2026: [Wolfram MathWorld, Cylinder](https://mathworld.wolfram.com/Cylinder.html), and [NASA Glenn, Conservation of Mass](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/conservation-of-mass/).

## Saving calculations

Successful thermal, electrical and pipe calculations offer the shared Save calculation control. The record retains inputs, units, outputs, assumptions and source references, and can be associated with equipment through the shared record system. Editing an input removes the old output and its save control. Recalculation creates a fresh save state.

## Work checklists

Route: `#/checklists`. Three original PhaseKit recording templates:

- Pressure and tightness test.
- Evacuation.
- Commissioning.

Each record includes an equipment/site identifier, date/technician, manufacturer instruction reference, checked steps, free-form measurements and notes. Targets, test media, pressure references, units, durations and acceptance criteria must be recorded from equipment-specific instructions. PhaseKit supplies no universal test pressure, vacuum or hold-time target. Non-applicable items and deviations can be explained in notes. Marking every step does not declare a pass or certify compliance.

The templates are recording aids, not a substitute for equipment instructions or a complete service procedure. Background reference: [Copeland, Refrigeration Manual Part 5: Installation and Service](https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEM&PDF=AE-105), accessed 26 September 2026. Its equipment and procedure-specific limits are deliberately not copied as generic defaults.

Drafts use the existing application `UserData` persistence and backup flow, with no separate database. The UI permits multiple lists, reopening, editing, confirmed deletion and plain-text download. Downloads include unchecked steps, recorded measurements and the non-certification note. Lists are capped at 1,000; each field and title has a 2,000-character limit and notes have a 10,000-character limit. Older backups initialise an empty checklist array through the storage schema.

## Verification

`packages/core/src/field-tools.test.ts` covers direction/sign, flow-unit equivalence, zero cases, invalid inputs, electrical phase conventions, power-factor boundaries, pipe geometry and text export semantics. `tests/e2e/field-tools.spec.ts` covers usable calculations, stale-result clearing, checklist persistence and export, plus mobile overflow and accessibility. Browser tests must run against a fresh integrated preview build.
