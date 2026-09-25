# PhaseKit fonts

The app ships its fonts locally so typography remains available after installation and during offline use. The files below are the actual font releases; no system-font substitution or synthetic bolding is used.

## Files and sources

| Family | Shipped files | Source and version | License |
|---|---|---|---|
| Unbounded | `apps/web/public/fonts/unbounded/Unbounded-Variable.ttf` | [Google Fonts Unbounded directory](https://github.com/google/fonts/tree/main/ofl/unbounded), variable `wght` axis 200–900. The directory metadata identifies upstream commit `f3ec43228a864a72487e41552e2140efab9884ea`. The app exposes only the agreed 600 and 700 weights. | SIL Open Font License 1.1, included as `apps/web/public/fonts/unbounded/OFL.txt`. |
| Poppins | `apps/web/public/fonts/poppins/Poppins-Regular.ttf`, `Poppins-Bold.ttf` | [Google Fonts Poppins directory](https://github.com/google/fonts/tree/main/ofl/poppins). Its metadata maps these files to normal weights 400 and 700 and identifies upstream commit `738d9d691b66f1ad917123c58df104d16c74e1a7`. | SIL Open Font License 1.1, included as `apps/web/public/fonts/poppins/OFL.txt`. |
| Ioskeley Mono | `apps/web/public/fonts/ioskeley-mono/IoskeleyMono-Regular.woff2`, `IoskeleyMono-SemiBold.woff2`, `IoskeleyMono-ExtraBold.woff2` | [Official Ioskeley Mono v2.0.0 web release](https://github.com/ahatem/IoskeleyMono/releases/tag/v2.0.0), from its `WOFF2/` directory. These unprefixed files are the normal-width family; the release distinguishes the narrower widths with `SemiCondensed` and `Condensed` names. | SIL Open Font License 1.1, included as `apps/web/public/fonts/ioskeley-mono/LICENSE`. |

The font files were checked against their embedded family/style metadata where the local font inspector supports the format. It reports Unbounded as a variable family with named SemiBold and Bold instances, and Poppins as Regular and Bold. The Ioskeley WOFF2 files come directly from the official release archive and retain its Regular, SemiBold, and ExtraBold filenames; Fontconfig on this machine does not expose WOFF2 metadata.

## CSS

Import these declarations from the app stylesheet. Keeping each `@font-face` at its real weight avoids browser-created weights. The Unbounded file is variable; the declared range deliberately limits app use to 600–700.

```css
@font-face {
  font-family: "Unbounded";
  src: url("/fonts/unbounded/Unbounded-Variable.ttf") format("truetype");
  font-style: normal;
  font-weight: 600 700;
  font-display: swap;
}

@font-face {
  font-family: "Poppins";
  src: url("/fonts/poppins/Poppins-Regular.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Poppins";
  src: url("/fonts/poppins/Poppins-Bold.ttf") format("truetype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: "Ioskeley Mono";
  src: url("/fonts/ioskeley-mono/IoskeleyMono-Regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Ioskeley Mono";
  src: url("/fonts/ioskeley-mono/IoskeleyMono-SemiBold.woff2") format("woff2");
  font-style: normal;
  font-weight: 600;
  font-display: swap;
}

@font-face {
  font-family: "Ioskeley Mono";
  src: url("/fonts/ioskeley-mono/IoskeleyMono-ExtraBold.woff2") format("woff2");
  font-style: normal;
  font-weight: 800;
  font-display: swap;
}

/* Put this on the app root to prevent synthetic bold and italic faces. */
.phasekit-app {
  font-synthesis: none;
}
```

Use Unbounded only at 600 or 700, Poppins only at 400 or 700, and Ioskeley Mono only at 400, 600, or 800. The installed assets include no Poppins Semibold and no additional weights by design.
