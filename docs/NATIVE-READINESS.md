# Native readiness

## Current state

PhaseKit is a React, TypeScript and Vite web app with a production PWA build. Capacitor is only partially prepared:

- [`capacitor.config.ts`](../capacitor.config.ts) sets app ID `fi.phasekit.app`, display name `PhaseKit`, and web output directory `apps/web/dist`.
- The repository has `@capacitor/core` and `@capacitor/cli` at `^8.5.2` in `package.json`.
- The Android and iOS platform packages are not declared. There are no generated `android/` or `ios/` projects, and the package scripts do not define native build, run, or sync commands.
- No native plugins, platform permissions, deep links, signing configuration, store metadata, or release artifacts are configured here.

The supported, documented product today is the browser/PWA. The web app includes local IndexedDB data, offline web assets, Finnish and English UI, saved records, and JSON backup and restore. Browser/PWA behavior does not establish equivalent native WebView storage, offline startup, print/export, link handling, or lifecycle behavior. Native support remains future work in [M5 of the roadmap](ROADMAP.md) and its boundaries are also listed in [release gates](RELEASE-GATES.md).

## Prerequisites

The repository pins Node.js 24 in `.nvmrc` and pnpm 11.19.0 in `package.json`. The Capacitor packages are version 8. Capacitor's current v8 environment guide lists Node.js 22 or later, Xcode 26.0 or later plus Xcode Command Line Tools for iOS, and Android Studio 2025.2.1 or later with Android SDK Tools and an API 24 or later platform for Android. The repository's Node and pnpm versions are the project-specific choices; platform tool requirements come from the [Capacitor v8 environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

An iOS build requires macOS with Xcode. Capacitor 8 defaults to Swift Package Manager for iOS; CocoaPods is optional unless a dependency requires it. Android Studio provides the JDK required by Capacitor's Android workflow. Verify the installed versions against the Capacitor guide before starting platform work.

## Setup commands when native work is authorised

These commands describe the next setup sequence; they have not been run as part of this readiness review. Adding platform packages changes the manifest and lockfile, and `cap add` generates platform projects.

First install the repository dependencies and produce the configured web bundle:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

The current build script runs refrigerant-data generation, token generation, TypeScript checking, and Vite production build. Confirm that `apps/web/dist/index.html` exists before Capacitor sync.

Add the Capacitor 8 platform packages, then generate the native projects:

```sh
pnpm add @capacitor/android@^8.5.2 @capacitor/ios@^8.5.2
pnpm exec cap add android
pnpm exec cap add ios
```

After each web build, copy the current bundle and update native dependencies with:

```sh
pnpm build
pnpm exec cap sync
```

Open the generated projects in their native IDEs with `pnpm exec cap open android` or `pnpm exec cap open ios`. Capacitor's [installation guide](https://capacitorjs.com/docs/getting-started) documents adding platform packages, generating projects, and syncing the configured `webDir`. These are setup instructions only; no native project generation, build, or installation has been verified for this repository.

## Unverified device and store gates

There is no evidence in this repository that a native Android or iOS package has been built or installed. The following remain release gates:

- Generate and build Android and iOS projects with the pinned Capacitor major version; resolve platform-specific build issues and record toolchain versions.
- Install on physical Android and iOS devices. Test first launch, app restart, force-close, update from an earlier app version, and flight-mode cold start.
- Confirm IndexedDB records and settings survive app restarts and app updates on each platform. Test data export/import, JSON download behavior, printing, external source links, hash-based routes, keyboard behavior, orientation, and OS back/navigation behavior.
- Complete VoiceOver and TalkBack checks, platform text scaling, focus behavior, and touch usability. Automated web accessibility checks do not replace these device checks.
- Review privacy disclosures, app icons and store assets, target SDK and permission needs, signing identities, provisioning, and store listing requirements. Configure deep links and a crash-feedback path only when product requirements and privacy decisions are settled.
- Complete the qualified engineering and regulatory review recorded in [release gates](RELEASE-GATES.md). A native wrapper would not convert model estimates or rule assessments into certified instrument results.

Until those checks have evidence, describe PhaseKit as a web/PWA application with Capacitor configuration present, not as an installable or store-ready native app. No signing, app-store submission, or store release is claimed.
