# Beta and stable release workflow

## Environments

| Environment | Git branch | Netlify project | Public URL |
| --- | --- | --- | --- |
| Stable | `main` | `phasekit` | https://phasekit.app |
| Public beta | `beta` | `phasekit-beta` | https://beta.phasekit.app |
| Feature review | Pull request into `beta` | Beta project's Deploy Preview | URL returned on the PR |

The beta project was created on 26 September 2026 from the same GitHub repository. Its deploy branch is `beta`, base directory `.`, build command `pnpm build`, and publish directory `apps/web/dist`. The existing stable project still deploys `main`. Beta has its own hosting lifecycle; it must never be configured as an alias of the stable project.

Netlify calls the selected deploy branch of each project its production branch. In the `phasekit-beta` project this means **beta**, not the stable app.

## Namecheap DNS handoff

Netlify has accepted `beta.phasekit.app` as the beta project's primary domain. The owner added this Namecheap record on 26 September 2026; the CNAME was subsequently verified through local DNS, Cloudflare and Google public resolvers:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| CNAME Record | `beta` | `phasekit-beta.netlify.app` | Automatic |

For future reference, in Namecheap open Domain List → Manage next to phasekit.app → Advanced DNS → Host Records → Add New Record. Add the record above and save. If a record already exists for the exact `beta` host, reconcile that record instead of creating conflicting entries. Leave the apex `@`, `www`, mail records and name servers unchanged.

Once the CNAME resolves, use [the beta domain panel](https://app.netlify.com/projects/phasekit-beta/domain-management) to verify DNS and monitor automatic HTTPS provisioning. Do not call the custom domain ready until HTTPS succeeds and the correct beta commit is visible. DNS propagation and HTTPS 200 were verified on 26 September 2026. The fallback remains https://phasekit-beta.netlify.app.

## Development and release

1. Create a feature branch from the current `beta`; submit a PR targeting `beta`.
2. Run the repository checks and inspect the PR's isolated Deploy Preview on desktop and phone. Check local-data behaviour as well as calculations.
3. Merge reviewed work into `beta`. That updates the public beta automatically. The stable site does not change.
4. For release, open a PR from `beta` into `main`, review the aggregate changes and source/model versions, and obtain the owner's explicit stable-release decision.
5. Merge only after checks pass. The existing stable Netlify project deploys `main` automatically.
6. Record the stable Git commit/deploy URL. Verify the actual stable site and retain the previous published deploy as the rollback target.

Do not force-push shared branches, auto-merge beta into main, or use a production deployment command on the stable project for testing. GitHub branch protection can additionally enforce the `verify` check, but no protection rule is claimed configured by this document.

## Local records and updates

IndexedDB belongs to the origin. Preview, beta and stable URLs have separate records and service workers. Export a JSON backup from the old origin and import it on the intended new origin when moving test data. There is no background cloud sync. Retain saved model/source versions and do not overwrite snapshots when the current dataset changes.

Beta displays its channel and short build revision. Verify update prompts with an unsaved calculation and stored records before promotion. A green automated run does not replace regulatory review, physical-device checks or user pilots.

References: [Netlify external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/), [Netlify Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/).
