#!/usr/bin/env python3
"""Build a bounded offline pressure–enthalpy grid from CoolProp 7.2.0.

The generated file contains saturation endpoints and single-phase H(P,T)
samples. No CoolProp code is used by the browser.
"""
import hashlib
import json
import math
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
PT = json.loads((ROOT / "packages/core/generated/pt-curves.json").read_text())
PT_COVERAGE = json.loads((ROOT / "data/pt/coverage-manifest.json").read_text())
assert cp.get_global_param_string("version") == "7.2.0"
assert cp.get_global_param_string("gitrevision") == PT["coolPropGitRevision"]

VAPOUR_OFFSETS = [1, 3, 7, 15, 30, 50, 80]
LIQUID_OFFSETS = [1, 3, 7, 15, 30, 50]
PRESSURE_NODES = 28


def property_at(output, fluid, pressure_bar, **state):
    try:
        if "quality" in state:
            value = cp.PropsSI(output, "P", pressure_bar * 1e5, "Q", state["quality"], fluid)
        else:
            value = cp.PropsSI(output, "P", pressure_bar * 1e5, "T", state["kelvin"], fluid)
        return value if math.isfinite(value) else None
    except (ValueError, OverflowError):
        return None


def make_plane(fluid, pressure_bar, triple_kelvin):
    bubble = property_at("T", fluid, pressure_bar, quality=0)
    dew = property_at("T", fluid, pressure_bar, quality=1)
    hl = property_at("Hmass", fluid, pressure_bar, quality=0)
    hv = property_at("Hmass", fluid, pressure_bar, quality=1)
    if None in (bubble, dew, hl, hv) or bubble > dew + 0.03 or hl >= hv:
        return None
    if bubble < triple_kelvin + 3 or dew < triple_kelvin + 3:
        return None
    sides = {}
    for phase, offsets, saturation in (
        ("vapour", VAPOUR_OFFSETS, dew),
        ("liquid", LIQUID_OFFSETS, bubble),
    ):
        samples = []
        for delta in offsets:
            temperature = saturation + delta if phase == "vapour" else saturation - delta
            if temperature < triple_kelvin + 3:
                break
            enthalpy = property_at("Hmass", fluid, pressure_bar, kelvin=temperature)
            if enthalpy is None:
                break
            # A wrong-side flash or solver branch is never published as a
            # single-phase grid point.
            if phase == "vapour" and enthalpy <= hv:
                break
            if phase == "liquid" and enthalpy >= hl:
                break
            samples.append([delta, round(enthalpy / 1000, 9)])
        if len(samples) >= 3:
            sides[phase] = samples
    if len(sides) != 2:
        return None
    return {
        "pressureBarAbsolute": round(pressure_bar, 12),
        "bubbleTemperatureC": round(bubble - 273.15, 8),
        "dewTemperatureC": round(dew - 273.15, 8),
        "liquidEnthalpyKJkg": round(hl / 1000, 9),
        "vapourEnthalpyKJkg": round(hv / 1000, 9),
        "sides": sides,
    }


def interpolate_samples(rows, delta):
    for a, b in zip(rows, rows[1:]):
        if a[0] <= delta <= b[0]:
            return a[1] + (b[1] - a[1]) * (delta - a[0]) / (b[0] - a[0])
    return None


def interval_passes(fluid, a, b):
    """A failed cell splits the published pressure domain at that edge."""
    p = math.sqrt(a["pressureBarAbsolute"] * b["pressureBarAbsolute"])
    fraction = (math.log(p) - math.log(a["pressureBarAbsolute"])) / (math.log(b["pressureBarAbsolute"]) - math.log(a["pressureBarAbsolute"]))
    for phase in ("vapour", "liquid"):
        key = "dewTemperatureC" if phase == "vapour" else "bubbleTemperatureC"
        saturation = a[key] + (b[key] - a[key]) * fraction
        max_delta = min(a["sides"][phase][-1][0], b["sides"][phase][-1][0])
        for delta in (x for x in (2, 5, 11, 22, 40, 65) if x <= max_delta):
            h_a = interpolate_samples(a["sides"][phase], delta)
            h_b = interpolate_samples(b["sides"][phase], delta)
            if h_a is None or h_b is None:
                return False
            estimated = h_a + (h_b - h_a) * fraction
            t = saturation + delta if phase == "vapour" else saturation - delta
            actual = property_at("Hmass", fluid, p, kelvin=t + 273.15)
            if actual is None or abs(estimated - actual / 1000) > 2:
                return False
    return True


