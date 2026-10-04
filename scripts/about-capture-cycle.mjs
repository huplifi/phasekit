/* global document, Image */
/** Capture the real cycle diagram section, without desktop navigation or gutters. */
import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const baseURL = process.argv[2] || "http://127.0.0.1:4184";
const output = fileURLToPath(
  new URL(
    "../apps/web/public/about/images/cycle-desktop.webp",
    import.meta.url,
  ),
);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1220, height: 1000 },
    colorScheme: "light",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/#/ph/r134a`);
  for (const [id, value] of [
    ["lp", "2.5"],
    ["hp", "10"],
    ["suction", "10"],
    ["hot-gas", "70"],
    ["liquid", "25"],
  ])
    await page.locator(`#shsc-${id}`).fill(value);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.locator(".ph-cycle-line").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(".ph-diagram-section");
  const caption = await section.locator("figcaption").innerText();
  if (!caption.includes("rajatun painealueen"))
    throw new Error("Missing model limitation caption");
  const png = await section.screenshot();
  const encoded = await page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return {
        width: image.width,
        height: image.height,
        data: canvas.toDataURL("image/webp", 0.94).split(",")[1],
      };
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  await writeFile(output, Buffer.from(encoded.data, "base64"));
  await copyFile(
    output,
    fileURLToPath(
      new URL(
        "../apps/web/dist/about/images/cycle-desktop.webp",
        import.meta.url,
      ),
    ),
  );
  console.log({
    width: encoded.width,
    height: encoded.height,
    caption,
    output,
  });
} finally {
  await browser.close();
}
