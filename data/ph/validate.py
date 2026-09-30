#!/usr/bin/env python3
"""Check held-out P–h grid cells against fresh CoolProp 7.2.0 evaluations."""
import hashlib
import json
import math
import sys
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data"))
from coolprop_runtime import load_supplement

MODEL_SUPPLEMENT = load_supplement()
TABLE = json.loads((ROOT / "packages/core/generated/ph-grids.json").read_text())
assert TABLE["modelSupplement"] == MODEL_SUPPLEMENT
assert cp.get_global_param_string("gitrevision") == TABLE["coolPropGitRevision"]
digest = hashlib.sha256(json.dumps(TABLE["grids"], sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]
assert TABLE["gridSha256Prefix"] == digest


def interpolate_samples(rows, delta):
    for a, b in zip(rows, rows[1:]):
        if a[0] <= delta <= b[0]:
            return a[1] + (b[1] - a[1]) * (delta - a[0]) / (b[0] - a[0])
    return None


checks = 0
failed = 0
worst = [0, ""]
errors = []
worst_cases = []
for rid, grid in TABLE["grids"].items():
    fluid = grid["coolPropFluid"]
    for a, b in zip(grid["planes"], grid["planes"][1:]):
        p = math.sqrt(a["pressureBarAbsolute"] * b["pressureBarAbsolute"])
        fraction = (math.log(p) - math.log(a["pressureBarAbsolute"])) / (math.log(b["pressureBarAbsolute"]) - math.log(a["pressureBarAbsolute"]))
        for phase in ("vapour", "liquid"):
            key = "dewTemperatureC" if phase == "vapour" else "bubbleTemperatureC"
            saturation = a[key] + (b[key] - a[key]) * fraction
            max_delta = min(a["sides"][phase][-1][0], b["sides"][phase][-1][0])
            offsets = [2, 5, 11, 22, 40, 65]
            for delta in (x for x in offsets if x <= max_delta):
                h_a = interpolate_samples(a["sides"][phase], delta)
                h_b = interpolate_samples(b["sides"][phase], delta)
                if h_a is None or h_b is None:
                    continue
                estimated = h_a + (h_b - h_a) * fraction
                t = saturation + delta if phase == "vapour" else saturation - delta
                try:
                    actual = cp.PropsSI("Hmass", "P", p * 1e5, "T", t + 273.15, fluid) / 1000
                except ValueError:
                    failed += 1
                    continue
                error = abs(estimated - actual)
                checks += 1
                errors.append(error)
                if error > 2:
                    worst_cases.append([error, rid, phase, p, delta, estimated, actual, t])
                if error > worst[0]:
                    worst = [error, f"{rid}:{phase}:{p:.6g} bar:delta {delta} K"]

report = {
    "dataVersion": TABLE["dataVersion"],
    "withheldChecks": checks,
    "failedSourceEvaluations": failed,
    "maximumAbsoluteEnthalpyErrorKJkg": worst,
    "percentile99AbsoluteEnthalpyErrorKJkg": sorted(errors)[int(0.99 * (len(errors) - 1))] if errors else None,
    "acceptanceMaximumAbsoluteEnthalpyErrorKJkg": 2,
    "casesOver2KJkg": len(worst_cases),
    "validationMethod": "midpoint of adjacent log-pressure planes, off-grid temperature offsets against CoolProp Hmass(P,T)",
}
(ROOT / "data/ph/validation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2), flush=True)
if checks < 1000 or failed or worst[0] > 2:
    raise SystemExit(1)
