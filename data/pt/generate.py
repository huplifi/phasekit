#!/usr/bin/env python3
"""Generate bounded offline saturation tables from CoolProp 7.2.0.

Run with PYTHONPATH pointing at a project-local CoolProp installation. The
generator reads canonical identities but never changes the canonical dataset.
"""
import csv
import hashlib
import json
import math
import re
import subprocess
import sys
from datetime import date
from itertools import combinations
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data"))
from coolprop_runtime import load_supplement

MODEL_SUPPLEMENT = load_supplement()
VERSION = "7.2.0"
GITREVISION = "98b3523d5daa98454618d381d2ae53f7471d216b"
IDENTITY_SOURCE_COMMIT = "afce86ff977552663ca3a78d8ea318cc64dcbdfd"
IDENTITY_SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/private/tmp/phasekit-coolprop")
assert cp.get_global_param_string("version") == VERSION
assert cp.get_global_param_string("gitrevision") == GITREVISION
assert subprocess.check_output(["git", "-C", str(IDENTITY_SOURCE), "rev-parse", "HEAD"], text=True).strip() == IDENTITY_SOURCE_COMMIT
SOLVER_FAILURES = json.loads((ROOT / "data/pt/solver-failures.json").read_text())
assert SOLVER_FAILURES["coolPropGitRevision"] == GITREVISION


