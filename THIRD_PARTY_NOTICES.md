# Third-party notices and data attribution

The root MIT licence covers PhaseKit's original code and documentation. It does not replace the terms attached to third-party software, fonts, publications or source-derived material.

## Fonts

Poppins, Unbounded and Ioskeley Mono retain their SIL Open Font License 1.1 notices. Copies are shipped with the font files under `apps/web/public/fonts/`. Exact releases and files are listed in [FONTS.md](docs/FONTS.md).

## Thermodynamic model and refrigerant sources

CoolProp is used as the source model for offline property tables and as a source of selected fluid metadata. Its MIT notice is retained in `licenses/CoolProp-MIT.txt`. The pinned source revision, model version, numerical validation and supported domains are documented in [THERMODYNAMICS.md](docs/THERMODYNAMICS.md), [PH-THERMODYNAMICS.md](docs/PH-THERMODYNAMICS.md) and [DATA-ARCHITECTURE.md](docs/DATA-ARCHITECTURE.md).

The canonical `data/sources.csv` records the URLs, versions, review dates, scope and terms of regulatory, institutional and manufacturer sources. Individual facts and blend components retain their source IDs. This repository's MIT licence does not grant rights in those external publications or relicense their content. Coverage and source limitations remain explicit in the generated report and source audits.

## Software dependencies

Dependency versions are pinned by `pnpm-lock.yaml`. Their upstream licences and notices remain applicable. Installation obtains each package with its accompanying licence; PhaseKit does not claim ownership of third-party libraries.