def validated_run(fluid, planes):
    runs = []
    run = [planes[0]]
    for a, b in zip(planes, planes[1:]):
        if interval_passes(fluid, a, b):
            run.append(b)
        else:
            runs.append(run)
            run = [b]
    runs.append(run)
    return max(runs, key=len)


grids = {}
unavailable = {rid: f"no_pt_curve:{reason}" for rid, reason in PT_COVERAGE["unsupportedRecords"].items()}
for index, (rid, curve) in enumerate(PT["curves"].items(), 1):
    if len(curve["sides"]) != 2:
        unavailable[rid] = "bubble_and_dew_required"
        continue
    bubble_p = [row[1] for row in curve["sides"]["bubble"]]
    dew_p = [row[1] for row in curve["sides"]["dew"]]
    low = max(min(bubble_p), min(dew_p), 0.05)
    high = min(max(bubble_p), max(dew_p), 60)
    if high <= low * 1.5:
        unavailable[rid] = "insufficient_common_saturation_range"
        continue
    # Stay inside the generated saturation bounds and away from the upper
    # edge, where critical-region enthalpy curvature grows sharply.
    low *= 1.01
    high *= 0.88
    logarithms = [math.log(low) + i * (math.log(high) - math.log(low)) / (PRESSURE_NODES - 1) for i in range(PRESSURE_NODES)]
    try:
        triple_kelvin = cp.PropsSI("Ttriple", curve["coolPropFluid"])
    except ValueError:
        unavailable[rid] = "triple_point_unavailable"
        continue
    if not math.isfinite(triple_kelvin) or triple_kelvin <= 0:
        unavailable[rid] = "triple_point_unavailable"
        continue
    candidates = [make_plane(curve["coolPropFluid"], math.exp(logp), triple_kelvin) for logp in logarithms]
    runs, run = [], []
    for plane in candidates:
        if plane:
            run.append(plane)
        elif run:
            runs.append(run)
            run = []
    if run:
        runs.append(run)
    planes = max(runs, key=len) if runs else []
    if len(planes) < 6:
        unavailable[rid] = "no_continuous_phase_aware_enthalpy_grid"
        continue
    planes = validated_run(curve["coolPropFluid"], planes)
    if len(planes) < 6:
        unavailable[rid] = "no_continuous_validated_enthalpy_grid"
        continue
    grids[rid] = {"coolPropFluid": curve["coolPropFluid"], "planes": planes}
    if index % 20 == 0:
        print(f"{index}/{len(PT['curves'])} P–h candidates scanned; {len(grids)} usable", flush=True)

digest = hashlib.sha256(json.dumps(grids, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]
data_version = f"ph-2026-09-25.{digest}"
output = {
    "schema": "phasekit-ph-1",
    "dataVersion": data_version,
    "gridSha256Prefix": digest,
    "sourceId": "coolprop-ph-7.2.0",
    "sourceUrl": PT["sourceUrl"],
    "coolPropGitRevision": PT["coolPropGitRevision"],
    "generatedAt": "2026-09-25",
    "vapourOffsetRangeK": [VAPOUR_OFFSETS[0], VAPOUR_OFFSETS[-1]],
    "liquidOffsetRangeK": [LIQUID_OFFSETS[0], LIQUID_OFFSETS[-1]],
    "interpolation": "linear in temperature offset and log absolute pressure, within the same phase only",
    "grids": grids,
}
path = ROOT / "packages/core/generated/ph-grids.json"
path.write_text(json.dumps(output, separators=(",", ":")) + "\n")
(ROOT / "data/ph/coverage-manifest.json").write_text(json.dumps({
    "dataVersion": data_version,
    "datasetRecords": PT_COVERAGE["datasetRecords"],
    "ptCandidates": len(PT["curves"]),
    "supportedRecords": len(grids),
    "unsupportedRecords": unavailable,
    "sourceId": output["sourceId"],
}, indent=2) + "\n")
print(f"Generated {len(grids)} P–h grids, {path.stat().st_size} bytes, version {data_version}", flush=True)
