# Deployment

## Current target: GitHub and Netlify

As of 26 September 2026, the development repository is [huplifi/phasekit](https://github.com/huplifi/phasekit) and the intended public domain is `phasekit.app`. GitHub and Netlify replace the previous ChatGPT Sites workflow. The [previous deployment history](SITES-HISTORY.md) is retained as evidence, not as the current release procedure.

`netlify.toml` runs `pnpm build` at the repository root and publishes `apps/web/dist`. `.nvmrc` and the build environment pin Node.js 24; `package.json` pins pnpm 11.19.0. Installation uses the committed lockfile. The production build validates and generates the local dataset, generates tokens, checks TypeScript and builds the PWA. No runtime secrets are required.

The configuration follows Netlify's [Vite guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/) and [dependency management documentation](https://docs.netlify.com/build/configure-builds/manage-dependencies/).

## First deployment

1. Import the GitHub repository into Netlify, using `main` as the production branch.
2. Use the repository root as the base directory. Keep the command and publish path defined in `netlify.toml`.
3. Confirm a successful deploy at the Netlify preview address.
4. Add `phasekit.app` in the project's custom-domain settings and apply the DNS records Netlify supplies. Confirm HTTPS before installing the PWA.
5. Verify the main routes, calculator results, fonts and offline reload at the new origin.

The repository setup does not prove that Netlify is connected, DNS is configured or the domain is live. These remain separate hosting steps until confirmed by deployment and DNS evidence.

## Subsequent updates

Commit changes, run the relevant checks, and push to GitHub. Once Git integration is connected, Netlify can build updates from `main`. Keep development documentation in English; Finnish interface strings and source-attributed multilingual data remain supported.

The service worker prompts before activating an update. The headers for `sw.js` and `index.html` require revalidation so the browser can discover newer builds. Assets use content hashes. Do not delete user storage to perform an update.

## Moving existing local data

Export a JSON backup in Settings on the old site, then import it in Settings at the new origin. Origin-scoped IndexedDB does not transfer automatically, including favourites and saved calculations. Existing saved snapshots retain their original source and rule versions.

## Transition record

The mobile-form refinement build passed local verification and was prepared in the previous Sites source mirror at commit `6d47a98b261bdf47ef2ac9a4aa3fb07f9349a415`. It was not saved or deployed through Sites because the user selected GitHub/Netlify before publication. The last confirmed live Sites deployment remains version 5. Current GitHub source includes those mobile refinements.
