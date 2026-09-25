# Contributing refrigerant data

Keep each value tied to a source that supports that specific fact. Prefer legislation for legal classifications and legally defined GWPs, government tables for publicly reusable blend compositions, and primary manufacturer materials for selected product names or safety facts. Do not use search snippets, distributor summaries, or old guidance to fill gaps when the primary value is not available.

## Add or change a record

1. Check `data/sources.csv` and the staging files for an existing source version. Add a source row before adding facts. Record the publisher, page/document version, retrieval date, reuse terms, scope, and notes about limitations.
2. Add an identity row in `data/refrigerants.csv`. Use a lowercase alphanumeric ID derived from the designation (`R1234ze(E)` is `r1234zee`). Preserve the source’s displayed designation. Leave absent values blank and set the appropriate coverage status to `partial` or `unsupported`.
3. For a blend, add one row per component in `data/components.csv`. Store mass fraction as an exact decimal between 0 and 1. Include a source on every row. Mark `composition_status=verified` only when the source directly supports the mass fractions and their stated precision. Do not promote a mole-derived conversion to verified composition.
4. Add documented spelling variants to `data/aliases.csv`. Manufacturer or trade names require a non-empty manufacturer and source. Avoid ambiguous normalized aliases across refrigerants.
5. Run `pnpm data:validate`, `pnpm data:build`, and `pnpm data:coverage`. Review the generated dataset version, source list, coverage changes, and exact/fuzzy search behavior.

`pnpm data:add Rxxx` creates an unverified draft. It is not a source of facts and does not establish that the designation is real. Complete and cite its rows before treating it as validated product data.

## Legal facts and blend calculations

Keep regulation basis explicit. EU 2024/573 Annex I HFC GWPs use `EU-2024/573-Annex-I-AR4`; Annex I PFC GWPs use `EU-2024/573-Annex-I-AR6`; Annex II Part 1 values use `EU-2024/573-Annex-II-AR6`. EU 2024/590 ODS values use their separate `gwp_eu_2024_590_*` and `EU-2024/590-Annex-I-GWP100` basis. Never copy a figure from a product sheet, foreign legal regime, or national guide into an EU legal fact.

Blended legal GWP can be derived only from verified mass fractions and the exact component legal GWPs. Preserve the source composition and component source links in the canonical CSVs; do not hard-code a weighted answer as an independent fact. When a source publishes a rounded or conflicting blend value, document it as that source’s value and explain its basis rather than substituting it silently.

## Bulk-source refresh

The CoolProp helper accepts a local checkout pinned to `afce86ff977552663ca3a78d8ea318cc64dcbdfd`. It checks Git HEAD and exits without writing if the source commit differs. It also reads EPA, legal, and manufacturer staging inputs. Run it first without the write flag to create a reviewable export:

```sh
python3 data/import_coolprop.py /path/to/CoolProp
```

Inspect the export under `data/staging/coolprop-export/`. Only after reviewing source changes, rights, values, component links, and diffs should a maintainer intentionally refresh the canonical four CSVs:

```sh
python3 data/import_coolprop.py /path/to/CoolProp --write-canonical
```

The importer does not download sources or modify the external CoolProp checkout. It is a bulk source refresh, not a replacement for the row-level validation/build workflow.
