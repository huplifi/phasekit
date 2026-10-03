# App icons

The v3 install artwork restores the original three-wave geometry from
`apps/web/public/phasekit-logo.svg`. Beta and stable artwork share exactly the
same wave paths, snowflake/wrench geometry, scale and placement. Beta adds only
its larger BETA badge, using outlined Ioskeley Mono ExtraBold glyphs from the
bundled application font. The shared logo is centred at (1000, 1000) on the
2000 px canvas; the badge overlays its lower portion without shifting it. There are no baked reflections, shadows or rounded
outer corners: the operating system applies its own mask.

The palette separates the dark blue mark (#245873), muted blue waves (#B8DCE8)
and ice background (#EAF7FA). The navy badge (#102F40) has near-white lettering
(#FAFEFF). The opaque base and luminance hierarchy retain readable separation
in a greyscale preview, rather than relying only on hue differences.

Editable sources: `design/icons/app-icon.svg` and `app-icon-beta.svg`.
Regenerate the committed PNGs with Sharp 0.35.x:

```sh
node scripts/app-icons.mjs /absolute/path/to/node_modules/sharp
```

Versioned v3 filenames distinguish the new artwork from cached install metadata.
Old assets remain available for existing metadata. Beta and stable builds select
their own manifest and Apple touch icons. Preparing stable artwork in the beta
branch does not publish it to phasekit.app; stable remains on its original icon
until a separately authorised stable release.

## Platform limits and verification

PhaseKit currently ships as a web app. WebKit documents manifest icons and gives
`apple-touch-icon` precedence; it does not document a PWA mechanism for supplying
separate native dark/tinted/clear icon layers. These assets are therefore a single
high-contrast base for the OS treatment, not a claim of native adaptive-icon
support. See [WebKit's Home Screen web app support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
and [native Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer).

Browser checks cover channel identity, icon delivery, dimensions and offline app
loading. Colour and greyscale previews check artwork readability. Actual iPhone
Light, Dark, Clear and Tinted rendering still requires physical-device testing.
iOS may retain the previous Home Screen bitmap after a web app update; do not clear
website data to refresh it, because reports are stored in the browser.

The `/tools` catalogue regression checks every leading tool SVG for unique
geometry. Navigation icons, chevrons and inline unit arrows are not tool identities.
