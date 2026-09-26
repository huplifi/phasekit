# PhaseKit

A source-attributed refrigerant reference and calculation app for refrigeration work. Built with React, strict TypeScript and Vite, with local IndexedDB storage and an installable offline PWA. The interface supports Finnish and English; project documentation is maintained in English.

The stable `main` release remains **0.1.0**. The separate public beta contains the expanded field tools, refrigeration cycle and P–h chart, saved reports, and equipment-linked history. Beta features and data are isolated from stable production until an explicitly authorised release.

- **249 refrigerant records**, including legacy, ODS, natural and newer blends. Coverage is explicit: this is not a complete inventory of every refrigerant or property.
- Bidirectional pressure–temperature conversion for **124 refrigerants**.
- A combined refrigeration-cycle tool: LP/HP, suction, hot gas and liquid temperatures; superheat, subcooling and a log(p)–h diagram for **113 supported refrigerants**. Saved reports retain a frozen chart and can be exported as PNG.
- kg ↔ t CO₂e conversion using a visible, source-backed GWP basis and source-gated component breakdown.
- EU/Finland periodic leak-check assessment, contextual restrictions and effective dates, completed-inspection-based next due date and shareable explanation.
- Search with regulation/model/oil filters, favourites and comparison.
- General unit conversion, sensible thermal power, electrical/Ohm calculations, pipe volume/velocity, material thermal expansion, bounded single-phase straight-pipe pressure loss and local field reports.
- Frozen calculation reports, equipment/site-linked history with device associations, JSON backup/restore and consistent result-first print-to-PDF reports. Reports collects drafts, finalised field reports, leak checks and calculations. Commissioning, evacuation, tightness, service and refrigerant records retain observations and marked/unmarked steps. Date, technician and signature name are separate; finalising freezes the record and editing creates a new revision. Supported commissioning measurements can attach a frozen cycle chart.
- Light/dark themes, bundled fonts and offline data. No accounts, analytics or cloud storage.

[Stable app](https://phasekit.app) · [Public beta](https://beta.phasekit.app) · [Changelog](CHANGELOG.md) · [In-app release history](https://beta.phasekit.app/#/releases) · [Beta workflow](docs/BETA-RELEASE-WORKFLOW.md) · [Beta verification](docs/BETA-FIELD-REPORTS.md) · [Roadmap](docs/ROADMAP.md) · [Preview verification](docs/PREVIEW-VERIFICATION.md) · [Testing guide](docs/PREVIEW-TESTING.md) · [Data coverage](docs/COVERAGE.md) · [Calculation limits](docs/THERMODYNAMICS.md) · [p–h model](docs/PH-THERMODYNAMICS.md) · [Verification](docs/VERIFICATION.md)

## Development

Use Node.js 24 and pnpm 11.19.0, as pinned in `.nvmrc` and `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm data:build
pnpm tokens:build
pnpm dev
```

Open `http://127.0.0.1:5173`. The development server does not register the production service worker.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

The production preview runs at `http://127.0.0.1:4173`. To run browser checks:

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Chromium covers mobile and desktop workflows; targeted WebKit projects cover forms, the refrigeration cycle and the preview tools. Tests use isolated browser storage. Build before testing and do not rebuild the same output directory during a browser run.

## Netlify deployment

**This expansion is a separate public beta.** `beta` deploys to the `phasekit-beta` Netlify project; `main` still deploys the stable app. Feature PRs should target `beta`. A beta-to-main release PR requires the owner’s explicit stable-release decision. Beta and preview storage are separate from production. See the [release workflow](docs/BETA-RELEASE-WORKFLOW.md).

For the production configuration, import [huplifi/phasekit](https://github.com/huplifi/phasekit) into Netlify and deploy `main`. The repository's `netlify.toml` specifies the build command, publish directory and Node version:

| Setting           | Value           |
| ----------------- | --------------- |
| Base directory    | Repository root |
| Build command     | `pnpm build`    |
| Publish directory | `apps/web/dist` |
| Node.js           | 24              |

No runtime secrets or backend services are required. Add `phasekit.app` as a custom domain in Netlify and follow the DNS records supplied for that project. See [deployment instructions](docs/DEPLOYMENT.md).

Browser storage belongs to an origin. Export a backup from the old site before moving to the new domain, then import it in Settings. Favourites, calculations and field reports do not migrate automatically. Reports are local to this browser, not cloud-synchronised. Export a Settings backup for safekeeping; PDF/text exports are readable documents, while the JSON backup preserves editable records.

## Repository layout

| Path                        | Responsibility                                                      |
| --------------------------- | ------------------------------------------------------------------- |
| `apps/web`                  | React PWA, local storage and interface                              |
| `packages/core`             | Types, units, thermodynamic providers and calculations              |
| `packages/refrigerant-data` | CSV schemas, validation, deterministic builds and search            |
| `packages/rulesets/eu-fi`   | Regional rules, thresholds and restrictions                         |
| `packages/i18n`             | Finnish/English messages                                            |
| `packages/ui`               | Generated semantic design tokens                                    |
| `data`                      | Canonical CSV records, source references and reviewed import inputs |
| `tests`                     | Unit, integration, persistence and browser checks                   |
| `docs`                      | Architecture, source audits, limits and verification evidence       |

The repository root is the development checkout. Local handoff archives, original design studies, build output and the previous Sites mirror are ignored. The application uses the source and assets committed here.

## Data maintenance

```sh
pnpm data:add R513A
pnpm data:validate
pnpm data:build
pnpm data:coverage
```

The four CSV files under `data/` are the editable source of truth. New facts require field-specific sources and conditions; unknown, not applicable and zero are separate states. Builds use local files and do not fetch data. Read the [contributor guide](docs/DATA-CONTRIBUTING.md), [data architecture](docs/DATA-ARCHITECTURE.md) and [data README](data/README.md) before changing records.

## Limits

Calculated properties are model-derived estimates within a validated interpolation domain. They are not instrument measurements. Unsupported fluids, missing regulatory facts and out-of-range inputs remain explicit. A negative temperature difference is not converted to positive superheat or subcooling. A p–h diagram failure does not discard valid SH/SC results.

The EU/Finland rule engine is a proof of concept requiring qualified regulatory review. Public availability and passing automated tests do not constitute equipment approval or certification. Native app packaging, physical-device installation and assistive-technology testing have separate [release gates](docs/RELEASE-GATES.md).

## Licence

PhaseKit's original code and documentation are available under the [MIT licence](LICENSE). Bundled fonts, dependencies and source-derived refrigerant material retain their own terms and attribution; see [third-party notices](THIRD_PARTY_NOTICES.md). The project licence does not relicense external source publications.

The current beta field-report workflow and acceptance criteria are documented in [Beta field reports](docs/BETA-FIELD-REPORTS.md).
