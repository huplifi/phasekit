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
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
VERSION = "7.2.0"
GITREVISION = "98b3523d5daa98454618d381d2ae53f7471d216b"
IDENTITY_SOURCE_COMMIT = "afce86ff977552663ca3a78d8ea318cc64dcbdfd"
IDENTITY_SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/private/tmp/phasekit-coolprop")
assert cp.get_global_param_string("version") == VERSION
assert cp.get_global_param_string("gitrevision") == GITREVISION
assert subprocess.check_output(["git", "-C", str(IDENTITY_SOURCE), "rev-parse", "HEAD"], text=True).strip() == IDENTITY_SOURCE_COMMIT


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


def cp_name(record):
    designation = record["designation"]
    candidates = [designation, pure_names.get(slug(designation))] if record["kind"] == "pure" else [mixture_names.get(slug(designation))]
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
    if abs(math.log(actual) - model_log) <= 0.0012 or depth >= 11:
        return [left, right]
    l = refine(fluid, side, left, (middle, actual), depth + 1)
    r = refine(fluid, side, (middle, actual), right, depth + 1)
    return l[:-1] + r if l and r else None


def build_side(fluid, side):
    try:
        minimum = cp.PropsSI("Tmin", fluid)
    except ValueError:
        minimum = 182.15
    try:
        critical = cp.PropsSI("Tcrit", fluid)
        margin = 3 if critical > 180 else max(critical * 0.02, 0.05)
        high = min(critical - margin, 453.15)
    except ValueError:
        high = 423.15
    low = minimum + min(1, max((high - minimum) * 0.03, 0.05))
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
    # Pick the longest continuous valid run. Disconnected solver pockets are
    # excluded so table interpolation never bridges a failed phase region.
    runs, run = [], []
    for point in coarse:
        if point[1] is None:
            if run:
                runs.append(run)
            run = []
        else:
            run.append(point)
    if run:
        runs.append(run)
    if not runs:
        return None
    run = max(runs, key=len)
    if len(run) < 3:
        return None
    # For mixtures with no direct critical point query, retain a conservative
    # 5 K gap before the first invalid high-temperature sample.
    if run[-1][0] < high - 1 and len(run) > 3:
        run = run[:-1]
    nodes = [run[0]]
    for left, right in zip(run, run[1:]):
        section = refine(fluid, side, left, right)
        if section is None:
            break
        nodes.extend(section[1:])
    if len(nodes) < 3 or any(b[1] <= a[1] for a, b in zip(nodes, nodes[1:])):
        return None
    # Significant digits keep very low saturation pressures distinct. A fixed
    # decimal-place rounding made sub-microbar nodes collapse together.
    published = [[round(t - 273.15, 10), float(f"{p:.15g}")] for t, p in nodes]
    valid = []
    for a, b in zip(published, published[1:]):
        # Recheck at the *serialized* temperatures: some mixture solvers have
        # razor-thin failures that a harmless decimal rounding can expose.
        valid.append(all(pressure(fluid, a[0] + (b[0] - a[0]) * fraction + 273.15, side) is not None for fraction in (0.25, 0.75)))
    runs, start = [], None
    for index, ok in enumerate(valid + [False]):
        if ok and start is None:
            start = index
        elif not ok and start is not None:
            runs.append((start, index))
            start = None
    if not runs:
        return None
    start, end = max(runs, key=lambda pair: pair[1] - pair[0])
    return published[start:end + 1]


curves = {}
unavailable = {}
for index, record in enumerate(records, 1):
    rid = record["id"]
    fluid = cp_name(record)
    if not fluid:
        unavailable[rid] = "no_exact_coolprop_fluid_or_predefined_mixture"
        continue
    sides = {side: build_side(fluid, side) for side in ("bubble", "dew")}
    sides = {side: points for side, points in sides.items() if points}
    if not sides:
        unavailable[rid] = "no_valid_bounded_saturation_curve"
        continue
    curves[rid] = {"coolPropFluid": fluid, "sides": sides}
    if index % 25 == 0:
        print(f"{index}/{len(records)} rows scanned, {len(curves)} supported", flush=True)

curve_hash = hashlib.sha256(json.dumps(curves, separators=(",", ":"), sort_keys=True).encode()).hexdigest()[:16]
data_version = f"pt-2026-09-25.{curve_hash}"
output = {
    "schema": "phasekit-pt-1",
    "dataVersion": data_version,
    "curveSha256Prefix": curve_hash,
    "source": "CoolProp 7.2.0 MIT HEOS equation of state and predefined mixtures",
    "sourceUrl": "https://github.com/CoolProp/CoolProp/tree/v7.2.0",
    "coolPropGitRevision": GITREVISION,
    "generatedAt": "2026-09-25",
    "interpolation": "linear in log(absolute pressure) between temperature nodes",
    "boundedInterpolationToleranceRelativePressure": 0.0012,
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
    "unsupportedRecords": unavailable,
    "sourceUrl": output["sourceUrl"],
    "generatedFile": "packages/core/generated/pt-curves.json",
}
(ROOT / "data/pt/coverage-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Generated {len(curves)} supported of {len(records)}; {generated.stat().st_size} bytes", flush=True)
