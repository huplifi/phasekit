# PhaseKit refrigerant data

The four CSVs in this directory are the canonical editable dataset:

- `refrigerants.csv` stores stable IDs, source identity, explicit coverage states, and sourced or unknown facts. `fact_source_ids_json` binds individual facts and chemical names to their actual sources when a row combines EU, manufacturer, and open-property evidence. `oil_typical` and `oil_possible` use source-attributed semicolon-separated codes: MO mineral oil, AB alkylbenzene, POE polyol ester, PVE polyvinyl ether, PAO polyalphaolefin, PAG polyalkylene glycol. A listed category is not a compressor approval.
- `components.csv` stores blend mass fractions from 0 to 1, with one source per component row.
- `aliases.csv` stores spelling variants and source-attributed manufacturer names.
- `sources.csv` identifies each source version, scope, terms, and checked date.

Run `pnpm data:add R513A` to add an unverified row, then cite and fill only the facts you can support. Run `pnpm data:validate`, `pnpm data:build`, and `pnpm data:coverage` before accepting the change. See [the architecture](../docs/DATA-ARCHITECTURE.md) and [contributor guide](../docs/DATA-CONTRIBUTING.md).

`staging/` contains source extracts and import inputs, not trusted runtime records by themselves. `import_coolprop.py` is the pinned bulk-import helper; by default it writes a reviewable export under `data/staging/coolprop-export/`. Pass `--write-canonical` only when intentionally refreshing the four canonical tables after reviewing source and diff. It refuses any CoolProp checkout whose Git HEAD differs from the pinned commit. `staging/property-composition-supplement.py` regenerates the separately reviewed, field-attributed UNEP, EPA, Chemours, Honeywell, UL, and BITZER overlay; `staging/chemical-names.json` and `staging/inventory-v3-candidates.json` hold additional reviewed names and UNEP/TEAP inventories. The importer applies these overlays in a documented order, preserves conflicting source-specific product facts, and rejects unknown components or mass fractions that do not sum to 100%. Normal updates should edit canonical CSV rows through the documented validation workflow; build does not fetch network data.

Generated JSON, the compact index, schema, manifest, and coverage reports are build artifacts under `packages/refrigerant-data/generated/` and `docs/COVERAGE*`. They carry a stable dataset version and SHA-256 hash.
