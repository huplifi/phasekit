# Calculation and data boundaries

PhaseKit separates four concerns: the CSV-backed refrigerant dataset, pure calculation functions in `packages/core`, regional rule data and evaluation in `packages/rulesets/eu-fi`, and the React interface. The rule engine reads a supplied immutable `Dataset` and `CheckInput`, then returns an explicit `CheckResult`. It performs no network or storage operation. UI language does not enter the engine, so Finnish and English produce the same calculation and translate only reason codes.

## Pressure convention and thermodynamic data

All property providers use **absolute** pressure internally. Gauge values are converted using an explicit atmospheric reference: the interface defaults to 1.01325 bar(a), displays that assumption and permits a local measured value. Unit changes convert existing measurements instead of silently reinterpreting them. `packages/core/src/units.ts` uses decimal arithmetic for kg/g and bar, kPa, MPa and psi.

The versioned offline P–T and p–h providers identify their sources, supported ranges and interpolation tolerances. Dew temperature is used for superheat and bubble temperature for subcooling. The combined cycle tool preserves valid signed SH/SC results even if the p–h domain cannot support a diagram. See THERMODYNAMICS.md and PH-THERMODYNAMICS.md for current support and limits.

## Version and offline update model

The app caches a versioned shell, dataset and rule code together. A calculation uses the dataset object loaded when it starts; it must not silently switch sources mid-edit. Each saved `CheckResult` includes a copy of its input, component calculations, obligations, data version and ruleset version. The snapshot also freezes the selected refrigerant, relevant source records and component designations. Older version-1 backups without component designations display stable saved IDs rather than borrowing names from a newer dataset. Opening an old result displays its stored decision and provenance. Recalculation with a later dataset is a separate user action that produces a new result. A SHA-256 manifest lets the app identify the exact dataset artifact used offline. A stale offline copy must display its checked date and version, not imply current legal status.

IndexedDB writes are serialised. A calculation is announced as saved only after its write resolves; failure leaves the draft unsaved and permits retry. A PWA update waits for queued writes, stops if persistence failed, and asks for an explicit discard if the active calculation has unsaved changes. A failed write is never converted into a successful update barrier.

## Fail-closed states

Missing legal annex classification, Annex I GWP basis/source or verified mixture fractions yields `insufficient_data`. Unsupported equipment paths, old dates without a historical ruleset, and unresolved mixed-gas interpretations yield `unsupported`. `outside_rule_scope` is reserved for positively classified natural refrigerants or known equipment outside the stated periodic rules. `exempt` requires a sourced exception and all required conditions. `below_threshold` follows a completed calculation below every applicable threshold. These states remain distinct in the UI and saved snapshots.

The rule constants are a declarative threshold table. The `evaluateTier` function compares exact decimal scores against that table; `evaluateCheck` applies equipment scope, exceptions, both Annex I and Annex II(1) obligations, and Article 6 detector requirements. The legal evidence and independent expected vectors are in [RULES.md](./RULES.md).
