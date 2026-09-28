# Schematic symbol reference (beta)

`#/symbols` is a visual reference, split into Refrigeration and Electrical tabs. Search matches Finnish/English names, Finnish aliases and descriptions only within the selected discipline. The electrical tab also filters by category. A symbol opens its meaning, representation type, caveats and source references. The reference does not certify a design or claim the library is an official standard.

## Source and updates

The owner's hand-drawn SVG library remains canonical in `huplifi/kylmasentaja-keuda`, `symbolit/`, at revision `8dcd1803052ad4e7db189d4ecea7200c2190ff85`. Imported with the owner's explicit request for a PhaseKit beta tool on 28 September 2026. The related public study site is https://huplifi.github.io/kylmasentaja-keuda-public/.

PhaseKit bundles 77 individual SVGs (18 refrigeration, 59 electrical) and a selected copy of manifest metadata in `apps/web/src/symbol-data.json`. No source PDFs, private attachment paths, notes repository history or generated source catalogues are included. The SVG geometry is unchanged. Assets are offline-precacheable and use CSS masks to inherit accessible theme colours.

For updates, review the canonical manifest and copy only its explicitly named standalone SVGs. Preserve `purpose`, aliases, representation, notes, source page references and status. Remove private `source_documents.file` fields; update `source_revision`. Run library integrity and browser tests. Do not infer official IEC identifiers from PDF page numbers or promote `tarkistettava`/`sovellettu` records to verified. English symbol names are supplied by the source; descriptions and review notes are identified as Finnish in English UI.

Some schematic shapes are intentionally shared (e.g. condenser/evaporator). Their meanings depend on diagram context. This is separate from the app's requirement for a unique identity icon for each tool.

The IEC comparison compilation's publisher/date/status have not been established. GUNT and Danfoss references describe manufacturer conventions. These source documents are references, not redistributed assets or claims of certification.

## Verification

The import audit compared every SVG byte and retained manifest field with the pinned canonical revision. Unit checks cover category/search boundaries, source/caveat integrity and self-contained SVGs. Browser checks cover both tabs, category/search, dialog closure and focus return, accessibility and 320 px dark layout in Chromium and WebKit. All 77 assets are checked in the service worker precache. Actual offline reload is tested in Chromium; Playwright WebKit's offline network emulation fails even with a controlling worker, so its offline reload remains a physical-device check.
