#!/usr/bin/env python3
"""Build a reviewed candidate supplement from public primary-source tables.

This is staging only. It does not assign EU GWP, legality, P–T support, or
canonical verification status. The compact rows below transcribe composition
mass percentages and safety classes from the cited UNEP tables.
"""
import csv
import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("inventory-v3-candidates.json")
CHECKED = "2026-09-25"
COOL_COMMIT = "afce86ff977552663ca3a78d8ea318cc64dcbdfd"
SOURCES = [
    {"id": "unep-ozone-blends-live-v3", "title": "Lists of substances and blends", "publisher": "UNEP Ozone Secretariat", "url": "https://ozone.unep.org/lists-substances-and-blends", "version": "Live list retrieved 2026-09-25", "retrievedAt": CHECKED, "scope": "Historical blend designations and mass compositions; GWP values deliberately not imported."},
    {"id": "unep-teap-2025-v3", "title": "TEAP May 2025 Progress Report, volume 1, table 6.1", "publisher": "UNEP Ozone Secretariat / TEAP", "url": "https://ozone.unep.org/system/files/documents/TEAP-May2025-Progress-Report-vol1.pdf", "version": "May 2025, printed pages 60-61, PDF pages 69-70", "retrievedAt": CHECKED, "scope": "New blend designations, mass compositions and reported safety classes."},
    {"id": "unep-teap-2026-v3", "title": "TEAP May 2026 Progress Report, volume 1, table 6.1", "publisher": "UNEP Ozone Secretariat / TEAP", "url": "https://ozone.unep.org/system/files/documents/TEAP-May2026-Progress-Report-vol1.pdf", "version": "May 2026, printed page 80, PDF page 88", "retrievedAt": CHECKED, "scope": "Seven new blend designations, mass compositions and reported safety classes."},
    {"id": "unep-teap-2020-v3", "title": "TEAP May 2020 Progress Report, volume 1, table 2", "publisher": "UNEP Ozone Secretariat / TEAP", "url": "https://ozone.unep.org/sites/default/files/2020-06/TEAP-Progress-report-and-response-decXXXI-8-may2020_0.pdf", "version": "May 2020, table 2", "retrievedAt": CHECKED, "scope": "R427B and R466A A1 safety classes only."},
    {"id": "epa-ods-r31-v3", "title": "Ozone-Depleting Substances: Class II ODS", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/ozone-layer-protection/ozone-depleting-substances", "version": "Live page retrieved 2026-09-25", "retrievedAt": CHECKED, "scope": "HCFC-31 chemical name, formula and CAS only."},
    {"id": "epa-r31-designation-v3", "title": "Wisconsin hazardous air pollutants source list (R-31 synonym)", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/system/files/documents/2025-04/wi-nr-438.pdf", "version": "EPA-hosted document, April 2025", "retrievedAt": CHECKED, "scope": "Explicit R-31 synonym of HCFC-31; no regulatory values imported."},
    {"id": "epa-cf3i-identity-v3", "title": "Greenhouse Gas Reporting Rule chemical identity table", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/system/files/documents/2024-04/ghgrp-final-preamble-and-rule-april-2024.pdf", "version": "Final rule, April 2024", "retrievedAt": CHECKED, "scope": "Trifluoroiodomethane chemical name, CAS and formula only; GWP excluded."},
    {"id": "coolprop-r13i1-v3", "title": "CoolProp R13I1 fluid identity", "publisher": "CoolProp project", "url": f"https://github.com/CoolProp/CoolProp/blob/{COOL_COMMIT}/dev/fluids/R13I1.json", "version": f"git {COOL_COMMIT}", "retrievedAt": CHECKED, "license": "MIT", "scope": "Designation, CAS, formula and alias only; environmental and safety fields excluded."},
    {"id": "coolprop-rc318-v3", "title": "CoolProp RC318 fluid identity", "publisher": "CoolProp project", "url": f"https://github.com/CoolProp/CoolProp/blob/{COOL_COMMIT}/dev/fluids/RC318.json", "version": f"git {COOL_COMMIT}", "retrievedAt": CHECKED, "license": "MIT", "scope": "Designation, CAS and formula only; environmental and safety fields excluded."},
]

# Each component token is designation:mass-percent. Codes are resolved against
# both the existing canonical catalogue and the pure candidate records below.
LEGACY = """
R405A|R22:45,R142b:5.5,R152a:7,RC318:42.5|
R406B|R22:65,R142b:31,R600a:4|
R411C|R22:95.5,R152a:1.5,R1270:3|
R427B|R32:20.6,R125:25.6,R134a:34.8,R143a:19|A1
R466A|R32:49,R125:11.5,R13I1:39.5|A1
R505|R12:78,R31:22|
R506|R114:45,R31:55|
R509|R22:46,R218:54|
R515A|R227ea:12,R1234ze(E):88|
"""
NEW_2025 = """
R433D|R1270:35,R290:65|A3
R454D|R32:43,R1234yf:57|A2L
R455B|R744:6,R32:42,R1234yf:52|A2L
R455C|R744:3,R32:43,R1234yf:54|A2L
R457D|R32:4,R1234yf:82,R152a:14|A2L
R474B|R1132(E):31.5,R1234yf:68.5|A2L
R475B|R1234yf:35.4,R134a:10.1,R1234ze(E):54.5|A2L
R478A|R744:7,R32:26,R125:15,R134a:15,R152a:3,R1234ze(E):30,R227ea:4|A2L
R479A|R1132(E):28,R32:21.5,R1234yf:50.5|A2L
R481A|R32:16.9,R125:6.3,R134a:74.4,R1233zd(E):1.8,R601a:0.6|A1
R483A|R290:15,R600:85|A3
R484A|R1270:12,R600:88|A3
R485A|R1132a:10,R744:69,R32:21|A2L
R486A|R1234yf:21.9,R134a:6.3,R13I1:38,R1234ze(E):33.8|A1
R487A|R170:20,R1270:80|A3
R487B|R170:17,R1270:83|A3
R488A|R32:6,R1234yf:50,R152a:3,R1234ze(E):41|A2L
R489A|R50:1.5,R1150:22,R600:76.5|A3
R490A|R1150:7.9,R1270:92.1|A3
R491A|R1132(E):35,R152a:65|A2
R493A|R290:9.4,R600a:30.9,R600:59.7|A3
R493B|R290:11.8,R600a:29.1,R600:59.1|A3
R493C|R290:15.1,R600a:28.3,R600:56.6|A3
R494A|R744:4,R152a:60,R13I1:36|A2
R495A|R32:4.5,R1234yf:76,R134a:9,R1234ze(E):10.5|A2L
"""
NEW_2026 = """
R496A|R14:18,R23:37.8,R116:44.2|A1
R497A|R1270:15,R13I1:85|A2
R498A|R170:7,R290:8,R13I1:85|A3
R499A|R170:8,R290:92|A3
R4101A|R32:11,R152a:30.5,R13I1:58.5|A2L
R4102A|R134a:10,R1234ze(E):60,R1233zd(E):30|A1
R4103A|R32:10,R152a:22,R13I1:17,R1234ze(E):51|A2L
"""


def identifier(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


existing = {row["id"] for row in csv.DictReader((ROOT / "data/refrigerants.csv").open())}
pure = [
    {"id": "r31", "designation": "R31", "kind": "pure", "name": "Monochlorofluoromethane", "cas": "593-70-4", "formula": "CH2FCl", "sourceIds": ["epa-ods-r31-v3", "epa-r31-designation-v3"], "composition": [], "safetyGroup": None, "fieldEvidence": {"designation": ["epa-r31-designation-v3"], "name": ["epa-ods-r31-v3"], "cas": ["epa-ods-r31-v3"], "formula": ["epa-ods-r31-v3"]}},
    {"id": "r13i1", "designation": "R13I1", "kind": "pure", "name": "Trifluoroiodomethane", "cas": "2314-97-8", "formula": "CF3I", "aliases": ["CF3I"], "sourceIds": ["coolprop-r13i1-v3", "epa-cf3i-identity-v3"], "composition": [], "safetyGroup": None, "fieldEvidence": {"designation": ["coolprop-r13i1-v3"], "name": ["epa-cf3i-identity-v3"], "cas": ["coolprop-r13i1-v3", "epa-cf3i-identity-v3"], "formula": ["coolprop-r13i1-v3", "epa-cf3i-identity-v3"]}},
    {"id": "rc318", "designation": "RC318", "kind": "pure", "name": "Octafluorocyclobutane", "cas": "115-25-3", "formula": "C4F8", "sourceIds": ["coolprop-rc318-v3", "unep-ozone-blends-live-v3"], "composition": [], "safetyGroup": None, "fieldEvidence": {"designation": ["coolprop-rc318-v3"], "name": ["unep-ozone-blends-live-v3"], "cas": ["coolprop-rc318-v3"], "formula": ["coolprop-rc318-v3"]}},
]
assert not any(row["id"] in existing for row in pure)
candidate_ids = {row["id"] for row in pure}


def parse_block(text, source_id):
    result = []
    for line in text.strip().splitlines():
        designation, recipe, safety = line.split("|")
        rid = identifier(designation)
        assert rid not in existing and rid not in candidate_ids, f"Duplicate candidate: {rid}"
        candidate_ids.add(rid)
        components = []
        for token in recipe.split(","):
            component, percent = token.split(":")
            cid = identifier(component)
            components.append({"designation": component, "refrigerantId": cid, "massPercent": percent, "sourceId": source_id})
        assert sum(Decimal(c["massPercent"]) for c in components) == 100, designation
        row = {
            "id": rid, "designation": designation, "kind": "blend", "name": designation,
            "cas": None, "formula": None, "composition": components,
            "safetyGroup": safety or None,
            "sourceIds": [source_id],
            "fieldEvidence": {"designation": [source_id], "composition": [source_id], "safetyGroup": [source_id] if safety else []},
        }
        if source_id == "unep-ozone-blends-live-v3" and safety:
            assert designation in {"R427B", "R466A"}
            row["sourceIds"].append("unep-teap-2020-v3")
            row["fieldEvidence"]["safetyGroup"] = ["unep-teap-2020-v3"]
        result.append(row)
    return result


candidates = pure + parse_block(LEGACY, "unep-ozone-blends-live-v3") + parse_block(NEW_2025, "unep-teap-2025-v3") + parse_block(NEW_2026, "unep-teap-2026-v3")
for candidate in candidates:
    for component in candidate["composition"]:
        assert component["refrigerantId"] in existing | candidate_ids, (candidate["id"], component)
    candidate["reviewStatus"] = "source_staged_not_canonical"
    candidate["reviewedAt"] = CHECKED

# R507C is published as another name for R507A, not a distinct 50/50 blend.
output = {
    "schema": "phasekit-inventory-candidates-v3",
    "retrievedAt": CHECKED,
    "baseline": {"path": "data/refrigerants.csv", "recordCount": len(existing)},
    "sources": SOURCES,
    "candidates": candidates,
    "reconciliation": [{"designation": "R507C", "action": "alias_of_existing", "existingId": "r507a", "sourceId": "unep-ozone-blends-live-v3", "reason": "The Ozone Secretariat list gives the same 50/50 R125/R143a composition and AZ-50/Forane 507A names; its footnote identifies R507C as an R507A name."}],
    "limits": ["Candidate source facts only; no EU legal GWP or equipment status assigned.", "Blend safety classes are source-reported classifications and require review before canonical publication.", "The listed sources do not define a complete universe of refrigerants."],
}
OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
print(f"Staged {len(candidates)} new candidate records at {OUT}")
