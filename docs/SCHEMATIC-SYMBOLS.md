# Schematic symbol reference (beta)

`#/symbols` is a visual reference, split into Refrigeration and Electrical tabs. Search matches Finnish/English names, Finnish aliases and descriptions only within the selected discipline. The electrical tab also filters by category. A symbol opens its meaning, representation type, caveats and source references. The reference does not certify a design or claim the library is an official standard.

## Source and updates

The canonical SVG library lives in `huplifi/kylmasentaja-keuda`, `symbolit/`. The initial import came from revision `8dcd1803052ad4e7db189d4ecea7200c2190ff85` on 28 September 2026. The current import is pinned in `source_revision`. The related public study site is https://huplifi.github.io/kylmasentaja-keuda-public/.

PhaseKit bundles 80 individual SVGs (18 refrigeration, 62 electrical) and a selected copy of manifest metadata in `apps/web/src/symbol-data.json`. The app includes standalone SVGs and bibliographic metadata. Assets are offline-precacheable and use CSS masks to inherit accessible theme colours.

For updates, review the canonical manifest and copy only its explicitly named standalone SVGs. Preserve `purpose`, aliases, representation, notes, source page references and status. Strip private file paths and classroom photo hashes from `source_documents` and update `source_revision`. Run library integrity and browser tests. Do not infer official IEC identifiers from PDF page numbers or promote `tarkistettava`/`sovellettu` records to verified. English symbol names are supplied by the source; descriptions and review notes are identified as Finnish in English UI.

Some schematic shapes are intentionally shared (e.g. condenser/evaporator). Their meanings depend on diagram context. This is separate from the app's requirement for a unique identity icon for each tool.

The IEC comparison compilation's publisher, date and status have not been established. GUNT and Danfoss references describe manufacturer conventions. The centre-off, early-make and late-break variants are redrawings from a classroom slide. Early make and late break refer to the sequence within the same contact unit. The slide specifies no time interval.

## Verification

The import audit compared the SVGs and retained manifest fields with the canonical library. Unit checks cover category/search boundaries, source/caveat integrity and self-contained SVGs. Browser checks cover both tabs, category/search, dialog closure and focus return, accessibility and 320 px dark layout in Chromium and WebKit. All 80 assets are checked in the service worker precache. Actual offline reload is tested in Chromium; Playwright WebKit's offline network emulation fails even with a controlling worker, so its offline reload remains a physical-device check.