def slug(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


with (ROOT / "data/refrigerants.csv").open(newline="") as stream:
    records = list(csv.DictReader(stream))

pure_names = {}
for file in (IDENTITY_SOURCE / "dev/fluids").glob("*.json"):
    raw = json.loads(file.read_text())
    info = raw.get("INFO", {})
    for label in [file.stem, info.get("NAME", ""), *info.get("ALIASES", [])]:
        pure_names[slug(label)] = file.stem

mixture_names = {slug(name[:-4]): name for name in cp.get_global_param_string("predefined_mixtures").split(",") if name.lower().endswith(".mix")}


# Exact blend-specific equations of state (Lemmon 2003), not substitute fluids.
# Keep the catalogue kind as blend and publish both Q=0 and Q=1 branches.
BLEND_EOS = {name.lower(): name for name in ("R404A", "R407C", "R410A", "R507A")}

# Reviewed exact mass recipes; only built-in HEOS binary parameters are used.
EXPLICIT_BLEND_IDS = {"r452b", "r454c", "r455a", "r513b"}
explicit_blends = {}
record_by_id = {record["id"]: record for record in records}
with (ROOT / "data/components.csv").open(newline="") as stream:
    component_rows = list(csv.DictReader(stream))
for rid in sorted(EXPLICIT_BLEND_IDS):
    assert record_by_id[rid]["composition_status"] == "verified"
    parts = [row for row in component_rows if row["refrigerant_id"] == rid]
    assert len(parts) >= 2 and abs(sum(float(part["mass_fraction"]) for part in parts) - 1) < 1e-12
    model_parts = []
    for part in parts:
        record = record_by_id[part["component_refrigerant_id"]]
        name = pure_names[slug(record["designation"])]
        assert cp.get_fluid_param_string(name, "CAS") == record["cas_number"]
        model_parts.append({
            "refrigerantId": record["id"], "coolPropFluid": name,
            "massFraction": part["mass_fraction"], "sourceId": part["source_id"],
            "molarMassKgMol": cp.PropsSI("M", name),
        })
    # AbstractState construction fails if an interaction pair is absent.
    state = cp.AbstractState("HEOS", "&".join(part["coolPropFluid"] for part in model_parts))
    state.set_mass_fractions([float(part["massFraction"]) for part in model_parts])
    fractions = state.get_mole_fractions()
    for part, fraction in zip(model_parts, fractions):
        part["moleFraction"] = fraction
    pairs = [{"components": [a["refrigerantId"], b["refrigerantId"]],
              "policy": "built_in_HEOS_parameters_only"} for a, b in combinations(model_parts, 2)]
    name = "HEOS::" + "&".join(f'{part["coolPropFluid"]}[{part["moleFraction"]:.17g}]' for part in model_parts)
    explicit_blends[rid] = {"coolPropFluid": name, "components": model_parts, "binaryPairs": pairs}


def cp_name(record):
    designation = record["designation"]
    candidates = [designation, pure_names.get(slug(designation))] if record["kind"] == "pure" else [BLEND_EOS.get(record["id"]), explicit_blends.get(record["id"], {}).get("coolPropFluid"), mixture_names.get(slug(designation))]
    for name in candidates:
        if not name:
            continue
        try:
            cp.PropsSI("Tmin", name)
            return name
        except ValueError:
            pass
    return None


def pressure(fluid, kelvin, side):
    try:
        value = cp.PropsSI("P", "T", kelvin, "Q", 0 if side == "bubble" else 1, fluid) / 100000
        return value if math.isfinite(value) and value > 0 else None
    except (ValueError, OverflowError):
        return None


def refine(fluid, side, left, right, depth=0):
    """Split until log-pressure interpolation misses by under 0.12%."""
    middle = (left[0] + right[0]) / 2
    actual = pressure(fluid, middle, side)
    if actual is None:
        return None
    # A solver can fail inside an interval even when its midpoint succeeds.
    # Never bridge that hole with an apparently valid interpolation segment.
    if pressure(fluid, (3 * left[0] + right[0]) / 4, side) is None or pressure(fluid, (left[0] + 3 * right[0]) / 4, side) is None:
        return None
    model_log = (math.log(left[1]) + math.log(right[1])) / 2
    if right[1] <= left[1]:
        return None
    inverse_t = left[0] + (right[0] - left[0]) * (math.log(actual) - math.log(left[1])) / (math.log(right[1]) - math.log(left[1]))
    if abs(math.log(actual) - model_log) <= 0.0012 and abs(inverse_t - middle) <= 0.05:
        return [left, right]
    if depth >= 11:
        return None
    l = refine(fluid, side, left, (middle, actual), depth + 1)
    r = refine(fluid, side, (middle, actual), right, depth + 1)
    return l[:-1] + r if l and r else None


domain_limits = {}


def build_side(fluid, side, rid):
    # Do not invent model bounds when a query fails.
    model_minimum = cp.PropsSI("Tmin", fluid)
    triple = cp.PropsSI("Ttriple", fluid)
    minimum = max(model_minimum, triple)
    maximum = cp.PropsSI("Tmax", fluid)
    try:
        critical = cp.PropsSI("Tcrit", fluid)
        margin = 3 if critical > 180 else max(critical * 0.02, 0.05)
        high = min(critical - margin, maximum)
    except ValueError:
        critical = None
        # Mixture critical queries may fail. Tmax is only a search ceiling;
        # the published boundary must come from successful saturation solves.
        high = maximum
    low = minimum + min(1, max((high - minimum) * 0.03, 0.05))
    domain_limits[fluid] = {
        "modelMinimumTemperatureC": model_minimum - 273.15,
        "modelReportedTripleTemperatureC": triple - 273.15,
        "effectiveLowerBoundC": minimum - 273.15,
        "modelMaximumTemperatureC": maximum - 273.15,
        "modelCriticalTemperatureC": critical - 273.15 if critical is not None else None,
        "searchMinimumTemperatureC": low - 273.15,
        "searchMaximumTemperatureC": high - 273.15,
        "lowerPolicy": "above_model_minimum_and_reported_triple_point",
        "upperPolicy": "critical_margin_or_model_maximum" if critical is not None else "validated_solver_interval_below_model_maximum",
    }
    if high <= low:
        return None
    step = min(5, (high - low) / 25)
    coarse = []
    t = low
    while t <= high:
        coarse.append((t, pressure(fluid, t, side)))
        t += step
    if high > low and (not coarse or high - coarse[-1][0] > max(step * 0.05, 1e-6)):
        coarse.append((high, pressure(fluid, high, side)))
    # Evaluate every interval. An early solver hole must not discard a later
    # useful range; conversely no failed interval may be interpolated across.
    sections = []
    exclusions = [failure["temperatureC"] + 273.15 for failure in SOLVER_FAILURES["failures"]
                  if failure["refrigerantId"] == rid and failure["side"] == side]
    for left, right in zip(coarse, coarse[1:]):
        if left[1] is None or right[1] is None:
            continue
        if any(left[0] <= failed + SOLVER_FAILURES["guardK"] and right[0] >= failed - SOLVER_FAILURES["guardK"] for failed in exclusions):
            continue
        section = refine(fluid, side, left, right)
        if section is not None:
            sections.append(section)
    runs, run = [], []
    for section in sections:
        if run and run[-1] != section[0]:
            runs.append(run)
            run = []
        run.extend(section[1:] if run else section)
    if run:
        runs.append(run)
    candidates = []
    for nodes in runs:
        # Significant digits keep sub-microbar pressures distinct.
        published = [[round(t - 273.15, 10), float(f"{p:.15g}")] for t, p in nodes]
        valid_run = []
        for left, right in zip(published, published[1:]):
            valid = right[0] > left[0] and right[1] > left[1]
            for fraction in (0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1):
                t = left[0] + (right[0] - left[0]) * fraction
                actual = pressure(fluid, t + 273.15, side)
                if actual is None:
                    valid = False
                    break
                predicted = math.exp(math.log(left[1]) + (math.log(right[1]) - math.log(left[1])) * fraction)
                inverse_t = left[0] + (right[0] - left[0]) * (math.log(actual) - math.log(left[1])) / (math.log(right[1]) - math.log(left[1])) if right[1] > left[1] else math.inf
                if abs(predicted / actual - 1) >= 0.003 or abs(inverse_t - t) >= 0.1:
                    valid = False
                    break
            if valid:
                if not valid_run:
                    valid_run = [left]
                valid_run.append(right)
            else:
                if len(valid_run) >= 3:
                    candidates.append(valid_run)
                valid_run = []
        if len(valid_run) >= 3:
            candidates.append(valid_run)
    if not candidates:
        return None
    # Compare temperature span, not node count (cold regions need more nodes).
    return max(candidates, key=lambda nodes: nodes[-1][0] - nodes[0][0])


curves = {}
unavailable = {}
for index, record in enumerate(records, 1):
    rid = record["id"]
    fluid = cp_name(record)
    if not fluid:
        unavailable[rid] = "no_exact_coolprop_fluid_or_predefined_mixture"
        continue
    sides = {side: build_side(fluid, side, rid) for side in ("bubble", "dew")}
    sides = {side: points for side, points in sides.items() if points}
    if not sides:
        unavailable[rid] = "no_valid_bounded_saturation_curve"
        continue
    curves[rid] = {"coolPropFluid": fluid, "sides": sides}
    if index % 25 == 0:
        print(f"{index}/{len(records)} rows scanned, {len(curves)} supported", flush=True)

curve_hash = hashlib.sha256(json.dumps(curves, separators=(",", ":"), sort_keys=True).encode()).hexdigest()[:16]
generated_date = date.today().isoformat()
data_version = f"pt-{generated_date}.{curve_hash}"
output = {
    "schema": "phasekit-pt-1",
    "dataVersion": data_version,
    "curveSha256Prefix": curve_hash,
    "source": "CoolProp 7.2.0 HEOS with pinned upstream pure-fluid EOS supplement",
    "sourceIds": ["coolprop-pt-7.2.0", MODEL_SUPPLEMENT["sourceId"], "unep-ozone-oewg47-inf3-rev1"],
    "modelSupplement": MODEL_SUPPLEMENT,
    "explicitBlendRecipes": explicit_blends,
    "sourceUrl": "https://github.com/CoolProp/CoolProp/tree/v7.2.0",
    "coolPropGitRevision": GITREVISION,
    "generatedAt": generated_date,
    "interpolation": "linear in log(absolute pressure) between temperature nodes",
    "boundedInterpolationToleranceRelativePressure": 0.003,
    "curves": curves,
}
generated = ROOT / "packages/core/generated/pt-curves.json"
generated.write_text(json.dumps(output, separators=(",", ":")) + "\n")
manifest = {
    "provider": "CoolProp 7.2.0 HEOS, MIT",
    "dataVersion": data_version,
    "coolPropGitRevision": GITREVISION,
    "datasetRecords": len(records),
    "supportedRecords": len(curves),
    "solverExclusions": SOLVER_FAILURES,
    "modelSupplement": MODEL_SUPPLEMENT,
    "explicitBlendRecipes": explicit_blends,
    "supportedRanges": {
        rid: {
            "coolPropFluid": curve["coolPropFluid"],
            **domain_limits[curve["coolPropFluid"]],
            "sides": {
                side: {
                    "minimumTemperatureC": points[0][0], "maximumTemperatureC": points[-1][0],
                    "minimumPressureBarAbsolute": points[0][1], "maximumPressureBarAbsolute": points[-1][1],
                }
                for side, points in curve["sides"].items()
            },
        }
        for rid, curve in curves.items()
    },
    "unsupportedRecords": unavailable,
    "sourceUrl": output["sourceUrl"],
    "generatedFile": "packages/core/generated/pt-curves.json",
}
(ROOT / "data/pt/coverage-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Generated {len(curves)} supported of {len(records)}; {generated.stat().st_size} bytes", flush=True)
