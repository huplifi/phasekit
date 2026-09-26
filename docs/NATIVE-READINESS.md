# Native readiness

## Current implementation

The beta branch now includes generated Capacitor 8.5.2 projects in `ios/` and `android/`, alongside matching core/CLI/platform dependencies. Both `cap add ios` and `cap add android` completed on 26 September 2026. The iOS project uses Swift Package Manager. Generated web assets and local platform build/configuration files are ignored by Git; Android signing stores are ignored as well.

The app identity remains `fi.phasekit.app`, display name PhaseKit, and web directory `apps/web/dist`. This is native project preparation, not a verified native application or store release. The current supported runtime remains the browser/PWA.

## Repeatable workflow

Use the pinned Node 24 and pnpm 11.19.0 toolchain, then:

```sh
pnpm install --frozen-lockfile
pnpm native:sync
pnpm native:ios
# or
pnpm native:android
```

`native:sync` rebuilds the web app before copying it into both native projects. Do not commit generated web bundles. Open the appropriate IDE to select a simulator/device and build. The projects currently use the standard generated native assets; app icons and launch assets must be finished before distribution.

References: [Capacitor installation](https://capacitorjs.com/docs/getting-started), [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [development workflow](https://capacitorjs.com/docs/basics/workflow).

## Observed toolchain blockers

On the current host, `xcodebuild -version` reports Command Line Tools selected without full Xcode, `java -version` reports no Java runtime, and no Android SDK was found at the standard user location. Project generation succeeds without demonstrating compilation. Install/select the official supported Xcode and Android Studio/JDK/SDK toolchains before claiming a build.

## Required before native distribution

- Build both projects and resolve platform-specific compilation issues; record exact toolchain versions.
- Test physical-device first launch, force-close/restart, update and offline cold launch.
- Verify WebView IndexedDB persistence, backup/import, print/PDF/image export, external links, keyboard, orientation and OS back behaviour. Browser success does not establish native success.
- Test VoiceOver/TalkBack, text scaling and touch accessibility.
- Finish app icons/launch assets, privacy/store descriptions and signing/provisioning. No credentials or signing stores belong in Git.
- Complete qualified review and user pilots from [release gates](RELEASE-GATES.md).

No native binary, device installation, signing or store submission has been verified or performed.
