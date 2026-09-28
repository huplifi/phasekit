# Electrical calculator: inverse calculations

Introduced in 0.3.0-beta.3 at `#/electrical`. Extends the existing calculation and report paths without changing the stored record kind.

## Known quantities and selected unknown

DC, single-phase AC and balanced three-phase AC solve real input power P (W), current I (A), or voltage U (V). AC requires an explicit power factor. For three-phase calculations U is line-to-line voltage and I is line current. The existing sinusoidal/RMS and balanced-load limits remain in force.

The existing formula `P = k U I PF` is rearranged for current or voltage; k is 1 for DC/single-phase and √3 for three-phase. DC uses PF = 1. Enter electrical input power, not motor shaft power or heating output. Efficiency, cable and protective-device sizing are outside this calculation.

Ohm's law for a resistive DC circuit solves U, I or positive R from the other two using `U = I R`.

Only required inputs are parsed. Magnitudes must be non-negative. Zero power is valid with a positive inverse denominator; a zero denominator is rejected even when both numerator and denominator are zero, because there is no unique result. A zero power factor remains valid for forward real-power calculation but cannot determine current/voltage from real power. Resistance remains strictly positive.

## Sources and retained records

Formula basis rechecked 28 September 2026:

- [Schneider Electric, Installed apparent power](https://www.electrical-installation.org/enwiki/Installed_apparent_power_%28kVA%29): single-/three-phase current, voltage definitions and the active/apparent power relationship.
- [Fluke, What is Ohm's law?](https://www.fluke.com/en-sg/learn/blog/electrical/what-is-ohms-law): U/I/R rearrangements.

The new `Electrical solve for` report input identifies the selected result independently of the heat calculator's solve modes. Reports freeze the relevant known inputs, calculation mode, assumptions and outputs. The selected unknown is the main result in the report list and print card. Older records without the selector retain their former power/Ohm headline behaviour. The storage schema and `electrical` record kind are unchanged.
