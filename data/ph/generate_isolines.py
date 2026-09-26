#!/usr/bin/env python3
"""Generate bounded single-phase log(p)-h isolines from pinned CoolProp 7.2.0.

Each segment is calculated from the HEOS state model and checked at log-pressure
midpoints. Missing or invalid regions remain gaps, never connecting across a
phase boundary. The browser receives static coordinates, not CoolProp code.
"""
import hashlib
import json
import math
import os
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
GRIDS = json.loads((ROOT / "packages/core/generated/ph-grids.json").read_text())
assert cp.get_global_param_string("version") == "7.2.0"
assert cp.get_global_param_string("gitrevision") == GRIDS["coolPropGitRevision"]

OFFSETS = {"vapour": [7, 25, 60], "liquid": [7, 25]}
KINDS = {"temperature": "T", "entropy": "Smass", "volume": "Dmass"}


def props(output, fluid, *state):
    try:
        value = cp.PropsSI(output, *state, fluid)
        return value if math.isfinite(value) else None
    except (ValueError, OverflowError):
        return None


def state_at_pressure(fluid, plane, kind, level, phase):
    p = plane["pressureBarAbsolute"] * 1e5
    key = KINDS[kind]
    value = level if kind != "volume" else 1 / level
    temperature = props("T", fluid, "P", p, key, value)
    enthalpy = props("Hmass", fluid, "P", p, key, value)
    if temperature is None or enthalpy is None:
        return None
    sat = plane["dewTemperatureC"] if phase == "vapour" else plane["bubbleTemperatureC"]
    offset = temperature - 273.15 - sat if phase == "vapour" else sat - (temperature - 273.15)
    samples = plane["sides"][phase]
    # The published single-phase grid starts at 1 K from saturation and ends
    # at the final validated offset for this pressure plane.
    if offset < samples[0][0] - 1e-6 or offset > samples[-1][0] + 1e-6:
        return None
    h = enthalpy / 1000
    bound = plane["vapourEnthalpyKJkg"] if phase == "vapour" else plane["liquidEnthalpyKJkg"]
    if (phase == "vapour" and h <= bound) or (phase == "liquid" and h >= bound):
        return None
    return [round(plane["pressureBarAbsolute"], 12), round(h, 7)]


def midpoint_plane(a, b):
    return {
        "pressureBarAbsolute": math.sqrt(a["pressureBarAbsolute"] * b["pressureBarAbsolute"]),
        "bubbleTemperatureC": (a["bubbleTemperatureC"] + b["bubbleTemperatureC"]) / 2,
        "dewTemperatureC": (a["dewTemperatureC"] + b["dewTemperatureC"]) / 2,
        "liquidEnthalpyKJkg": (a["liquidEnthalpyKJkg"] + b["liquidEnthalpyKJkg"]) / 2,
        "vapourEnthalpyKJkg": (a["vapourEnthalpyKJkg"] + b["vapourEnthalpyKJkg"]) / 2,
        "sides": {
            phase: [[1], [min(a["sides"][phase][-1][0], b["sides"][phase][-1][0])]]
            for phase in ("vapour", "liquid")
        },
    }


def segments_for(fluid, planes, kind, level, phase):
    segments, run = [], []
    previous = None
    for plane in planes:
        point = state_at_pressure(fluid, plane, kind, level, phase)
        if point is not None and previous is not None and run:
            mid = state_at_pressure(fluid, midpoint_plane(previous, plane), kind, level, phase)
            if mid is None or abs((run[-1][1] + point[1]) / 2 - mid[1]) > 2:
                if len(run) >= 3:
                    segments.append(run)
                run = []
        if point is None:
            if len(run) >= 3:
                segments.append(run)
            run = []
        else:
            run.append(point)
        previous = plane
    if len(run) >= 3:
        segments.append(run)
    return segments


def levels_at_reference(fluid, plane, phase):
    p = plane["pressureBarAbsolute"] * 1e5
    saturation = plane["dewTemperatureC"] if phase == "vapour" else plane["bubbleTemperatureC"]
    for offset in OFFSETS[phase]:
        if offset > plane["sides"][phase][-1][0]:
            continue
        temperature = saturation + offset if phase == "vapour" else saturation - offset
        t = temperature + 273.15
        entropy = props("Smass", fluid, "P", p, "T", t)
        density = props("Dmass", fluid, "P", p, "T", t)
        if entropy is not None and density is not None and density > 0:
            yield {"temperature": t, "entropy": entropy, "volume": 1 / density}


output_grids = {}
for rid, grid in GRIDS["grids"].items():
    only = os.environ.get("PH_ISOLINE_FLUIDS")
    if only and rid not in only.split(","):
        continue
    planes, fluid = grid["planes"], grid["coolPropFluid"]
    reference = planes[len(planes) // 2]
    curves = []
    for phase in ("vapour", "liquid"):
        for values in levels_at_reference(fluid, reference, phase):
            for kind, level in values.items():
                segments = segments_for(fluid, planes, kind, level, phase)
                if segments:
                    display = level - 273.15 if kind == "temperature" else level / 1000 if kind == "entropy" else level
                    curves.append({
                        "kind": kind,
                        "phase": phase,
                        "level": round(display, 10),
                        "segments": segments,
                    })
    if curves:
        output_grids[rid] = curves

digest = hashlib.sha256(json.dumps(output_grids, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]
output = {
    "schema": "phasekit-ph-isolines-1",
    "dataVersion": f"ph-isolines-2026-09-26.{digest}",
    "phGridVersion": GRIDS["dataVersion"],
    "sourceId": GRIDS["sourceId"],
    "coolPropGitRevision": GRIDS["coolPropGitRevision"],
    "interpolation": "direct HEOS states, log-pressure midpoint error <= 2 kJ/kg; single-phase segments only",
    "curves": output_grids,
}
path = ROOT / "packages/core/generated/ph-isolines.json"
path.write_text(json.dumps(output, separators=(",", ":")) + "\n")
print(f"Generated isolines for {len(output_grids)}/{len(GRIDS['grids'])} fluids, {path.stat().st_size} bytes, {output['dataVersion']}", flush=True)
