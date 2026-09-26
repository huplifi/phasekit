# Release history — 0.2.0-beta.2

The app's Settings → Release history page and the GitHub `CHANGELOG.md` use the same bilingual `data/releases.json`. Entries record the version, date, channel and user-visible changes. Build revision and dataset review date remain separate, so a redeploy is not presented as a new data review.

The history includes the recorded 0.1.0 stable baseline, the accumulated 0.2.0-beta.1 changes and this release. It does not invent a chronology for earlier updates made under the same version number. README and coverage reports were reconciled with the beta; coverage now includes the 113 bundled P–h models, counted against actual dataset records.

## Verification

- TypeScript, ESLint, production build, 214 unit tests and `git diff --check` passed locally.
- 20 existing beta UX regressions passed in desktop/mobile Chromium and WebKit.
- Release-history navigation, Finnish/English notes and narrow layout passed in all four browser projects. Mobile rendering was visually inspected.
- Offline reload passed in desktop/mobile Chromium. Playwright WebKit returned an internal navigation error when its context was switched offline; those two reload cases are explicitly skipped. This is not a claim of physical Safari/iPhone offline verification.
- The release is intended for the separate public beta only. The stable app remains 0.1.0. See the beta PR checks and Netlify deployment for publication evidence.

For future releases, follow [the release workflow](BETA-RELEASE-WORKFLOW.md); do not edit the generated changelog independently.
