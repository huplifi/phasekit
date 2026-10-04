/* global document */
/** Render social previews from the real product capture and bundled brand assets.
 * Run: node scripts/about-share-images.mjs [http://127.0.0.1:4173]
 * Requires the repository's existing Playwright Chromium installation.
 */
import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "apps/web/public");
const output = path.join(publicDir, "about/images");
const baseURL = process.argv[2] || "http://127.0.0.1:4173";
async function dataURL(relative, mime) {
  return `data:${mime};base64,${(await readFile(path.join(publicDir, relative))).toString("base64")}`;
}
const [unbounded, poppins, logo, capture] = await Promise.all([
  dataURL("fonts/unbounded/Unbounded-Variable.ttf", "font/ttf"),
  dataURL("fonts/poppins/Poppins-Regular.ttf", "font/ttf"),
  dataURL("phasekit-logo-light.svg", "image/svg+xml"),
  dataURL("about/images/refrigerant-mobile.webp", "image/webp"),
]);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const [language, lines] of Object.entries({
    fi: ["Tieto käyttöön.", "Työ talteen."],
    en: ["Knowledge at hand.", "Work on record."],
  })) {
    await page.setContent(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><base href="${baseURL}"><style>
      @font-face{font-family:Unbounded;src:url('${unbounded}')}@font-face{font-family:Poppins;src:url('${poppins}')}
      *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
      body{font-family:Poppins,sans-serif;background:#FAFEFF;color:#122E3F}
      .canvas{position:relative;width:1200px;height:630px;background:radial-gradient(ellipse at 94% 40%,#D9F8FC 0%,#FAFEFF 64%)}
      .brand{position:absolute;left:60px;top:55px;display:flex;align-items:center;gap:18px;font-family:Unbounded,sans-serif;font-size:28px;font-weight:700}
      .brand img{width:56px;height:56px;object-fit:contain}
      h1{position:absolute;left:60px;top:216px;margin:0;width:800px;font-family:Unbounded,sans-serif;font-size:${language === "en" ? 37 : 46}px;font-weight:650;line-height:1.46;letter-spacing:-1.1px}
      h1 span{display:block;white-space:nowrap}
      .address{position:absolute;left:60px;bottom:63px;font-size:23px;letter-spacing:.1px}
      .phone{position:absolute;right:57px;top:58px;width:264px;height:514px;padding:7px;border:1px solid #BBD9E1;border-radius:24px;background:#FAFEFF;box-shadow:0 20px 45px #122E3F16;overflow:hidden}
      .phone img{display:block;width:248px;height:auto;border-radius:17px}
    </style></head><body><main class="canvas"><div class="brand"><img src="${logo}" alt=""><span>PhaseKit</span></div><h1>${lines.map((line) => `<span>${line}</span>`).join("")}</h1><div class="address">phasekit.app</div><div class="phone"><img src="${capture}" alt="PhaseKit R134a refrigerant properties"></div></main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page
      .locator("h1 span")
      .evaluateAll((elements) =>
        elements.some((element) => element.scrollWidth > element.clientWidth),
      );
    const titleRight = await page.locator("h1 span").evaluateAll((elements) =>
      Math.max(
        ...elements.map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getBoundingClientRect().right;
        }),
      ),
    );
    if (overflow || titleRight > 867)
      throw new Error(`Share title overlaps screenshot: ${language}`);
    await page.screenshot({ path: path.join(output, `share-${language}.png`) });
    console.log(
      `share-${language}.png: 1200×630; title right edge ${Math.round(titleRight)}px`,
    );
  }
} finally {
  await browser.close();
}
