# Operating assessment (Käyttöarvio)

Route: `#/assessment`. The tool is listed with the other calculators. It is a beta-channel aid for reading a refrigeration circuit from the measurements a technician or student actually has. It is not a diagnostic expert system, a certification, or a substitute for the equipment instruction.

## What it shows

The circuit drawing follows the selected system and mode:

- Air-to-air and hydronic heat pumps reverse the indoor and outdoor heat exchangers between cooling and heating. The gas line is suction in cooling and hot gas in heating. That is the usual service-port role, and it can be changed or left unknown.
- Cooling-only equipment stays in cooling.
- Industrial equipment uses a separate compressor, high-side and evaporator drawing. Its port role starts unknown.

A confirmed suction temperature above the dew point is superheat. A hot-gas temperature is the difference from the high-side dew point and is never labelled suction superheat. Subcooling needs a liquid pressure and a liquid temperature and uses the bubble point. A missing temperature leaves that difference uncalculated. An unknown port role still shows the saturation temperature at the measured pressure and withholds superheat and high-side conclusions.

Gauge pressure is converted with the entered atmospheric reference once. An optional gauge uncertainty widens the saturation and difference; it is not added to the atmosphere a second time. The displayed temperature follows the saturation table’s 0.1 °C interpolation tolerance. The tolerance is stated separately and is not folded into the gauge band.

## Fluids

Any refrigerant with an offline saturation curve can be used. R134a, R32 and R449A are covered by that table. R449A glide at the measured pressure is dew point minus bubble point. The nominal atmospheric glide is not substituted.

R744 uses the catalogue critical pressure, 73.773 bar(a), from the CoolProp identity fact. At or above it, the high side has no condensing temperature: the heat exchanger is a gas cooler and subcooling is not calculated. The saturation table ends near 68.9 bar(a), below the critical pressure. A pressure in that gap is reported as outside the table, not extrapolated and not called transcritical. A subcritical evaporator pressure still has a saturation temperature.

R717 keeps the same saturation arithmetic and adds the industrial distinction: a flooded evaporator does not turn low superheat into a shortage, and the view does not replace the plant instruction or a safety assessment.

## What it does not decide

Low suction pressure can support a refrigerant-shortage suspicion. The same reading can also come from load, airflow or liquid flow, or a restriction. The tool states that direction, the measurements that separate the explanations, and that one pressure is not a reason to add refrigerant.

High-side pressure is not compared with a universal limit. A normal or abnormal verdict is given only against figures the user types from the equipment instruction, and those figures stay labelled as entered values. No COP or capacity-for-a-building number is calculated from pressure and temperature. Temperature lift, when both sides are subcritical, is identified as lift rather than efficiency. Stabilisation time is not invented; the equipment instruction is the reference.

The example button fills labelled demo figures. Their provenance remains visible through edits, unit conversions and mode changes; Clear values starts a fresh measured draft. Blank R744/R717 selections start with industrial context and an unknown port role.

## Sources

Saturation values come from the offline CoolProp 7.2.0 HEOS table described in [THERMODYNAMICS.md](THERMODYNAMICS.md). The critical point comes from the refrigerant’s verified catalogue fact. Qualitative separation of shortage, airflow and restriction follows the direction discussed by Cole-Parmer’s HVAC-R troubleshooting article, without copying its figures as limits. Industrial ammonia and CO₂ context is the reason the industrial drawing is separate; Danfoss application guide AB137786416217 is cited for that distinction and its limits are not copied. A Mitsubishi service manual is cited only as an example that target pressures and stabilisation are model-specific. Honeywell’s published R449A table is cited to show that bubble and dew differ; the numbers on screen come from the CoolProp table.

## Release boundary

The tool is developed on a branch targeting `beta`. Merging that branch into `beta` deploys https://beta.phasekit.app through the existing beta Netlify project. It does not deploy https://phasekit.app. See [the beta workflow](BETA-RELEASE-WORKFLOW.md).


## Beta 0.5.0-beta.6 refinement

The primary result precedes the diagram. System/mode and the atmospheric reference
use disclosures; entered pressure always shows its gauge/absolute unit. Repeated
saturation arithmetic is under “Pressure and calculation”, while out-of-domain
and critical-pressure explanations remain visible. Diagram labels remain legible
on mobile, unknown ports are detached, and liquid measurement points are upstream
of (and separate from) the expansion valve in both operating directions.

R744 critical pressure is displayed to three decimals, including equality at
73.773 bar(a). Suction and unknown roles never acquire a high-side label solely
from pressure. The lower saturation-table boundary is distinguished from the gap
below critical pressure. R717 unknown evaporator type remains an open hypothesis,
even with an entered superheat target; flooded wording does not classify measured
superheat as small. No universal shortage, superheat or subcooling fault threshold
has been introduced.

Verification: 19 core cases, plus the operating-assessment browser spec on desktop
and mobile Chromium and WebKit. Regression coverage includes critical boundaries,
port roles, unknown/flooded ammonia, sample provenance and diagram/result layout.
