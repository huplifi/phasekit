# PhaseKit public introduction

Review branch: `codex/about-page`. This change prepares the pages; it does not publish them.

- Finnish `/tietoa/`, English `/about/`; the app remains at `/`.
- Complete static HTML from `apps/web/about/render.ts` and `copy.ts`, generated after Vite by `scripts/about-build.ts`. Language navigation and installation disclosures work without JavaScript.
- Existing local PhaseKit fonts, logo and shared tokens. Dedicated marketing layout in `apps/web/public/about/about.css`.
- Primary links open stable; beta is secondary. Beta builds exclude indexing, stable builds emit canonical/hreflang, sitemap and social metadata.
- About routes bypass the app service worker navigation fallback. Marketing assets are excluded from the app precache.
- Origin story supplied by Samu. Author biography is condensed from Samu’s supplied background and study story. LinkedIn appears only in the author section/footer (and structured author metadata).

## Images

Screenshots captured from the actual local app in isolated browser storage, 4 October 2026. Finnish UI in both language versions. All report names, locations and technician information are fictional example data.

- `cycle-desktop.webp`: R134a cycle, 2.5/10 bar(a), 10/70/25 °C input temperatures; original chart and range note retained.
- `refrigerant-mobile.webp`: R134a property view.
- `report-mobile.webp`: completed example service-report print preview.
- `share-fi.png` / `share-en.png`: 1200 × 630 browser-rendered brand compositions with a real screenshot. Regenerate using `node scripts/about-share-images.mjs` with local preview available.

## Verification

Focused unit coverage: route generation, metadata, stable actions, native disclosures, author-link placement, robots and redirects. `tests/e2e/about.spec.ts` checks JavaScript-free navigation, image availability, layout overflow and social image responses.

Before publication, verify Netlify redirects and social crawler retrieval at the actual deployed URL. No search-engine or AI ranking is promised.

## Author and openness

Portrait `samu-hupli.jpg` was supplied by Samu for this page and copied without altering the image. The source-code MIT statement does not grant reuse rights to this portrait. Author copy is first person, based on the supplied background and values. The ten system principles inform concise practical copy rather than a separate manifesto. MIT and third-party notices are linked explicitly.

## Purpose-led revision

The opening now states the memory/learning benefit and explicitly identifies refrigeration work and study across phone, tablet and computer. A short explanation of visible formulas, sources, limits and export precedes a three-step illustrative service workflow. Refrigerant data and report imagery share the workflow; the full feature inventory follows it.

`blend-check-mobile.webp` is a real app screenshot: R513A, 25 kg, assessment date 2026-10-04, stationary refrigeration, no leak detection, not hermetically sealed, no previous inspection date. The displayed result is six months, governed by 14 kg of R1234yf (Annex II group 1); its limitations are preserved. It is an illustrative calculation, not a customer record. Reproduce with `node scripts/about-capture-blend.mjs` against local preview4184.

## Professional workflow emphasis

The primary message is now “Tieto käyttöön. Työ talteen.” / “Knowledge at hand. Work on record.” Reporting and saved sites/equipment lead the first walkthrough. The memory/learning message is retained alongside the data and calculator toolkit. The blend assessment screenshot uses the app’s actual dark theme; the install section mentions light, dark and system theme choices.

`report-desktop.webp` (1220 × 850), `report-mobile.webp` (390 × 760) and `equipment-mobile.webp` (390 × 850) use the same fictional Esimerkkikohde / Lämpöpumppu 1 record, R32 and 2 kg, dated 2026-10-04. The equipment view includes its linked completed service report. Reproduce with `node scripts/about-capture-workflow.mjs`.

The toolkit uses four equal text entries, followed by the log(p)–h screenshot as a separate centred example. This prevents one image from stretching a single grid row on desktop. Privacy copy distinguishes browser-local records from hosting request statistics.

## Final publication refinements

The hero uses `commissioning-desktop.webp`, a real print preview populated with clearly fictional commissioning data. The service-report and equipment images remain paired in the workflow section. Regenerate the hero alone with `node scripts/about-capture-workflow.mjs --commissioning-only`.

`cycle-desktop.webp` is now a 664 × 766 capture of the actual diagram section, including axes, controls, legend and model limitations, without desktop gutters or navigation. Regenerate using `node scripts/about-capture-cycle.mjs`.

The author heading spans both columns; portrait and body text start together below it. Licence links align to the right on desktop and below the text on mobile. MIT is also named in the development section. Principle icons are 40 px on desktop and 32 px on mobile. The beta action deliberately omits a version number that could become stale independently of the stable page.
