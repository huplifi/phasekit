/* global document, window, Image, getComputedStyle */
/** Capture a fictional blend leak-check example from the real app. */
import { Buffer } from "node:buffer";
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const baseURL = process.argv[2] || "http://127.0.0.1:4184";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 850 },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  await page.goto(`${baseURL}/#/check/r513a`);
  await page.getByLabel("Täytös", { exact: true }).fill("25");
  await page.locator("#check-date").fill("2026-10-04");
  await page
    .getByRole("button", { name: "Laske tarkastusväli", exact: true })
    .click();
  await page.locator(".result-card").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".result-card")
    .evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16),
    );
  const theme = await page.evaluate(() => ({
    applied: document.documentElement.dataset.theme,
    background: getComputedStyle(document.documentElement).backgroundColor,
    foreground: getComputedStyle(document.body).color,
  }));
  if (theme.applied !== "dark")
    throw new Error("Application dark theme did not apply");
  console.log("Verified application theme:", theme);
  const result = await page.locator(".result-card").innerText();
  for (const required of ["R513A · 25 kg", "6 kuukauden välein", "14 kg", "R1234yf"])
    if (!result.includes(required)) throw new Error(`Unexpected blend result: missing ${required}`);
  const screenshot = await page.screenshot();
  // Convert the genuine screenshot using Chromium's native WebP encoder.
  const webp = await page.evaluate(
    async (png) => {
      const image = new Image();
      image.src = png;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", 0.94).split(",")[1];
    },
    `data:image/png;base64,${screenshot.toString("base64")}`,
  );
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    path.join(root, "apps/web/public/about/images/blend-check-mobile.webp"),
    Buffer.from(webp, "base64"),
  );
  console.log(await page.locator(".result-section").innerText());
} finally {
  await browser.close();
}
