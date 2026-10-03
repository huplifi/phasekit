# Stable 0.4.0 and the 0.5 beta series

The owner explicitly approved promoting beta.8 to a stable release and opening a new beta series on 3 October 2026.

## Published revisions

- Previous stable reference: 0.2.1 / `97c78ec` at https://phasekit.app.
- Stable: 0.4.0 / `b3d356e`, published at https://phasekit.app via PR #29.
- GitHub release: https://github.com/huplifi/phasekit/releases/tag/v0.4.0, targeting `b3d356e98c89bb013c67e3f1048d688aefdca540`; published, not draft or prerelease.
- New beta: 0.5.0-beta.1 / `38f2801`, published at https://beta.phasekit.app via PR #30. Only the package version and bilingual release history differ from stable.

Both public bundles and fresh mobile-WebKit settings pages confirmed their version and revision. Stable has no beta notice and uses the PhaseKit manifest; beta has its notice and PhaseKit Beta manifest. Both report screens expose Laitteet ja kohteet.

## Verification and corrections

Final stable candidate `c6871aa` passed GitHub run 37149807426: dependency installation, data validation/build, lint, TypeScript, 446 unit tests, production build, and 462 browser tests. Two existing WebKit offline-reload cases are explicitly skipped; no new skips were introduced. The merged stable tree matches that candidate exactly.

Release testing found stale assertions for the beta-only notice, English release-history heading, unavailable oil copy, and charge shown in the old expanded report list. Tests now follow the real channel and dedicated detail view, retaining frozen-result and offline persistence checks.

It also found a real Chromium issue: route rendering could unmount the saved-calculation notes guard before confirmation. A synchronous cancellable navigation event now runs before routing. Back, Forward and direct-hash cancellation retain unsaved notes; accepted navigation still works. Focused checks passed on all four browser projects before the final full run.

Earlier candidate runs 37148158543 and 37148374947 were cancelled while demonstrated failures were corrected. Run 37148588901 completed with 456 passed, six failures across the three affected cases and two existing skips; the final run above supersedes it. Redundant main/beta runs 37150838340, 37150856674 and 37150906174 were cancelled after full application verification and focused beta metadata/channel checks. Deploy Preview builds were suppressed using PR titles.

Beta metadata tests passed; its production build and mobile Chromium/WebKit history checks passed (three passed, one existing WebKit offline skip). No second full functional matrix was required for the version-only beta opening.

## Storage and remaining boundaries

Existing browser data remains at its origin; beta records do not automatically transfer to stable. Use Settings backup export/import for an intentional transfer. Do not clear site data or reinstall to update. Older 0.2.1 code cannot safely preserve all newer records, so corrective releases must retain the 0.4 storage model.

The owner confirmed the installed app update works. That confirmation is not separately recorded as an AirPrint test. Existing physical-device, independent regulatory-review and field-pilot limitations remain as documented; this web release does not claim certification or app-store publication.
