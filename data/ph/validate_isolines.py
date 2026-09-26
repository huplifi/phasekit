#!/usr/bin/env python3
"""Recheck published P–h isolines against fresh CoolProp 7.2.0 states."""
import json
import math
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
GRIDS = json.loads((ROOT / "packages/core/generated/ph-grids.json").read_text())
LINES = json.loads((ROOT / "packages/core/generated/ph-isolines.json").read_text())
assert cp.get_global_param_string("version") == "7.2.0"
assert cp.get_global_param_string("gitrevision") == LINES["coolPropGitRevision"]
assert LINES["phGridVersion"] == GRIDS["dataVersion"]

samples = 0
maximum_error = 0.0
for rid, curves in LINES["curves"].items():
    fluid = GRIDS["grids"][rid]["coolPropFluid"]
    for curve in curves:
        input_key = {"temperature": "T", "entropy": "Smass", "volume": "Dmass"}[curve["kind"]]
        level = curve["level"]
        input_value = (level + 273.15 if curve["kind"] == "temperature"
                       else level * 1000 if curve["kind"] == "entropy"
                       else 1 / level)
        for segment in curve["segments"]:
            for (p1, h1), (p2, h2) in zip(segment, segment[1:]):
                assert p1 < p2
                p = math.sqrt(p1 * p2)
                actual = cp.PropsSI("Hmass", "P", p * 1e5, input_key, input_value, fluid) / 1000
                temperature = cp.PropsSI("T", "P", p * 1e5, input_key, input_value, fluid)
                saturation = cp.PropsSI("T", "P", p * 1e5, "Q", 1 if curve["phase"] == "vapour" else 0, fluid)
                offset = temperature - saturation if curve["phase"] == "vapour" else saturation - temperature
                assert offset >= 0.99, (rid, curve["kind"], p, offset)
                error = abs((h1 + h2) / 2 - actual)
                assert math.isfinite(actual) and error <= 2.01, (rid, curve["kind"], p, error)
                maximum_error = max(maximum_error, error)
                samples += 1

result = {
    "dataVersion": LINES["dataVersion"],
    "coolPropGitRevision": LINES["coolPropGitRevision"],
    "method": "independent log-pressure midpoints of every published segment; direct HEOS Hmass(P, constant T/S/D)",
    "fluids": len(LINES["curves"]),
    "withheldMidpoints": samples,
    "maximumAbsoluteErrorKJkg": round(maximum_error, 6),
    "thresholdKJkg": 2.01,
}
(ROOT / "data/ph/isoline-validation.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
