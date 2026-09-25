#!/usr/bin/env python3
"""Validate held-out temperatures against CoolProp, outside generator nodes."""
import json
import hashlib
import math
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
data = json.loads((ROOT / "packages/core/generated/pt-curves.json").read_text())
assert data["coolPropGitRevision"] == cp.get_global_param_string("gitrevision")
assert data["curveSha256Prefix"] == hashlib.sha256(json.dumps(data["curves"], separators=(",", ":"), sort_keys=True).encode()).hexdigest()[:16]
assert data["dataVersion"].endswith(data["curveSha256Prefix"])
worst_relative_p = (0, "")
worst_t = (0, "")
checks = 0
unavailable = []
for rid, curve in data["curves"].items():
    fluid = curve["coolPropFluid"]
    for side, nodes in curve["sides"].items():
        q = 0 if side == "bubble" else 1
        for a, b in zip(nodes, nodes[1:]):
            for fraction in (0.25, 0.75):
                t = a[0] + (b[0] - a[0]) * fraction
                p_model = math.exp(math.log(a[1]) + (math.log(b[1]) - math.log(a[1])) * fraction)
                try:
                    p_actual = cp.PropsSI("P", "T", t + 273.15, "Q", q, fluid) / 100000
                except ValueError:
                    unavailable.append(f"{rid}:{side}:{t}")
                    continue
                relative = abs(p_model / p_actual - 1)
                if relative > worst_relative_p[0]:
                    worst_relative_p = relative, f"{rid}:{side}:{t:.5f}C"
                inverse_ratio = (math.log(p_actual) - math.log(a[1])) / (math.log(b[1]) - math.log(a[1]))
                t_model = a[0] + (b[0] - a[0]) * inverse_ratio
                error_t = abs(t_model - t)
                if error_t > worst_t[0]:
                    worst_t = error_t, f"{rid}:{side}:{t:.5f}C"
                checks += 1
report = {
    "withheldChecks": checks,
    "maximumRelativePressureError": worst_relative_p,
    "maximumInverseTemperatureErrorC": worst_t,
    "failedSourceEvaluations": unavailable,
    "acceptance": {"relativePressure": 0.003, "inverseTemperatureC": 0.1},
}
(ROOT / "data/pt/validation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({key: value for key, value in report.items() if key != "failedSourceEvaluations"}, indent=2))
print(f"failedSourceEvaluations: {len(unavailable)}")
assert not unavailable and worst_relative_p[0] < 0.003 and worst_t[0] < 0.1
