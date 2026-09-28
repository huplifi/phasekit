# App icons

The install icon uses the original snowflake/wrench geometry on an opaque navy
background (#102F40), with an ice foreground (#D6F4FC). There are no decorative
waves, baked reflections, shadows or rounded outer corners. iOS supplies its own
mask and appearance treatment. The beta badge uses outlined lettering, so exports
do not depend on installed fonts. Its contrast survives a greyscale conversion.

Editable sources: `design/icons/app-icon.svg` and `app-icon-beta.svg`.
Regenerate the committed PNGs with Sharp 0.35.x:

```sh
node scripts/app-icons.mjs /absolute/path/to/node_modules/sharp
```

The v2 filenames distinguish the new artwork from cached install metadata. Old
assets remain available for existing metadata. Beta and stable builds select
their own manifest and Apple touch icons. Preparing stable artwork in the beta
branch does not publish it to phasekit.app.

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
