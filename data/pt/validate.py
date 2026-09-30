#!/usr/bin/env python3
"""Validate held-out temperatures against CoolProp, outside generator nodes."""
import json
import hashlib
import math
import sys
from pathlib import Path

import CoolProp.CoolProp as cp

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data"))
from coolprop_runtime import load_supplement

MODEL_SUPPLEMENT = load_supplement()
data = json.loads((ROOT / "packages/core/generated/pt-curves.json").read_text())
manifest = json.loads((ROOT / "data/pt/coverage-manifest.json").read_text())
assert manifest["dataVersion"] == data["dataVersion"]
assert manifest["modelSupplement"] == data["modelSupplement"] == MODEL_SUPPLEMENT
for recipe in data["explicitBlendRecipes"].values():
    state = cp.AbstractState("HEOS", "&".join(part["coolPropFluid"] for part in recipe["components"]))
    state.set_mole_fractions([part["moleFraction"] for part in recipe["components"]])
    assert all(abs(actual - float(part["massFraction"])) < 1e-12 for actual, part in zip(state.get_mass_fractions(), recipe["components"]))
assert data["coolPropGitRevision"] == cp.get_global_param_string("gitrevision")
assert data["curveSha256Prefix"] == hashlib.sha256(json.dumps(data["curves"], separators=(",", ":"), sort_keys=True).encode()).hexdigest()[:16]
assert data["dataVersion"].endswith(data["curveSha256Prefix"])
worst_relative_p = (0, "")
worst_t = (0, "")
checks = 0
unavailable = []
boundaries = []
for rid, curve in data["curves"].items():
    fluid = curve["coolPropFluid"]
    for side, nodes in curve["sides"].items():
        q = 0 if side == "bubble" else 1
        assert len(nodes) >= 3
        assert all(b[0] > a[0] and b[1] > a[1] > 0 for a, b in zip(nodes, nodes[1:]))
        minimum = max(cp.PropsSI("Tmin", fluid), cp.PropsSI("Ttriple", fluid)) - 273.15
        maximum = cp.PropsSI("Tmax", fluid) - 273.15
        assert minimum <= nodes[0][0] < nodes[-1][0] <= maximum
        try:
            critical = cp.PropsSI("Tcrit", fluid) - 273.15
        except ValueError:
            critical = None
        if critical is not None:
            margin = 3 if critical + 273.15 > 180 else max((critical + 273.15) * 0.02, 0.05)
            assert nodes[-1][0] <= critical - margin + 1e-8
        published = manifest["supportedRanges"][rid]["sides"][side]
        assert published["minimumTemperatureC"] == nodes[0][0]
        assert published["maximumTemperatureC"] == nodes[-1][0]
        for failure in manifest["solverExclusions"]["failures"]:
            if failure["refrigerantId"] == rid and failure["side"] == side:
                low = failure["temperatureC"] - manifest["solverExclusions"]["guardK"]
                high = failure["temperatureC"] + manifest["solverExclusions"]["guardK"]
                assert nodes[-1][0] < low or nodes[0][0] > high
        boundaries.append({
            "id": rid, "side": side, "fluid": fluid,
            "minimumTemperatureC": nodes[0][0], "maximumTemperatureC": nodes[-1][0],
            "modelMinimumTemperatureC": minimum, "modelMaximumTemperatureC": maximum,
            "modelCriticalTemperatureC": critical,
        })
        for a, b in zip(nodes, nodes[1:]):
            # Different points from the generator's endpoint/mid/eighth checks.
            for fraction in (0.2, 0.4, 0.6, 0.8):
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
    "dataVersion": data["dataVersion"],
    "validationMethod": "Held-out fifth points, monotonicity and per-branch model/critical bounds",
    "withheldChecks": checks,
    "maximumRelativePressureError": worst_relative_p,
    "maximumInverseTemperatureErrorC": worst_t,
    "failedSourceEvaluations": unavailable,
    "acceptance": {"relativePressure": 0.003, "inverseTemperatureC": 0.1},
    "boundaries": boundaries,
}
(ROOT / "data/pt/validation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({key: value for key, value in report.items() if key not in ("failedSourceEvaluations", "boundaries")}, indent=2))
print(f"failedSourceEvaluations: {len(unavailable)}")
assert not unavailable and worst_relative_p[0] < 0.003 and worst_t[0] < 0.1
