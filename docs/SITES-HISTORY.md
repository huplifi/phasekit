# Previous ChatGPT Sites deployment history

Confirmed 2026-09-25 17:17:54 UTC (20:17 Helsinki).

- URL: https://phasekit-hupli.huplifi.chatgpt.site
- Access: public (explicitly requested by the user)
- Project: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685`
- Saved version: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685~appgver_2c26dff971748191a8cd6b39e8c3dd48` (version 1)
- Deployment: `appgdep_6ab6acafde2481919763e41a2b5e39f6`
- Deployment result: `succeeded`
- Pushed source commit: `584107c44a71e94b8c64cc4bce841dca5228dd2b`
- Source checkout: `sites-release/`
- Archive SHA-256: `07937e2ad21e95572fc997fe7dae72e2ecfa89c47d3d2cca5813e96224461cf5`

The Sites workflow rebuilt the static artifact from the pushed source. Its JS/CSS asset hashes match the locally tested build. The latest PH chart refinement passed all 6 targeted mobile/desktop browser checks, lint and the build/typecheck. Earlier complete checks are recorded in VERIFICATION.md. Production success is established by the Sites deployment response; no separate production-browser audit was performed.

The release mirror uses the existing validated workspace dependencies for local building. pnpm's dependency auto-install was disabled for that build with `pnpm_config_verify_deps_before_run=warn`, because the mirror shares the root node_modules through an ignored symlink. The symlink and generated build output are not committed as source. This deployment record was written after publication and is not part of the deployed commit.

This describes the previous Sites workflow. As of 26 September 2026, further development uses GitHub and Netlify instead. Localhost and each hosted origin have separate browser storage; favourites and saved calculations do not transfer automatically.

## Version 2: PH boundary diagnostics

Published successfully 2026-09-25 17:29:34 UTC. Same public URL and audience.

- Source commit: `1d0cbe51288c2a487cecb56d2ea860116cf18b2b`
- Version: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685~appgver_5b4c21b7d7d08191a8baf251426d3da9`
- Deployment: `appgdep_6ab6af6db0948191a416290341c5a1bd`
- Archive SHA-256: `4e0d1f64c65b94b8874b781474a0a8d03a4cb2baea9d909a836297ba0395edfa`
- Checks: 8 PH unit tests, 6 PH browser tests, lint and build/typecheck passed.

Adds point-specific phase-boundary diagnostics without changing calculation limits or thermodynamic data. The user's exact pressures and reference selection remain unconfirmed.

## Version 3: signed mobile input

Published successfully 2026-09-25 17:34:32 UTC, preserving the public audience and URL.

- Source: `29715b920fd016dc09a61599968ad37bf5630e5c`
- Version: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685~appgver_a7fe37d1c66081919936c55772bc190e`
- Deployment: `appgdep_6ab6b0984e6c81918e582afae204a529`
- Archive SHA-256: `db5e14edd2aec9818ee77b45717a1b1c0f9b4755991ecff59fa3bf8a465fa51a`

Temperature and gauge-pressure fields now request the standard keyboard to expose minus entry on phones. Local build/typecheck and lint passed; all 28 selected browser cases passed across the initial run and corrected locale-assertion rerun. No physical iPhone keyboard test was performed.

## Version 4: combined SH/SC measurements

Published successfully 2026-09-25 18:16:34 UTC, same public URL and audience.

- Source: `de6741590ec5c0d1ca0f16abc971c02b06a69d6c`
- Version: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685~appgver_6f1fbd35b6a48191b1ffcba6059644bf`
- Deployment: `appgdep_6ab6ba709c3c8191a966e9dffefdd5fb`
- Archive SHA-256: `3227de3f503486d6ba3eab84e8630b4c2ff826c66b39d698acb1bbad4fff4bd5`

LP/HP and suction/liquid measurements now yield both SH and SC together; hot gas is an optional measurement. Mode selection removed. Build/typecheck, lint and 24 browser checks passed; two paired-calculator checks reran successfully after the final compact unit-control styling.

## Version 5: unified refrigeration cycle

Published successfully 2026-09-25 18:57:51 UTC, preserving the public URL and audience.

- Source: `3b366a83150879f0f81c4a33ecf39d44cc99d725`
- Version: `appgprj_6ab6aa7f568481919b7c0bb24a5bd685~appgver_65b38b01fad881919ef282466385a8f5`
- Deployment: `appgdep_6ab6c41e1e848191b331225b968d5c0b`
- Archive SHA-256: `b9a31670c0ec73047d3e47d99966bac65267e80f114be9ae67e9077823102edb`

One refrigeration-cycle tool handles SH/SC and log(p)–h using shared inputs. Old routes remain aliases. Valid signed temperature differences remain visible even when the chart cannot render a full cycle. The supplied R134a paper example plots in mobile and desktop regression tests. Gauge readings are converted to absolute pressures internally before property lookup and diagram placement; reference atmosphere is editable, default 1.01325 bar. See VERIFICATION.md for 34 distinct browser checks and retained PH-domain limits.
