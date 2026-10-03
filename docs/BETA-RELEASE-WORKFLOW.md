# Beta and stable release workflow

## Environments

| Environment    | Git branch               | Netlify project               | Public URL                |
| -------------- | ------------------------ | ----------------------------- | ------------------------- |
| Stable         | `main`                   | `phasekit`                    | https://phasekit.app      |
| Public beta    | `beta`                   | `phasekit-beta`               | https://beta.phasekit.app |
| Feature review | Pull request into `beta` | Beta project's Deploy Preview | URL returned on the PR    |

The beta project was created on 26 September 2026 from the same GitHub repository. Its deploy branch is `beta`, base directory `.`, build command `pnpm build`, and publish directory `apps/web/dist`. The existing stable project still deploys `main`. Beta has its own hosting lifecycle; it must never be configured as an alias of the stable project.

Netlify calls the selected deploy branch of each project its production branch. In the `phasekit-beta` project this means **beta**, not the stable app.

## Namecheap DNS handoff

Netlify has accepted `beta.phasekit.app` as the beta project's primary domain. The owner added this Namecheap record on 26 September 2026; the CNAME was subsequently verified through local DNS, Cloudflare and Google public resolvers:

| Type         | Host   | Value                       | TTL       |
| ------------ | ------ | --------------------------- | --------- |
| CNAME Record | `beta` | `phasekit-beta.netlify.app` | Automatic |

For future reference, in Namecheap open Domain List → Manage next to phasekit.app → Advanced DNS → Host Records → Add New Record. Add the record above and save. If a record already exists for the exact `beta` host, reconcile that record instead of creating conflicting entries. Leave the apex `@`, `www`, mail records and name servers unchanged.

Once the CNAME resolves, use [the beta domain panel](https://app.netlify.com/projects/phasekit-beta/domain-management) to verify DNS and monitor automatic HTTPS provisioning. Do not call the custom domain ready until HTTPS succeeds and the correct beta commit is visible. DNS propagation and HTTPS 200 were verified on 26 September 2026. The fallback remains https://phasekit-beta.netlify.app.

## Development and release

1. Create a feature branch from the current `beta`; submit a PR targeting `beta`.
2. Update the root `package.json` version and add matching Finnish and English notes at the top of `data/releases.json`. Record the version date, channel and user-visible changes; run `pnpm release:build` and commit the generated `CHANGELOG.md`. The bundled Settings → Release history view uses those same entries. The build rejects missing translations, duplicate versions, invalid dates and channel/version mismatches. Update README and run `pnpm data:coverage` when data coverage changes.
3. Match verification to the change. For a small UI correction, run the affected checks and at most the browser paths needed to verify the behaviour; do not routinely run the full suite locally and again in CI. Use one full CI run for the final release candidate, and repeat only when a new change or failure warrants it. `pnpm verify` remains an optional full local diagnostic command, not a mandatory step for every edit. Inspect the existing Deploy Preview and check local-data/update behaviour when affected. Add regression tests for consequential behaviour or a demonstrated bug, not for reversible cosmetic edits.
4. Merge reviewed work into `beta`. That updates the public beta automatically. The stable site does not change.
5. For release, open a PR from `beta` into `main`, review the aggregate changes and source/model versions, and obtain the owner's explicit stable-release decision.
6. Set the root `package.json` version to the intended stable version (remove the prerelease suffix), add its matching stable history entry, verify the channel in Settings and rerun checks. The root version is the single source for the displayed application version; the build revision comes from Netlify `COMMIT_REF`. Merge only after checks pass. The existing stable Netlify project deploys `main` automatically.
7. Record the stable Git commit/deploy URL. Verify the actual stable site and retain the previous published deploy as a reference. Before any rollback, confirm storage compatibility: 0.1.0 drops report/equipment collections; 0.2.1 drops newer sites/device details on writes and cannot parse saved heat-quantity records. After 0.4.0 records exist, prefer a corrective release retaining the 0.4.0 storage model rather than rolling back to an older schema.

Do not force-push shared branches, auto-merge beta into main, or use a production deployment command on the stable project for testing. GitHub branch protection can additionally enforce the `verify` check, but no protection rule is claimed configured by this document.

CI currently runs once per pull request update and on pushes to `beta` and `main`. Avoid pushing each small edit separately. A redundant post-merge branch run can be cancelled after verifying the merged tree exactly matches the already green PR candidate; a changed tree requires its own relevant verification. Feature-branch pushes do not start a duplicate run. New commits cancel superseded runs on the same PR or branch. A retry that passes is still a flaky result to investigate; do not add blind sleeps, widen assertions or increase retries to hide failures. Retained traces and screenshots distinguish input/focus failures from calculation errors.

## Build cost and proportionate checks

The owner requested minimal testing and avoidance of unnecessary Netlify builds on 2 October 2026. Batch corrections locally; run only checks justified by the change. Do not add heavy testing infrastructure for small UI work.

While a PR is under correction, put `[skip netlify]` in its **title** to suppress Deploy Previews while GitHub verification runs. For branch pushes, put `[skip netlify]` in the commit message. Use this Netlify-specific marker for testable changes; `[skip ci]` would suppress GitHub checks as well. After the candidate passes, remove the title marker and request one deliberate preview build (Netlify documents removing the marker followed by a new commit). Verify the actual revision. Reuse a completed preview instead of rebuilding it without a code change. Merge to the beta deployment branch only after the candidate has passed; stable still requires separate authorisation.

Documentation-only evidence commits may use `[skip ci] [skip netlify]`; this exception does not apply to code, data, dependencies or build configuration. GitHub test failures and Netlify build failures are distinct: a failed GitHub run can still have caused a completed, chargeable Netlify preview.

Reference: [Netlify deploy skipping](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy).

## Local records and updates

IndexedDB belongs to the origin. Preview, beta and stable URLs have separate records and service workers. Export a JSON backup from the old origin and import it on the intended new origin when moving test data. There is no background cloud sync. Retain saved model/source versions and do not overwrite snapshots when the current dataset changes.

Beta displays its channel and short build revision. Verify update prompts with an unsaved calculation and stored records before promotion. A green automated run does not replace regulatory review, physical-device checks or user pilots.

References: [Netlify external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/), [Netlify Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/).
