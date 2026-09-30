"""Load the six pinned, unmodified upstream EOS files into CoolProp 7.2.0.

Used by every offline generator and validator. No model is overwritten and no
binary interaction parameters or mixing rules are estimated.
"""
import hashlib
import json
from pathlib import Path

import CoolProp.CoolProp as cp


def load_supplement():
    folder = Path(__file__).resolve().parent / "coolprop-supplement"
    manifest = json.loads((folder / "manifest.json").read_text())
    if (cp.get_global_param_string("version") != manifest["runtimeVersion"]
            or cp.get_global_param_string("gitrevision") != manifest["runtimeGitRevision"]):
        raise RuntimeError("CoolProp runtime does not match the pinned model supplement")
    for entry in manifest["fluids"]:
        payload = (folder / entry["file"]).read_bytes()
        if hashlib.sha256(payload).hexdigest() != entry["sha256"]:
            raise RuntimeError(f"EOS content hash mismatch: {entry['file']}")
        fluid = json.loads(payload)
        if fluid["INFO"]["NAME"] != entry["name"] or fluid["INFO"]["CAS"] != entry["cas"]:
            raise RuntimeError(f"EOS identity mismatch: {entry['file']}")
        cp.add_fluids_as_JSON("HEOS", json.dumps([fluid]))
    return manifest
