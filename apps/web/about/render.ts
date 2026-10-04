import { copy } from "./copy";
import releases from "../../../data/releases.json";
import packageInfo from "../../../package.json";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const arrow =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const external =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M10 5H5v14h14v-5"/></svg>';
const icons = {
  symbols: '<path d="M3 12h4m10 0h4M7 7l10 10V7L7 17V7zm5 0V3m-3 0h6"/>',
  data: '<path d="M9 4h6m-3 0v16M5 8h14M5 16h14M7 4l10 16M17 4 7 20"/>',
  chart: '<path d="M4 3v17h17M7 15l4-7 5 5 4-8"/>',
  report: '<path d="M7 3h10l3 3v15H4V3h3m1 5h8m-8 5h8m-8 4h5"/>',
  source:
    '<path d="M9 15l6-6m-5-3 2-2a4 4 0 0 1 6 6l-2 2m-6 0-2 2a4 4 0 0 0 6 6l2-2"/>',
  offline:
    '<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0m-3 4h.01"/>',
  privacy:
    '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
};
const icon = (name: keyof typeof icons) =>
  `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;

export function renderAboutPage(locale: "fi" | "en") {
  const t = copy[locale];
  const fi = locale === "fi";
  const l = (a: string, b: string) => (fi ? a : b);
  const path = fi ? "/tietoa/" : "/about/";
  const canonical = `https://phasekit.app${path}`;
  const stable = releases.find((r) => r.channel === "stable")!;
  const isBeta =
    packageInfo.version.includes("-beta.") ||
    process.env.VITE_RELEASE_CHANNEL === "beta";
  const app = "https://phasekit.app/";
  const beta = "https://beta.phasekit.app/";
  const github = "https://github.com/huplifi/phasekit";
  const primary = `<a class="button" href="${app}">${t.openApp}${arrow}</a>`;
  const linkedIn =
    '<a class="text-link" href="https://www.linkedin.com/in/hupli" rel="me">LinkedIn' +
    external +
    "</a>";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": canonical,
        url: canonical,
        name: t.title,
        description: t.description,
        inLanguage: locale,
        about: { "@id": "https://phasekit.app/#software" },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://phasekit.app/#software",
        name: "PhaseKit",
        url: app,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        softwareVersion: stable.version,
        inLanguage: ["fi", "en"],
        description: t.description,
        author: {
          "@type": "Person",
          name: "Samu Hupli",
          sameAs: ["https://www.linkedin.com/in/hupli"],
        },
      },
    ],
  };
  return `<!doctype html>
<html lang="${locale}" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t.title)}</title><meta name="description" content="${escape(t.description)}">
<meta name="robots" content="${isBeta ? "noindex, follow" : "index, follow"}"><meta name="theme-color" content="#FAFEFF">
<link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="fi" href="https://phasekit.app/tietoa/"><link rel="alternate" hreflang="en" href="https://phasekit.app/about/"><link rel="alternate" hreflang="x-default" href="https://phasekit.app/about/">
<meta property="og:type" content="website"><meta property="og:site_name" content="PhaseKit"><meta property="og:locale" content="${fi ? "fi_FI" : "en_GB"}"><meta property="og:locale:alternate" content="${fi ? "en_GB" : "fi_FI"}"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${escape(t.title)}"><meta property="og:description" content="${escape(t.description)}"><meta property="og:image" content="https://phasekit.app/about/images/share-${locale}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(t.heroTitle.replace("\n", " "))}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/phasekit-logo-light.svg" type="image/svg+xml"><link rel="preload" href="/fonts/unbounded/Unbounded-Variable.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/about/tokens.css"><link rel="stylesheet" href="/about/about.css">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
</head>
<body>
<a class="skip-link" href="#content">${l("Siirry sisältöön", "Skip to content")}</a>
<header class="site-header wrap"><a class="brand" href="${path}" aria-label="PhaseKit"><img src="/phasekit-logo-light.svg" width="48" height="48" alt=""><span>PhaseKit</span></a><nav class="header-nav" aria-label="${l("Päänavigaatio", "Main navigation")}"><a href="#workflow">${t.navFeatures}</a><a href="#story">${t.navWhy}</a><a href="#install">${t.navInstall}</a></nav><nav class="languages" aria-label="${l("Kieli", "Language")}"><a href="/tietoa/" lang="fi" hreflang="fi" ${fi ? 'aria-current="page"' : ""}>FI<span class="sr-only"> · Suomi</span></a><span aria-hidden="true">/</span><a href="/about/" lang="en" hreflang="en" ${!fi ? 'aria-current="page"' : ""}>EN<span class="sr-only"> · English</span></a></nav></header>
<main id="content">
<section class="hero wrap" aria-labelledby="hero-title"><h1 id="hero-title">${t.heroTitle
    .split("\n")
    .map(
      (line, i) =>
        `<span${i ? ' class="hero-second"' : ""}>${escape(line)}</span>`,
    )
    .join(
      "",
    )}</h1><p class="hero-intro">${t.heroIntro}</p><div class="hero-actions">${primary}<a class="text-link" href="${beta}">${t.betaLink}${arrow}</a></div><p class="hero-caption">${t.heroCaption}</p>
<figure class="product-stage"><div class="desktop-frame"><div class="frame-bar" aria-hidden="true"><span class="frame-dots"><i></i><i></i><i></i></span><span>PhaseKit</span><span class="frame-label">${l("Raportti", "Report")}</span></div><img src="/about/images/report-desktop.webp" width="1220" height="850" alt="${l("Valmis esimerkkiraportti tulostettavaksi tai PDF-tiedostoksi", "A completed example report ready to print or export as a PDF")}" fetchpriority="high"></div><div class="phone-frame hero-phone"><img src="/about/images/refrigerant-mobile.webp" width="390" height="760" alt="${l("Kylmäaineen tiedot puhelimen näkymässä", "Refrigerant details in the mobile view")}"></div><figcaption>${t.screensNote}</figcaption></figure>
</section>
<section class="purpose-section wrap" aria-label="${l("Miksi PhaseKit", "Why PhaseKit")}"><p class="purpose-lead">${escape(t.purposeBody)}</p><p>${escape(t.howBody)}</p></section>
<section id="workflow" class="workflow-section wrap section" aria-labelledby="workflow-title"><div class="workflow-copy"><p class="section-number" aria-hidden="true">01 / ${l("TYÖN MUKANA", "ON THE JOB")}</p><h2 id="workflow-title">${escape(t.workflowTitle)}</h2><p class="workflow-intro">${escape(t.workflowIntro)}</p><ol class="workflow-steps">${t.workflowSteps.map((step) => `<li><h3>${escape(step.title)}</h3><p>${escape(step.body)}</p></li>`).join("")}</ol></div><figure class="workflow-visual"><div class="phone-frame workflow-data"><img src="/about/images/equipment-mobile.webp" width="390" height="850" alt="${l("Esimerkkikohde ja sen tallennetut laitetiedot", "An example site and its saved equipment details")}" loading="lazy"></div><div class="phone-frame workflow-report"><img src="/about/images/report-mobile.webp" width="390" height="760" alt="${l("Esimerkkiraportti tulostusnäkymässä", "Example report in print preview")}" loading="lazy"></div><figcaption>${l("Kohteen ja laitteen tiedoista valmiiksi raportiksi.", "From site and equipment details to a completed report.")}</figcaption></figure></section>
<section id="features" class="features wrap section" aria-labelledby="features-title"><div class="section-heading"><p class="section-number" aria-hidden="true">02 / ${l("TYÖKALUPAKKI", "THE TOOLKIT")}</p><h2 id="features-title">${escape(t.knowledgeTitle).replace("\n", "<br>")}</h2><p class="knowledge-intro">${escape(t.knowledgeIntro)}</p></div><div class="feature-grid">${(
    [
      ["data", t.featureDataTitle, t.featureDataBody, "#/"],
      ["chart", t.featureCalcTitle, t.featureCalcBody, "#/tools"],
      ["symbols", t.featureSymbolsTitle, t.featureSymbolsBody, "#/symbols"],
      ["report", t.featureReportTitle, t.featureReportBody, "#/reports"],
    ] as const
  )
    .map(
      ([name, title, body, route]) =>
        `<article>${icon(name)}<h3>${title}</h3><p>${body}</p>${name === "chart" ? `<img class="calculator-preview" src="/about/images/cycle-desktop.webp" width="1220" height="850" alt="${l("Kylmäkierron log(p)–h-kaavio PhaseKitissä", "A refrigeration cycle log(p)–h diagram in PhaseKit")}" loading="lazy">` : ""}<a class="text-link" href="${app}${route}">${l("Tutustu sovelluksessa", "Explore in the app")}${arrow}</a></article>`,
    )
    .join("")}</div></section>
<section id="story" class="story-band"><div class="wrap story-grid"><div><p class="section-number" aria-hidden="true">03 / ${l("ALKUSYSÄYS", "THE STARTING POINT")}</p><h2>${t.whyTitle}</h2><div class="story-text"><p>${t.whyBody}</p><p>${t.whyFollowup}</p></div><div class="story-signature"><span class="signature-rule"></span><span>Samu Hupli<br><small>${l("PhaseKitin tekijä", "Creator of PhaseKit")}</small></span></div></div><figure class="story-example"><div class="phone-frame"><img src="/about/images/blend-check-mobile.webp" width="390" height="850" alt="${l("Vuototarkastusarvion tulos ja laskentaperusteet R513A-seokselle, 25 kg", "Leak-check assessment result and basis for a 25 kg R513A blend charge")}" loading="lazy"></div><figcaption>${l("Esimerkkilaskelma: R513A, 25 kg. Seoksen HFO-komponentti määrää tarkastusvälin.", "Example: R513A, 25 kg. The blend’s HFO component determines the inspection interval.")}</figcaption></figure></div></section>
<section class="principles wrap section" aria-labelledby="principles-title"><div class="section-heading"><p class="section-number" aria-hidden="true">04 / ${l("PERIAATTEET", "PRINCIPLES")}</p><h2 id="principles-title">${t.principlesTitle}</h2><p class="principles-intro">${escape(t.principlesIntro)}</p></div><div class="principle-grid">${(
    [
      ["source", t.sourceTitle, t.sourceBody],
      ["offline", t.offlineTitle, t.offlineBody],
      ["privacy", t.privacyTitle, t.privacyBody],
    ] as const
  )
    .map(
      ([name, title, body]) =>
        `<article>${icon(name)}<h3>${title}</h3><p>${body}</p></article>`,
    )
    .join(
      "",
    )}</div><aside class="license-note" aria-labelledby="license-title"><div><h3 id="license-title">${t.licenseTitle}</h3><p>${escape(t.licenseBody)}</p><p class="small">${escape(t.licenseNote)}</p></div><div class="license-links"><a class="text-link" href="${github}/blob/main/LICENSE">${l("MIT-lisenssi", "MIT licence")}${external}</a><a class="text-link" href="${github}/blob/main/THIRD_PARTY_NOTICES.md">${l("Aineistojen lisenssit", "Third-party notices")}${external}</a></div></aside></section>
<section id="install" class="install-section wrap section" aria-labelledby="install-title"><div class="install-intro"><img src="/icons/icon-v3-192.png" width="80" height="80" alt="" loading="lazy"><h2 id="install-title">${t.installTitle}</h2><p>${t.installIntro}</p>${primary}<p class="theme-note">${escape(t.themeNote)}</p></div><div class="install-guides">${(
    [
      [
        t.iosTitle,
        t.iosSteps,
        "https://support.apple.com/guide/iphone/iphea86e5236/ios",
        "Apple",
      ],
      [
        t.androidTitle,
        t.androidSteps,
        "https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid",
        "Google",
      ],
    ] as const
  )
    .map(
      ([title, steps, url, source]) =>
        `<details><summary>${title}<span aria-hidden="true">+</span></summary><ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol><a class="text-link guide-source" href="${url}">${l("Ohje", "Guide")}: ${source}${external}</a></details>`,
    )
    .join("")}<p class="small">${t.installNote}</p></div></section>
<section class="release-section wrap section" aria-labelledby="release-title"><div><p class="section-number" aria-hidden="true">05 / ${l("KEHITTYY KÄYTÖSSÄ", "BUILT TO KEEP IMPROVING")}</p><h2 id="release-title">${l("Pieni työkalu.\nJatkuva kehitys.", "A practical tool.\nAlways improving.").replace("\n", "<br>")}</h2><p>${l("PhaseKit kasvaa todellisista käyttötarpeista. Lähdekoodi, muutokset ja keskustelu ovat avoimesti GitHubissa.", "PhaseKit grows from real needs. Its source code, changes and discussion are open on GitHub.")}</p><a class="text-link" href="${github}">${t.githubLink}${external}</a></div><article class="release-note"><div class="release-meta"><span>${t.releaseTitle}</span><time datetime="${stable.date}">${new Intl.DateTimeFormat(fi ? "fi-FI" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(stable.date + "T12:00:00Z"))}</time></div><p class="release-version">${stable.version}</p><h3>${escape(stable.title[locale])}</h3><ul>${stable.changes[
    locale
  ]
    .slice(0, 3)
    .map((text) => `<li>${escape(text)}</li>`)
    .join(
      "",
    )}</ul><a class="text-link" href="${app}#/releases">${t.historyLink}${arrow}</a></article></section>
<section class="author-section wrap" aria-labelledby="author-title"><div><p class="section-number">${t.authorTitle}</p><h2 id="author-title">Samu Hupli</h2><img class="author-portrait" src="/about/images/samu-hupli.jpg" width="2000" height="1333" alt="Samu Hupli" loading="lazy"></div><div><p>${escape(t.authorBody)}</p><p>${escape(t.authorFollowup)}</p><p class="author-values">${escape(t.authorValues)}</p>${linkedIn}</div></section>
<section class="closing wrap"><h2>${l("Kokeile seuraavan\nkysymyksen kohdalla.", "Try it when the\nnext question comes.").replace("\n", "<br>")}</h2><div class="hero-actions">${primary}<a class="text-link" href="${beta}">${t.betaLink}${arrow}</a></div><p class="small beta-note">${t.betaNote}</p></section>
</main>
<footer class="site-footer wrap"><div><a class="brand" href="${path}"><img src="/phasekit-logo-light.svg" width="40" height="40" alt=""><span>PhaseKit</span></a><p>${t.footerLine}</p></div><div><div class="footer-links">${linkedIn}<a class="text-link" href="${github}/blob/main/LICENSE">MIT${external}</a><a class="text-link" href="${github}">GitHub${external}</a><a class="text-link" href="${github}/issues">${l("Palaute", "Feedback")}${external}</a></div></div></footer>
</body></html>`;
}
