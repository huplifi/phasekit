# Symbol and release audit — 9 November 2026

## Starting state

PR #36 was open at `060e60394b997b2efa751e1800f633cbcfcdc9b9`, targeting beta `1b948123f442d97db1e8bfe5fabab3af6af38227`. It already added three contact symbols and the unpublished 0.5.0-beta.5 candidate. This work extends that PR; unrelated open PR #35 (operating assessment) is not included.

Netlify and the actual HTTP responses established these published versions before the change:

| Environment | Version/date | Published source | Ready deploy |
| --- | --- | --- | --- |
| Stable | 0.4.1 / 2026-10-04 | `d159ce53dc575bdcf9cd52ddd8dfe00c84c1aef2` | `6ac224f36a629500093d6115` |
| Beta | 0.5.0-beta.4 / 2026-10-06 | `1b948123f442d97db1e8bfe5fabab3af6af38227` | `6ac4e7ac0c56840008bf7945` |

`main` was `d6b140f`, a documentation-only follow-up with deploy skipping. Tag/release `v0.4.1` points correctly to `d159ce5`, the published stable source, not to that later documentation commit. No beta tags/releases existed. The root package supplies the displayed app version, while the bilingual release source supplies the date. Private workspace packages' 0.1.0 versions do not feed the UI.

The month-old version dates were real: newer work remained unmerged and unpublished. PR #36 also deliberately suppressed Deploy Previews with its title marker. Rewriting a date would have misrepresented publication.

There was a second browser-specific effect: the existing beta browser profile initially rendered 0.2.0-beta.2 / `add9b07` from its controlling service worker. The network document already matched the published beta deploy (`index-D90ueAYe.js`); the profile loaded the older `index-CekoT07p.js`. A newer worker was installed and waiting. The app's update prompt appeared and accepting it moved the browser to 0.5.0-beta.4 without clearing storage. Stable displayed 0.4.1 / `d159ce5`. This is explicit, user-accepted PWA activation, not evidence of an outdated CDN deploy. Root HTTP responses required revalidation (`max-age=0,must-revalidate`).

## Source and implementation

All 83 standalone SVG files match Git blob hashes at `427eb4c6be359445c53d0635245c905d380aecf4`. The source main was `3d7373067b50156984530d00eb20c0b4ea175cb3`; comparison showed no intervening `symbolit/` changes. All retained symbol fields match the canonical manifest. Existing IDs remain unchanged. Only bibliographic source metadata is copied; private file paths and classroom-photo hashes are omitted.

The three contact additions are retained from PR #36. The three added equipment markings are 5222 (safety isolating transformer), 5221 (isolating transformer) and 5172 (Class II, double or reinforced insulation). Equipment markings use `laitemerkinta`, with no ports. Whole exercise diagrams are excluded. Search includes names, aliases, descriptions and source labels, including the IEC numbers. The existing Finnish/English presentation conventions are preserved.

The unpublished candidate remains 0.5.0-beta.5 with expanded bilingual notes. Root package version, full Netlify commit and symbol-source revision are emitted in `build-info.json` by the application build. Settings shows their distinct meanings. The existing CI now requires a newer app version for shipped changes, preserves earlier release notes, checks the generated changelog and rejects a conflicting existing release tag. No new publishing infrastructure or automatic stable promotion is introduced.

## Verification and publication

Local verification: lint and TypeScript passed; 10 focused unit tests passed; production build passed; symbol/release browser checks passed 18 cases with the two documented WebKit offline-reload skips. Chromium exercised offline reload; both engines checked all 83 cached SVGs. The first browser attempt was blocked by sandbox port binding, and the next exposed a missing JSON import attribute in the new test; both were resolved before the passing run. Full CI and deployment evidence will be recorded after the final candidate's checks and actual publication. A successful local build or commit alone does not establish a release. Stable publication remains a separate owner decision.
