# Installed-app PDF export and compact equipment actions

The owner reported that the iPhone Home Screen app opens the report preview but its native print button does nothing. This change gives that preview a direct local PDF export using the operating-system file share sheet where available and a downloadable PDF otherwise. It does not depend on `window.print()` or the editor remaining alive. In iOS standalone mode the ineffective native-print action is hidden; browser previews retain Print.

The existing generated print document remains the content source. PDF text is selectable, with A4 pagination, source references, check states, signature blanks, tables and chart images. Poppins text uses the existing Ioskeley family as a technical-glyph fallback. Missing glyphs/resources produce an explicit error instead of silent content loss. PDF generation finishes before the sharing tap, preserving Web Share user activation. Cancelling sharing leaves the preview intact; rejected sharing exposes the download link. No report content is sent to a service.

A WebKit offline read failure was isolated to FileReader reading a cached font Blob. Font loading now reads precached bytes directly and embeds them. jsPDF and font assets ship locally; library/font notices are retained. This adds roughly 0.44 MB of uncompressed JS and a 1.3 MB precached TTF, with no server PDF service or HTML screenshot dependency.

The Reports destination is named Laitteet ja kohteet. The two creation actions fill the available row equally. Menu summaries override inherited icon margins/padding; 44 px targets remain.

## Verification

- TypeScript, scoped ESLint, production build and 15 relevant unit tests passed.
- Eight mobile-WebKit print/PDF flows passed (including real cycle-chart and comparison reports): online/offline controls, return navigation, opener replacement, actual PDF download with simulated file sharing, and technical Unicode/table/chart/long-content generation.
- Independent pypdf parsing found expected Finnish text, CO₂e, Greek symbols, table values and the final line across a four-page PDF; chart image resources are present. A rendered basic PDF was visually inspected.
- Dark 390 px equipment view: creation buttons measured 167 px each; menu icon centre differed by 0 px horizontally/vertically. Screenshot inspected.
- Physical iPhone share-sheet/AirPrint behaviour remains for the owner's device test. Browser emulation and a simulated share call do not establish that OS-level UI result.

This batch follows the owner's scoped-test and single-beta-build preference; no full browser matrix or paid Deploy Preview is requested. Exact live release evidence is appended after publication.
