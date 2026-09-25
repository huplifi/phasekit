#!/usr/bin/env python3
"""Rebuild canonical CSV rows from pinned CoolProp data and reviewed staging.

Usage: python3 data/import_coolprop.py /path/to/CoolProp
The external source checkout is read-only. Human-reviewed legal/manufacturer rows
are overlaid from data/staging and canonical CSV edits should be reviewed as diffs.
"""
import csv
import json
import re
import subprocess
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARGS = [arg for arg in sys.argv[1:] if arg != "--write-canonical"]
WRITE_CANONICAL = "--write-canonical" in sys.argv[1:]
if not ARGS:
    raise SystemExit("Usage: python3 data/import_coolprop.py /path/to/CoolProp [--write-canonical]")
COOL = Path(ARGS[0]).resolve()
OUTPUT_DIR = ROOT / "data" if WRITE_CANONICAL else ROOT / "data/staging/coolprop-export"
CHECKED = "2026-09-25"
COOLPROP_COMMIT = "afce86ff977552663ca3a78d8ea318cc64dcbdfd"
try:
    actual_commit = subprocess.check_output(["git", "-C", str(COOL), "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
except (subprocess.CalledProcessError, FileNotFoundError):
    raise SystemExit(f"CoolProp source checkout not found or not a git repository: {COOL}")
if actual_commit != COOLPROP_COMMIT:
    raise SystemExit(f"CoolProp checkout must be pinned at {COOLPROP_COMMIT}; found {actual_commit}")


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def is_r_code(value: str) -> bool:
    return bool(re.fullmatch(r"(?:R|RE)-?\d{2,5}(?:[A-Za-z]{0,4})?(?:\([A-Za-z]\))?", value.strip(), re.I))


def canonical_code(value: str) -> str:
    return re.sub(r"-", "", value.strip())


def cas_is_valid(value: str) -> bool:
    if not re.fullmatch(r"\d{2,7}-\d{2}-\d", value):
        return False
    digits = value.replace("-", "")
    checksum = sum(int(digit) * (index + 1) for index, digit in enumerate(reversed(digits[:-1]))) % 10
    return checksum == int(digits[-1])


def write_csv(filename, rows, columns):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with (OUTPUT_DIR / filename).open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def source_row(source_id, title, publisher, url, version, license_text, scope, notes=""):
    return {
        "source_id": source_id, "title": title, "publisher": publisher, "url": url,
        "version_or_date": version, "license_or_terms": license_text, "scope": scope,
        "checked_at": CHECKED, "checked_by": "PhaseKit data import", "notes": notes,
    }


sources = [
    source_row("coolprop-mit", "CoolProp fluid and predefined-mixture data", "CoolProp project", "https://github.com/CoolProp/CoolProp/tree/afce86ff977552663ca3a78d8ea318cc64dcbdfd/dev", f"git commit {COOLPROP_COMMIT}", "MIT License", "R- and RE-designated pure-fluid metadata, EOS thermodynamic constants, and predefined recipes.", "CoolProp mole recipes are converted to mass fractions only for search/display and are marked partial. Environment/safety fields were excluded."),
    source_row("epa-snap-compositions", "Compositions of Refrigerant Blends", "United States Environmental Protection Agency", "https://www.epa.gov/snap/compositions-refrigerant-blends", "Page updated 2026-03-30", "US EPA data are public domain by default unless otherwise specified", "44 R-designated blend rows with directly reported mass fractions.", "Page count excludes unnumbered trade products; source denominator does not imply all refrigerants."),
    source_row("epa-gwp-identities", "Technology Transitions GWP Reference Table", "United States Environmental Protection Agency", "https://www.epa.gov/hfcs/technology-transitions-gwp-reference-table", "Page updated 2026-04-02", "US EPA data are public domain by default unless otherwise specified", "R-designated identities only; US-rule GWP values are not imported.", "37 rows, 10 overlap the EPA composition page."),
    source_row("eu-2024-573", "Regulation (EU) 2024/573 on fluorinated greenhouse gases", "European Union", "https://eur-lex.europa.eu/eli/reg/2024/573/oj", "2024-02-07; Annex I/II/VI", "Official EU legal text; attribution", "Only mapped Annex I/II legal class and GWP facts.", "Annex I HFC and PFC facts can have different GWP assessment bases; each fact stores its exact basis."),
    source_row("eu-2024-590", "Regulation (EU) 2024/590 on substances that deplete the ozone layer", "European Union", "https://eur-lex.europa.eu/eli/reg/2024/590/oj", "2024-02-07; Annex I", "Official EU legal text; attribution", "Mapped ODS Annex I legal class and environmental facts.", "Values are kept distinct from Regulation (EU) 2024/573 facts."),
    source_row("fi-ymparisto", "F-kaasut ja otsonikerrosta heikentävät aineet", "Suomen ympäristökeskus", "https://www.ymparisto.fi/fi/luvat-ja-velvoitteet/f-kaasut-ja-otsonikerrosta-heikentavat-aineet", "Checked 2026-09-25", "Finnish public authority information; attribution", "Finnish regulatory context only; no technical value is sourced here.", "SYKE administers Finnish market supervision for F-gases and ODS."),
]

# Read source fluid files, collecting all explicitly designated R aliases.
fluid_files = {}
fluid_aliases = {}
for file in sorted((COOL / "dev/fluids").glob("*.json")):
    try:
        raw = json.loads(file.read_text(encoding="utf-8"))
    except Exception:
        continue
    info = raw.get("INFO", {})
    stem = file.stem
    labels = [stem, info.get("NAME", ""), *info.get("ALIASES", []), info.get("REFPROP_NAME", "")]
    fluid_files[stem.upper()] = raw
    for label in labels:
        if label:
            fluid_aliases[slug(label)] = (stem, raw)

# Select all R-designations per CoolProp pure entry; aliases to one CAS become one ID.
records = {}
record_raw_labels = {}
mixture_pseudo = {"r404a", "r407c", "r410a", "r507a"}
for stem, raw in fluid_files.items():
    info = raw.get("INFO", {})
    labels = [info.get("NAME", ""), *info.get("ALIASES", []), stem]
    codes = []
    seen = set()
    for label in labels:
        if label and is_r_code(label):
            code = canonical_code(label)
            key = slug(code)
            if key not in seen and key not in mixture_pseudo:
                codes.append(code)
                seen.add(key)
    if not codes:
        continue
    # Prefer a source's named R-code over its filename; keep its case and suffix notation.
    for code in codes:
        rid = slug(code)
        states = raw.get("STATES", {})
        critical = states.get("critical", {}) or {}
        triple = states.get("triple_liquid", {}) or {}
        eos = raw.get("EOS", [{}])[0]
        molar = eos.get("molar_mass")
        formula = info.get("FORMULA", "")
        cas = info.get("CAS", "")
        rec = {
            "id": rid, "designation": code, "kind": "pure",
            "chemical_name": info.get("NAME") if info.get("NAME") and not is_r_code(info["NAME"]) else code,
            "formula": formula, "cas_number": cas if cas_is_valid(cas) else "",
            "ashrae_safety_group": "", "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
            "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "",
            "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
            "normal_boiling_c": "", "critical_temp_c": str(Decimal(str(critical["T"])) - Decimal("273.15")) if critical.get("T") else "",
            "critical_pressure_bar_abs": str(Decimal(str(critical["p"])) / Decimal("100000")) if critical.get("p") else "",
            "triple_point_c": str(Decimal(str(triple["T"])) - Decimal("273.15")) if triple.get("T") else "",
            "nominal_glide_k": "not_applicable", "normal_density_kg_m3": "",
            "molar_mass_g_mol": str(Decimal(str(molar)) * Decimal(1000)) if molar else "",
            "lower_flammability_limit_vol_pct": "", "autoignition_c": "", "oil_notes_fi": "", "oil_notes_en": "",
            "legal_family": "", "eu_annex": "", "identity_status": "verified", "composition_status": "not_applicable",
            "safety_status": "partial", "thermo_status": "partial", "regulatory_eu_fi_status": "unsupported", "pt_status": "unsupported",
            "identity_source_id": "coolprop-mit", "safety_source_id": "", "environmental_source_id": "",
            "thermo_source_id": "coolprop-mit", "regulatory_source_id": "", "reviewed_at": CHECKED,
            "_aliases": [x for x in labels if x and x != code], "_coolprop_file": stem,
        }
        # If two source spellings normalize to one code, prefer the lowercase suffix used in INFO.NAME.
        existing = records.get(rid)
        if not existing or (info.get("NAME", "") == code):
            records[rid] = rec
            record_raw_labels[rid] = labels

# CoolProp exposes R1234ze(E) both as the canonical isomer and as a short R1234ZE
# alias. Keep the explicit isomer designation as the record and redirect all
# source recipes using the short spelling to it; never publish the same CAS twice.
redirects = {}
by_cas = {}
for rid, rec in records.items():
    if rec.get("cas_number"):
        by_cas.setdefault(rec["cas_number"], []).append(rid)
for cas, ids in by_cas.items():
    if len(ids) < 2:
        continue
    preferred = sorted(ids, key=lambda rid: ("(" not in records[rid]["designation"], records[rid]["designation"].lower() != records[rid].get("chemical_name", "").lower(), rid))[0]
    target = records[preferred]
    for duplicate in ids:
        if duplicate == preferred:
            continue
        target.setdefault("_aliases", []).append(records[duplicate]["designation"])
        target.setdefault("_aliases", []).extend(records[duplicate].get("_aliases", []))
        redirects[duplicate] = preferred
        del records[duplicate]

# A non-designation name read directly from a CoolProp INFO.NAME field has
# different provenance from later manufacturer/legal overlays on the same row.
for rec in records.values():
    if rec["kind"] == "pure" and rec["chemical_name"] != rec["designation"]:
        rec.setdefault("_fact_sources", {})["chemical_name"] = ["coolprop-mit"]

def canonical_id(value):
    candidate = slug(value)
    return redirects.get(candidate, candidate)

# EPA source adds 44 sourced blends and 27 identity-only rows after source-level overlap.
epa = json.loads((ROOT / "data/staging/epa-inventory.json").read_text(encoding="utf-8"))
epa_blends = {}
for entry in epa["entries"]:
    designation = canonical_code(entry["designation"])
    rid = slug(designation)
    composition_source = entry["sourceUrl"].rstrip("/").endswith("compositions-refrigerant-blends")
    src = "epa-snap-compositions" if composition_source else "epa-gwp-identities"
    if entry.get("kind") == "blend" and composition_source:
        epa_blends[rid] = entry
    if rid not in records:
        records[rid] = {
            "id": rid, "designation": designation, "kind": entry.get("kind", "pure"),
            "chemical_name": entry.get("name") or designation, "formula": "", "cas_number": "",
            "ashrae_safety_group": "", "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
            "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "", "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
            "normal_boiling_c": "", "critical_temp_c": "", "critical_pressure_bar_abs": "", "triple_point_c": "",
            "nominal_glide_k": "" if entry.get("kind") == "blend" else "not_applicable", "normal_density_kg_m3": "", "molar_mass_g_mol": "",
            "lower_flammability_limit_vol_pct": "", "autoignition_c": "", "oil_notes_fi": "", "oil_notes_en": "",
            "legal_family": "", "eu_annex": "", "identity_status": "verified", "composition_status": "verified" if rid in epa_blends else ("partial" if entry.get("kind") == "blend" else "not_applicable"),
            "safety_status": "partial", "thermo_status": "unsupported", "regulatory_eu_fi_status": "unsupported", "pt_status": "unsupported",
            "identity_source_id": src, "safety_source_id": "", "environmental_source_id": "", "thermo_source_id": "", "regulatory_source_id": "",
            "reviewed_at": CHECKED, "_aliases": [],
        }
    else:
        records[rid]["identity_status"] = "verified"
        records[rid]["identity_source_id"] = records[rid]["identity_source_id"] + ";" + src
        if entry.get("name") and records[rid]["chemical_name"] in ("", designation):
            records[rid]["chemical_name"] = entry["name"]
            if records[rid]["kind"] == "pure":
                records[rid].setdefault("_fact_sources", {})["chemical_name"] = [src]
    # EPA-supplied safety group is not presumed to be ASHRAE data; manufacturer/primary records overlay below.

# Component-only EPA species must exist as pure records so all references remain resolvable.
for entry in epa_blends.values():
    for comp in entry["components"]:
        cid = slug(comp["designation"])
        if cid not in records:
            code = canonical_code(comp["designation"])
            records[cid] = {
                "id": cid, "designation": code, "kind": "pure", "chemical_name": code, "formula": "", "cas_number": "",
                "ashrae_safety_group": "", "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
                "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "", "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
                "normal_boiling_c": "", "critical_temp_c": "", "critical_pressure_bar_abs": "", "triple_point_c": "", "nominal_glide_k": "not_applicable",
                "normal_density_kg_m3": "", "molar_mass_g_mol": "", "lower_flammability_limit_vol_pct": "", "autoignition_c": "",
                "oil_notes_fi": "", "oil_notes_en": "", "legal_family": "", "eu_annex": "", "identity_status": "partial",
                "composition_status": "not_applicable", "safety_status": "partial", "thermo_status": "unsupported",
                "regulatory_eu_fi_status": "unsupported", "pt_status": "unsupported", "identity_source_id": "epa-snap-compositions",
                "safety_source_id": "", "environmental_source_id": "", "thermo_source_id": "", "regulatory_source_id": "", "reviewed_at": CHECKED, "_aliases": [],
            }

# Resolve CoolProp fluid names to pure R records, then add unique R-designated mixture recipes.
fluid_to_r = {}
for rid, rec in records.items():
    if rec["kind"] != "pure":
        continue
    for label in [rec["designation"], rec.get("chemical_name", ""), *rec.get("_aliases", [])]:
        if label:
            fluid_to_r[slug(label).upper()] = rid
for stem, raw in fluid_files.items():
    info = raw.get("INFO", {})
    aliases = [stem, info.get("NAME", ""), *info.get("ALIASES", []), info.get("REFPROP_NAME", "")]
    for alias in aliases:
        if alias and slug(alias).upper() in fluid_to_r:
            fluid_to_r[slug(alias).upper()] = fluid_to_r[slug(alias).upper()]

components = []
for rid, entry in sorted(epa_blends.items()):
    for comp in entry["components"]:
        components.append({
            "refrigerant_id": rid, "component_refrigerant_id": canonical_id(comp["designation"]),
            "mass_fraction": str(Decimal(str(comp["massFraction"]))), "legal_family": "",
            "source_id": "epa-snap-compositions", "reviewed_at": CHECKED,
        })

mixture_data = json.loads((COOL / "dev/mixtures/predefined_mixtures.json").read_text(encoding="utf-8"))
seen_recipe_ids = set()
for recipe in mixture_data:
    name = recipe.get("name", "")
    if not is_r_code(name):
        continue
    designation = canonical_code(name)
    rid = slug(designation)
    if rid in epa_blends or rid in seen_recipe_ids:
        continue
    seen_recipe_ids.add(rid)
    ingredient_masses = []
    unresolved = []
    for fluid, mole_fraction in zip(recipe.get("fluids", []), recipe.get("mole_fractions", [])):
        source = fluid_aliases.get(slug(fluid))
        component_id = fluid_to_r.get(slug(fluid).upper())
        if not component_id and source:
            src_name, _raw = source
            component_id = fluid_to_r.get(slug(src_name).upper())
        if not component_id or not source:
            unresolved.append(fluid)
            break
        mass_molar = source[1].get("EOS", [{}])[0].get("molar_mass")
        if not mass_molar:
            unresolved.append(fluid)
            break
        ingredient_masses.append((component_id, Decimal(str(mole_fraction)) * Decimal(str(mass_molar))))
    if unresolved:
        continue
    total = sum((mass for _, mass in ingredient_masses), Decimal(0))
    grouped = {}
    for cid, mass in ingredient_masses:
        grouped[cid] = grouped.get(cid, Decimal(0)) + mass / total
    ordered = sorted(grouped.items())
    fractions = [(cid, value.quantize(Decimal("0.000000000001"), rounding=ROUND_HALF_UP)) for cid, value in ordered]
    fractions[-1] = (fractions[-1][0], fractions[-1][1] + Decimal(1) - sum((value for _, value in fractions), Decimal(0)))
    records[rid] = {
        "id": rid, "designation": designation, "kind": "blend", "chemical_name": designation, "formula": "", "cas_number": "",
        "ashrae_safety_group": "", "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
        "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "", "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
        "normal_boiling_c": "", "critical_temp_c": "", "critical_pressure_bar_abs": "", "triple_point_c": "", "nominal_glide_k": "",
        "normal_density_kg_m3": "", "molar_mass_g_mol": "", "lower_flammability_limit_vol_pct": "", "autoignition_c": "",
        "oil_notes_fi": "", "oil_notes_en": "", "legal_family": "", "eu_annex": "", "identity_status": "verified",
        "composition_status": "partial", "safety_status": "partial", "thermo_status": "unsupported", "regulatory_eu_fi_status": "unsupported",
        "pt_status": "unsupported", "identity_source_id": "coolprop-mit", "safety_source_id": "", "environmental_source_id": "",
        "thermo_source_id": "", "regulatory_source_id": "", "reviewed_at": CHECKED, "_aliases": [],
    }
    for cid, fraction in fractions:
        components.append({
            "refrigerant_id": rid, "component_refrigerant_id": cid, "mass_fraction": format(fraction, "f"), "legal_family": "",
            "source_id": "coolprop-mit", "reviewed_at": CHECKED,
        })

# Overlay a scoped set of manufacturer safety facts and aliases.
manufacturer_path = ROOT / "data/staging/manufacturer-properties.json"
manufacturer = json.loads(manufacturer_path.read_text(encoding="utf-8")) if manufacturer_path.exists() else {"sources": [], "entries": []}
for item in manufacturer.get("sources", []):
    publisher = item.get("publisher") or item["id"].split("-", 1)[0].title()
    sources.append(source_row(item["id"], item["title"], publisher, item["url"], item["version"], item["license"], "Selected manufacturer facts only.", item.get("note", "")))
for entry in manufacturer.get("entries", []):
    rid = entry["id"]
    if rid not in records:
        continue
    rec = records[rid]
    rec["ashrae_safety_group"] = entry.get("ashrae_safety_group", "")
    if rec["ashrae_safety_group"]:
        rec["safety_source_id"] = entry["sourceId"]
        rec["safety_status"] = "verified"
    if entry.get("chemical_name"):
        rec["chemical_name"] = entry["chemical_name"]
        rec["identity_source_id"] = ";".join(sorted(set(rec["identity_source_id"].split(";") + [entry["sourceId"]])))
        rec.setdefault("_fact_sources", {})["chemical_name"] = [entry["sourceId"]]
    publisher = entry["sourceId"].split("-", 1)[0].title()
    for alias in entry.get("aliases", []):
        rec.setdefault("_manufacturer_aliases", []).append((alias, publisher, entry["sourceId"], "en"))

# Overlay only source-verified legal facts; importer refuses undeclared or orphaned IDs.
legal_path = ROOT / "data/staging/legal-supplement.json"
legal = json.loads(legal_path.read_text(encoding="utf-8")) if legal_path.exists() else {"sources": [], "records": []}
for source in legal.get("sources", []):
    if not any(existing["source_id"] == source["id"] for existing in sources):
        sources.append(source_row(source["id"], source["title"], source.get("publisher", "European Union"), source["url"], legal.get("checkedAt", CHECKED), "Official EU legal text; attribution", legal.get("scope", "Verified legal annex facts only."), "Exact item evidence and source URL are recorded in data/staging/legal-supplement.json."))
for item in legal.get("records", []):
    rid = item["id"]
    if rid not in records:
        designation = item["designation"]
        records[rid] = {
            "id": rid, "designation": designation, "kind": "pure", "chemical_name": designation,
            "formula": "", "cas_number": "", "ashrae_safety_group": "", "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
            "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "", "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
            "normal_boiling_c": "", "critical_temp_c": "", "critical_pressure_bar_abs": "", "triple_point_c": "", "nominal_glide_k": "not_applicable",
            "normal_density_kg_m3": "", "molar_mass_g_mol": "", "lower_flammability_limit_vol_pct": "", "autoignition_c": "",
            "oil_notes_fi": "", "oil_notes_en": "", "legal_family": "", "eu_annex": "", "identity_status": "verified",
            "composition_status": "not_applicable", "safety_status": "partial", "thermo_status": "unsupported", "regulatory_eu_fi_status": "unsupported",
            "pt_status": "unsupported", "identity_source_id": ";".join(item["sourceIds"]), "safety_source_id": "", "environmental_source_id": "",
            "thermo_source_id": "", "regulatory_source_id": "", "reviewed_at": CHECKED, "_aliases": [],
        }
    rec = records[rid]
    rec["eu_annex"] = item["eu_annex"]
    rec["legal_family"] = item["legal_family"]
    rec["regulatory_source_id"] = ";".join(item["sourceIds"])
    rec["regulatory_eu_fi_status"] = "verified"
    if item.get("gwp"):
        if item["gwp"]["basis"].startswith("EU-2024/573-"):
            rec["gwp_eu_2024_573_100yr"] = item["gwp"]["value"]
            rec["gwp_eu_2024_573_basis"] = item["gwp"]["basis"]
            if item["gwp"]["basis"].endswith("AR4"):
                rec["gwp_ar4_100"] = item["gwp"]["value"]
        elif item["gwp"]["basis"].startswith("EU-2024/590-"):
            rec["gwp_eu_2024_590_100yr"] = item["gwp"]["value"]
            rec["gwp_eu_2024_590_basis"] = item["gwp"]["basis"]
        rec["environmental_source_id"] = ";".join(item["sourceIds"])
    if item.get("optionalODP") is not None:
        rec["odp"] = item["optionalODP"]
        rec["environmental_source_id"] = ";".join(item["sourceIds"])

# Additional reviewed legal component mapping for R-514A. Keep the Annex VI
# default distinct from a measured GWP and from an Annex II substance value.
r514a_legal_path = ROOT / "data/staging/r514a-legal-root.json"
if r514a_legal_path.exists():
    r514a_legal = json.loads(r514a_legal_path.read_text(encoding="utf-8"))
    for item in r514a_legal["records"]:
        rec = records[item["id"]]
        rec["eu_annex"] = item["eu_annex"]
        rec["legal_family"] = item.get("legal_family", "non_fluorinated")
        rec["regulatory_source_id"] = ";".join(item["sourceIds"])
        rec["regulatory_eu_fi_status"] = "verified"
        rec["gwp_eu_2024_573_100yr"] = item["gwp"]["value"]
        rec["gwp_eu_2024_573_basis"] = item["gwp"]["basis"]
        rec["environmental_source_id"] = "eu-2024-573"
        rec.setdefault("_fact_sources", {})["gwp_eu_2024_573_100yr"] = ["eu-2024-573"]

# The source's environmental metadata uses -1 and 99999999 as unknown
# sentinels. Only explicit non-negative values below 10 and valid safety
# classes are imported. Existing legal/manufacturer facts take precedence.
for rid, rec in records.items():
    stem = rec.get("_coolprop_file")
    if not stem or rec["kind"] != "pure":
        continue
    raw = fluid_files.get(stem.upper(), {})
    env = raw.get("INFO", {}).get("ENVIRONMENTAL", {})
    cls = env.get("ASHRAE34")
    if not rec["ashrae_safety_group"] and isinstance(cls, str) and re.fullmatch(r"[AB](?:1|2L?|3)", cls):
        rec["ashrae_safety_group"] = cls
        rec["safety_source_id"] = "coolprop-mit"
        rec["safety_status"] = "verified"
        rec.setdefault("_fact_sources", {})["ashrae_safety_group"] = ["coolprop-mit"]
    odp = env.get("ODP")
    if not rec["odp"] and isinstance(odp, (int, float)) and 0 <= odp < 10:
        rec["odp"] = str(odp)
        rec["environmental_source_id"] = ";".join(sorted(set(filter(None, [*rec["environmental_source_id"].split(";"), "coolprop-mit"]))))
        rec.setdefault("_fact_sources", {})["odp"] = ["coolprop-mit"]
    elif rec["odp"]:
        rec.setdefault("_fact_sources", {})["odp"] = rec["environmental_source_id"].split(";")

# Curated source overlays are applied after the pinned bulk import. Their
# component fractions are direct reported mass percentages, not converted
# CoolProp mole recipes.
names_path = ROOT / "data/staging/chemical-names.json"
names = json.loads(names_path.read_text(encoding="utf-8"))
for item in names["sources"]:
    if not any(existing["source_id"] == item["id"] for existing in sources):
        sources.append(source_row(item["id"], item["title"], item["publisher"], item["url"], item["version"], item["license"], item["scope"], names["note"]))
for item in names["records"]:
    rid, src = item["id"], item["sourceId"]
    if rid not in records or src not in {row["source_id"] for row in sources}:
        raise SystemExit(f"Unknown chemical-name identity or source: {rid} / {src}")
    rec = records[rid]
    if rec["kind"] != "pure" or (item.get("cas") and item["cas"] != rec["cas_number"]):
        raise SystemExit(f"Chemical-name identity/CAS mismatch: {rid}")
    if rec["chemical_name"] not in (rec["designation"], item["name"], item.get("replacesAlias")):
        raise SystemExit(f"Conflicting chemical name: {rid}: {rec['chemical_name']} / {item['name']}")
    rec["chemical_name"] = item["name"]
    rec["identity_source_id"] = ";".join(sorted(set(filter(None, [*rec["identity_source_id"].split(";"), src]))))
    rec.setdefault("_fact_sources", {})["chemical_name"] = [src]

# Extend the pinned source union with separately reviewed UNEP/EPA candidate
# records. The staged file is a stable source extract; no legal GWP or equipment
# approval is inferred from its reported recipes and safety groups.
inventory_path = ROOT / "data/staging/inventory-v3-candidates.json"
if inventory_path.exists():
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    if inventory.get("schema") != "phasekit-inventory-candidates-v3":
        raise SystemExit("Unknown inventory candidate schema")
    for item in inventory["sources"]:
        if not any(existing["source_id"] == item["id"] for existing in sources):
            sources.append(source_row(item["id"], item["title"], item["publisher"], item["url"], item["version"], item.get("license", "UNEP/EPA public source; attribution"), item["scope"]))
    known_sources = {row["source_id"] for row in sources}
    for item in inventory["candidates"]:
        rid, code, kind = item["id"], item["designation"], item["kind"]
        if rid in records or slug(code) != rid or kind not in ("pure", "blend"):
            raise SystemExit(f"Duplicate or invalid inventory identity: {rid}")
        if not set(item["sourceIds"]) <= known_sources:
            raise SystemExit(f"Unknown inventory identity source: {rid}")
        # TEAP 2024 reported application-dependent A1/A2L for R485A, while
        # its 2025 table reports A2L. With no application condition in this
        # schema, leave the class unknown rather than imply universality.
        safety = "" if rid == "r485a" else (item.get("safetyGroup") or "")
        safety_ids = [] if rid == "r485a" else item["fieldEvidence"].get("safetyGroup", [])
        if safety and (not safety_ids or not set(safety_ids) <= known_sources):
            raise SystemExit(f"Unsourced inventory safety group: {rid}")
        rec = {
            "id": rid, "designation": code, "kind": kind, "chemical_name": item["name"],
            "formula": item.get("formula") or "", "cas_number": item.get("cas") or "",
            "ashrae_safety_group": safety, "ped_fluid_group": "", "odp": "", "gwp_ar4_100": "",
            "gwp_eu_2024_573_100yr": "", "gwp_eu_2024_573_basis": "", "gwp_eu_2024_590_100yr": "", "gwp_eu_2024_590_basis": "",
            "normal_boiling_c": "", "critical_temp_c": "", "critical_pressure_bar_abs": "", "triple_point_c": "",
            "nominal_glide_k": "not_applicable" if kind == "pure" else "", "normal_density_kg_m3": "", "molar_mass_g_mol": "",
            "lower_flammability_limit_vol_pct": "", "autoignition_c": "", "oil_notes_fi": "", "oil_notes_en": "", "oil_typical": "", "oil_possible": "",
            "legal_family": "", "eu_annex": "", "identity_status": "verified", "composition_status": "not_applicable" if kind == "pure" else "verified",
            "safety_status": "verified" if safety else "partial", "thermo_status": "unsupported", "regulatory_eu_fi_status": "unsupported", "pt_status": "unsupported",
            "identity_source_id": ";".join(sorted(item["sourceIds"])), "safety_source_id": ";".join(sorted(safety_ids)),
            "environmental_source_id": "", "thermo_source_id": "", "regulatory_source_id": "", "reviewed_at": CHECKED,
            "_aliases": [], "_fact_sources": {"chemical_name": item["fieldEvidence"]["name"]} if kind == "pure" else {},
        }
        if safety:
            rec["_fact_sources"]["ashrae_safety_group"] = safety_ids
        records[rid] = rec
    for item in inventory["candidates"]:
        if item["kind"] != "blend":
            continue
        if sum((Decimal(part["massPercent"]) for part in item["composition"]), Decimal(0)) != Decimal(100):
            raise SystemExit(f"Inventory mass fractions do not total 100: {item['id']}")
        for part in item["composition"]:
            cid, src = part["refrigerantId"], part["sourceId"]
            if cid not in records or records[cid]["kind"] != "pure" or src not in known_sources:
                raise SystemExit(f"Unknown inventory composition component/source: {item['id']} / {cid}")
            components.append({"refrigerant_id": item["id"], "component_refrigerant_id": cid,
                               "mass_fraction": format(Decimal(part["massPercent"]) / Decimal(100), "f"),
                               "legal_family": "", "source_id": src, "reviewed_at": CHECKED})
    for item in inventory.get("reconciliation", []):
        if item["action"] != "alias_of_existing" or item["existingId"] not in records or item["sourceId"] not in known_sources:
            raise SystemExit(f"Invalid inventory alias reconciliation: {item}")
        records[item["existingId"]].setdefault("_source_aliases", []).append((item["designation"], item["sourceId"]))

    inventory_legal = json.loads((ROOT / "data/staging/inventory-v3-legal.json").read_text(encoding="utf-8"))
    for item in inventory_legal["records"]:
        rid = item["id"]
        if rid not in records or records[rid]["kind"] != "pure" or records[rid]["designation"] != item["designation"]:
            raise SystemExit(f"Invalid inventory legal identity: {rid}")
        if set(item["sourceIds"]) - known_sources:
            raise SystemExit(f"Unknown inventory legal source: {rid}")
        rec = records[rid]
        rec["eu_annex"] = item["eu_annex"]
        rec["legal_family"] = item["legal_family"]
        rec["regulatory_source_id"] = ";".join(item["sourceIds"])
        rec["regulatory_eu_fi_status"] = "verified"
        basis, value = item["gwp"]["basis"], item["gwp"]["value"]
        key = "gwp_eu_2024_590_100yr" if basis.startswith("EU-2024/590-") else "gwp_eu_2024_573_100yr"
        rec[key] = value
        rec[key.replace("_100yr", "_basis")] = basis
        rec["environmental_source_id"] = ";".join(item["sourceIds"])
        rec.setdefault("_fact_sources", {})["euAnnex"] = item["sourceIds"]
        rec["_fact_sources"][key] = item["sourceIds"]
        if item.get("optionalODP") is not None:
            rec["odp"] = item["optionalODP"]
            rec["_fact_sources"]["odp"] = item["sourceIds"]

for rec in records.values():
    rec.setdefault("oil_typical", "")
    rec.setdefault("oil_possible", "")
supplement_path = ROOT / "data/staging/property-composition-supplement.json"
supplement = json.loads(supplement_path.read_text(encoding="utf-8")) if supplement_path.exists() else {"sources": [], "properties": [], "compositions": []}
for item in supplement.get("sources", []):
    if not any(existing["source_id"] == item["id"] for existing in sources):
        sources.append(source_row(item["id"], item["title"], item["publisher"], item["url"], item["version"], item["license"], item["scope"], item.get("note", "")))
for item in supplement.get("properties", []):
    rid = item["id"]
    if rid not in records:
        raise SystemExit(f"Unknown supplement refrigerant {rid}")
    rec = records[rid]
    conditions = json.loads(rec["thermo_conditions_json"]) if rec.get("thermo_conditions_json") else {}
    for field, source_value in item["facts"].items():
        if field not in rec:
            raise SystemExit(f"Unknown supplement fact {field} on {rid}")
        value, src = source_value["value"], source_value["sourceId"]
        if src not in {row["source_id"] for row in sources}:
            raise SystemExit(f"Unknown supplement source {src} on {rid}")
        if rec[field] and rec[field] != value:
            if item.get("policy") == "bitzer":
                if field == "ashrae_safety_group" and rec["safety_source_id"] == "coolprop-mit":
                    pass  # current BITZER ISO817 class supersedes older CoolProp metadata
                else:
                    continue  # legal/product facts retain precedence; source conflict remains reviewable
            else:
                raise SystemExit(f"Conflicting supplement fact {field} on {rid}: {rec[field]} != {value}")
        if rec[field] and item.get("policy") == "bitzer" and rec[field] == value:
            continue  # retain the more specific source already attached
        rec[field] = value
        if source_value.get("conditions"):
            conditions[field] = source_value["conditions"]
        fact_key = "oil_notes" if field == "oil_notes_fi" else field
        rec.setdefault("_fact_sources", {})[fact_key] = [src]
        group = "safety_source_id" if field in ("ashrae_safety_group", "lower_flammability_limit_vol_pct", "autoignition_c", "oil_notes_fi", "oil_notes_en", "oil_typical", "oil_possible") else ("environmental_source_id" if field == "odp" else "thermo_source_id")
        rec[group] = ";".join(sorted(set(filter(None, [*rec[group].split(";"), src]))))
        if field == "ashrae_safety_group":
            rec["safety_status"] = "verified"
        if field in ("normal_boiling_c", "critical_pressure_bar_abs", "molar_mass_g_mol") and rec["thermo_status"] == "unsupported":
            rec["thermo_status"] = "partial"
    if conditions:
        rec["thermo_conditions_json"] = json.dumps(conditions, sort_keys=True, separators=(",", ":"))
for item in supplement.get("compositions", []):
    rid, src = item["id"], item["sourceId"]
    if rid not in records or records[rid]["kind"] != "blend":
        raise SystemExit(f"Unknown supplement blend {rid}")
    if records[rid]["composition_status"] == "verified":
        continue
    composition = item["massPercent"]
    if sum(Decimal(str(v)) for v in composition.values()) != Decimal(100):
        raise SystemExit(f"Supplement mass percentages do not total 100: {rid}")
    if any(cid not in records or records[cid]["kind"] != "pure" for cid in composition):
        raise SystemExit(f"Unknown supplement component: {rid}")
    components = [row for row in components if row["refrigerant_id"] != rid]
    for cid, pct in sorted(composition.items()):
        components.append({"refrigerant_id": rid, "component_refrigerant_id": cid, "mass_fraction": str(Decimal(str(pct))/100), "legal_family": "", "source_id": src, "reviewed_at": CHECKED})
    records[rid]["composition_status"] = "verified"

# Natural substances get an explicitly scoped negative schedule lookup, not inferred GWP/class values.
for code in ["R170", "R290", "R600", "R600a", "R744", "R717", "R718", "R1270", "R1150"]:
    rid = slug(code)
    if rid in records and not records[rid]["eu_annex"]:
        records[rid]["eu_annex"] = "none"
        records[rid]["legal_family"] = "natural"
        records[rid]["regulatory_source_id"] = "eu-2024-573;eu-2024-590"
        records[rid]["regulatory_eu_fi_status"] = "verified"

# A blend's regulatory-data coverage is verified only when its source-backed
# composition is complete and every component has a verified EU schedule class.
components_by_blend = {}
for component in components:
    components_by_blend.setdefault(component["refrigerant_id"], []).append(component)
for rid, rec in records.items():
    if rec["kind"] != "blend" or rec["composition_status"] != "verified":
        continue
    component_records = [records.get(item["component_refrigerant_id"]) for item in components_by_blend.get(rid, [])]
    if component_records and all(component is not None and component["eu_annex"] and component["regulatory_source_id"] for component in component_records):
        legal_ids = set()
        for component in component_records:
            legal_ids.update(component["regulatory_source_id"].split(";"))
        rec["regulatory_source_id"] = ";".join(sorted(legal_ids))
        rec["regulatory_eu_fi_status"] = "verified"

# Emit canonical tables in template order plus the documented 2024 legal fact columns.
source_by_id = {row["source_id"]: row for row in sources}
sources = [source_by_id[key] for key in sorted(source_by_id)]
refrigerant_fields = ["id", "designation", "kind", "chemical_name", "formula", "cas_number", "ashrae_safety_group", "ped_fluid_group", "odp", "gwp_ar4_100", "gwp_eu_2024_573_100yr", "gwp_eu_2024_573_basis", "gwp_eu_2024_590_100yr", "gwp_eu_2024_590_basis", "normal_boiling_c", "critical_temp_c", "critical_pressure_bar_abs", "triple_point_c", "nominal_glide_k", "normal_density_kg_m3", "molar_mass_g_mol", "thermo_conditions_json", "lower_flammability_limit_vol_pct", "autoignition_c", "oil_notes_fi", "oil_notes_en", "oil_typical", "oil_possible", "legal_family", "eu_annex", "identity_status", "composition_status", "safety_status", "thermo_status", "regulatory_eu_fi_status", "pt_status", "identity_source_id", "safety_source_id", "environmental_source_id", "thermo_source_id", "regulatory_source_id", "reviewed_at", "fact_source_ids_json"]
components.sort(key=lambda row: (row["refrigerant_id"], row["component_refrigerant_id"]))
# Reduce any repeated source recipe rows by component id; EPA rows take precedence over converted recipes.
unique_components = {}
for row in components:
    key = (row["refrigerant_id"], row["component_refrigerant_id"])
    previous = unique_components.get(key)
    if previous is None or row["source_id"] == "epa-snap-compositions":
        unique_components[key] = row
components = [unique_components[key] for key in sorted(unique_components)]
# R-number spellings and manufacturer trade names only; chemical labels remain in `chemical_name`.
alias_rows = []
for rid, rec in records.items():
    rec["fact_source_ids_json"] = json.dumps(rec.get("_fact_sources", {}), sort_keys=True, separators=(",", ":")) if rec.get("_fact_sources") else ""
    designation = rec["designation"]
    if designation.startswith("RE") and len(designation) > 2:
        alias = "RE-" + designation[2:]
        if slug(alias) == rid and alias != designation:
            alias_rows.append({"refrigerant_id": rid, "alias": alias, "normalized_alias": slug(alias), "kind": "spelling", "manufacturer": "", "source_id": rec["identity_source_id"].split(";")[0], "locale": "und"})
    elif designation.startswith("R") and len(designation) > 1:
        alias = "R-" + designation[1:]
        if slug(alias) == rid and alias != designation:
            alias_rows.append({"refrigerant_id": rid, "alias": alias, "normalized_alias": slug(alias), "kind": "spelling", "manufacturer": "", "source_id": rec["identity_source_id"].split(";")[0], "locale": "und"})
    for alias in rec.get("_aliases", []):
        if alias and is_r_code(alias) and slug(alias) != rid:
            alias_rows.append({"refrigerant_id": rid, "alias": alias, "normalized_alias": slug(alias), "kind": "spelling", "manufacturer": "", "source_id": rec["identity_source_id"].split(";")[0], "locale": "und"})
    for alias, maker, source_id, locale in rec.get("_manufacturer_aliases", []):
        if alias:
            alias_rows.append({"refrigerant_id": rid, "alias": alias, "normalized_alias": slug(alias), "kind": "trade_name", "manufacturer": maker or "unknown", "source_id": source_id, "locale": locale})
    for alias, source_id in rec.get("_source_aliases", []):
        alias_rows.append({"refrigerant_id": rid, "alias": alias, "normalized_alias": slug(alias), "kind": "historical", "manufacturer": "", "source_id": source_id, "locale": "und"})
# deterministic key dedupe; ambiguities across different refrigerants are left for validation/review, never hidden.
by_key = {}
for row in alias_rows:
    by_key[(row["refrigerant_id"], row["normalized_alias"], row["alias"])] = row
alias_rows = [by_key[key] for key in sorted(by_key)]
write_csv("refrigerants.csv", [{key: value for key, value in rec.items() if key in refrigerant_fields} for _, rec in sorted(records.items())], refrigerant_fields)
write_csv("components.csv", components, ["refrigerant_id", "component_refrigerant_id", "mass_fraction", "legal_family", "source_id", "reviewed_at"])
write_csv("aliases.csv", alias_rows, ["refrigerant_id", "alias", "normalized_alias", "kind", "manufacturer", "source_id", "locale"])
write_csv("sources.csv", sources, ["source_id", "title", "publisher", "url", "version_or_date", "license_or_terms", "scope", "checked_at", "checked_by", "notes"])
destination = "canonical data/ tables" if WRITE_CANONICAL else "review export in data/staging/coolprop-export/"
print(f"Wrote {len(records)} R/RE-designated identities, {sum(r['kind']=='blend' for r in records.values())} blends, {len(components)} component rows, {len(alias_rows)} aliases, {len(sources)} sources to {destination}")
