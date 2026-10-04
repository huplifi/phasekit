# Beta feedback — 4 October 2026

Collect observations here. Implementation and beta publication await the user's GO. This list does not change the already authorised introduction-page publication.

## Print table alignment

- User screenshot: leak-check assessment printout for R513A, 25 kg.
- The middle columns of the adjacent “Aineosien laskenta” and “Velvoitteet” tables start at different horizontal positions.
- Check whether a shared column layout improves scanning at A4 print width and in the PDF, while allowing long rules and source notes to wrap.
- Status: reported; not yet changed.

## Unknown-path responses

- Reported separately: bot-style requests such as `/.env` and `/wp-admin/install.php` return the application HTML with HTTP 200.
- Configuration review confirms a Netlify `/*` to `/index.html` rewrite. The application itself uses hash routes.
- After the confirmed production check, the proposed correction is to remove the catchall and restrict the service worker's navigation fallback to the application root, preserving public HTML pages and assets. A small 404 page can offer recovery links.
- Status: confirmed on production 0.4.1 after publication. `/.env`, `/wp-admin/install.php`, `/phasekit-missing-check-20261004/` and a missing JavaScript asset all returned HTTP 200, text/html, 736 bytes, byte-identical to `/` (SHA-256 `7dfde5ae5ec04779470787c8ffb2a5d64fd0c4542c159537f674590ea918ebef`). No environment-file or WordPress content was returned by those requests. No routing change made.
- Netlify Web Analytics counts HTML responses with status 200, 201 or 304 as pageviews: https://docs.netlify.com/manage/monitoring/web-analytics/how-web-analytics-works/ . A proper 404 will exclude future misses from those pageview charts; this does not rewrite historical statistics.

## Next beta preparation

- Incorporate the stable 0.4.1 introduction changes when preparing the next beta, preserving the separate beta version and storage.
- Wait for the user's GO before implementing and publishing the collected beta changes.

## Settings privacy wording

- Production Settings still says there is no analytics. The introduction now distinguishes browser-local report storage from hosting request statistics.
- Align the Settings wording in Finnish and English with that distinction in the next beta.
- Status: observed while verifying the normal 0.4.0 to 0.4.1 update; not yet changed.
