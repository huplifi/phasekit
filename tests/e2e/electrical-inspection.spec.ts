import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import type { UserData } from "../../apps/web/src/storage";
async function stored(page: Page): Promise<UserData> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<UserData>((resolve, reject) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state;
  });
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Tallennettu tähän selaimeen" }),
  ).toBeVisible();
}
async function startFromMeasurement(page: Page) {
  await page.goto("/#/tools");
  await page
    .getByRole("button", { name: "Sähkömittaukset", exact: true })
    .click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Koekohde A");
  await page.getByLabel("Tekijä", { exact: true }).fill("Tarkastaja Testi");
  await page.getByLabel("Mittarin merkki", { exact: true }).fill("Fluke");
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1664 FC");
  await page.getByLabel("Mittarin sarjanumero", { exact: true }).fill("SN-123");
  await page
    .getByLabel("Mittauspiste tai ryhmä", { exact: true })
    .fill("Ryhmä 7");
  const continuity = page.locator(
    '.electrical-sheet-row[data-type="continuity"]',
  );
  await continuity.locator(".electrical-sheet-inputs input").fill("0,42");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("0,42");
  await continuity.getByText("Ohje ja lisätiedot", { exact: true }).click();
  const photo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f40";
    ctx.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await continuity
    .getByLabel("Lisää kuva (vapaaehtoinen)", { exact: true })
    .setInputFiles({
      name: "reading.png",
      mimeType: "image/png",
      buffer: Buffer.from(photo, "base64"),
    });
  await expect
    .poll(async () =>
      Boolean((await stored(page)).electricalMeasurements?.[0]?.photo),
    )
    .toBe(true);
  const source = (await stored(page)).electricalMeasurements![0];
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await expect(page).toHaveURL(/electrical-reports\/new\?session=/);
  await page.locator(".electrical-reading-choice input[type=checkbox]").check();
  await page
    .getByRole("button", { name: "Luo luonnos (1 mittausta)", exact: true })
    .click();
  await expect(page.locator(".electrical-report-reading")).toContainText(
    "0,42 Ω",
  );
  await expect(
    page.getByLabel("Kohteen nimi / tunnus", { exact: true }),
  ).toHaveValue("Koekohde A");
  return source;
}
async function completeFailure(page: Page) {
  const values: [string, string][] = [
    ["Kohteen osoite", "Koetie 1"],
    ["Työn kuvaus", "Ryhmän muutos"],
    ["Tarkastuksen laajuus ja rajaukset", "Ryhmä 7"],
    ["Rakentaja", "Koerakentaja Oy"],
    ["Rakentajan yhteystiedot", "123 / rakentaja@example.com"],
    ["Sähkötöiden johtaja", "Johtaja Testi"],
    ["Sähkötöiden johtajan yhteystiedot", "456 / johtaja@example.com"],
    ["Tarkastajan yhteystiedot", "789 / tarkastaja@example.com"],
    [
      "Sovelletut standardit ja versiot",
      "Kohteen standardit ja versiot yksilöity tarkastajan toimesta",
    ],
    [
      "Tarkastusmenetelmät ja toimintatestit",
      "Tarkastussuunnitelman mukaiset mittaukset",
    ],
    [
      "Aistinvaraiset tarkastukset: laajuus ja havainnot",
      "Ryhmän 7 havainnot ja soveltuvuus kuvattu",
    ],
    [
      "Puutteet ja korjaustarpeet (kirjaa myös, jos ei todettu)",
      "Ryhmässä 7 korjattavaa",
    ],
    [
      "Poikkeamat ja niiden selvitykset (kirjaa myös, jos ei ole)",
      "Ei muita poikkeamia",
    ],
    [
      "Tulosten arviointi ja vaatimustenmukaisuuden perustelut",
      "Kirjattu puute estää käyttöönoton tässä laajuudessa",
    ],
    [
      "Johtopäätöksen perustelut ja käytön rajoitukset",
      "Ei saa ottaa käyttöön ennen korjausta ja uusintatarkastusta",
    ],
    ["Allekirjoittajan nimenselvennys", "Tarkastaja Testi"],
    ["Tarkastuksen päiväys", "2026-11-11"],
  ];
  for (const [label, value] of values)
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("checkbox", {
      name: /Olen tarkistanut tarkastuspohjan sisällön/,
    })
    .check();
  await page.locator(".electrical-report-reading select").selectOption("fail");
  await page
    .getByLabel("Arviointiperuste / puute / soveltumattomuuden syy", {
      exact: true,
    })
    .fill("Kohteen arviointiperusteeseen nähden puute");
  await page
    .locator(".electrical-report-wide select")
    .selectOption("not-approved");
  await saved(page);
}
async function inspectPdf(page: Page, draft: boolean) {
  const popupEvent = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "PDF ja tulostus", exact: true })
    .click();
  const preview = await popupEvent;
  await expect(preview.locator(".document-status")).toContainText(
    draft ? "LUONNOS" : "Viimeistelty",
  );
  await expect(preview.locator("body")).toContainText("0,42 Ω");
  await expect(preview.locator("body")).toContainText(
    "Fluke / 1664 FC / SN-123",
  );
  await expect(preview.locator("body")).toContainText(
    "Nimenselvennys ei ole sähköinen allekirjoitus",
  );
  await expect(preview.locator("img")).toHaveCount(1);
  await expect
    .poll(() =>
      preview
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(preview.locator(".pdf-action")).toBeEnabled({ timeout: 30_000 });
  await expect(preview.locator(".pdf-status")).not.toHaveAttribute(
    "data-error",
    /.+/,
  );
  // Use the prepared PDF download link, bypassing the OS share sheet on mobile.
  const downloaded = preview.waitForEvent("download");
  await preview
    .locator(".pdf-download")
    .evaluate((link: HTMLAnchorElement) => link.click());
  const file = await downloaded;
  const bytes = await readFile(await file.path());
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(5000);
  await preview.close();
}

test("recorded measurements become a report without reentry; failures finalise, export PDF, and corrections preserve original history", async ({
  page,
}) => {
  const source = await startFromMeasurement(page);
  await saved(page);
  await inspectPdf(page, true);
  await completeFailure(page);
  await page
    .getByRole("button", { name: "Viimeistele ja lukitse versio", exact: true })
    .click();
  await expect(
    page.getByLabel("Kohteen nimi / tunnus", { exact: true }),
  ).toBeDisabled();
  await saved(page);
  const originalUrl = page.url();
  const original = (await stored(page)).electricalReports![0];
  expect(original.status).toBe("final");
  expect(original.conclusion).toBe("not-approved");
  expect((await stored(page)).electricalMeasurements![0]).toEqual(source);
  await inspectPdf(page, false);
  await page
    .getByRole("button", { name: "Luo korjattu versio", exact: true })
    .click();
  await expect(page).not.toHaveURL(originalUrl);
  await expect(
    page.getByRole("checkbox", {
      name: /Olen tarkistanut tarkastuspohjan sisällön/,
    }),
  ).not.toBeChecked();
  await page
    .getByText("Täydennä / korjaa tämän version mittaustiedot", { exact: true })
    .click();
  await page.getByLabel("Tulos", { exact: true }).fill("0,43");
  await expect(page.locator(".electrical-report-reading select")).toHaveValue(
    "unassessed",
  );
  await expect(
    page.getByLabel("Arviointiperuste / puute / soveltumattomuuden syy", {
      exact: true,
    }),
  ).toHaveValue("");
  await saved(page);
  const state = await stored(page);
  expect(state.electricalReports![0]).toEqual(original);
  expect(state.electricalReports![1].measurements[0].result).toBe("0,43");
  expect(state.electricalReports![1].measurements[0].measuredAt).toBe(
    source.measuredAt,
  );
  expect(state.electricalMeasurements![0]).toEqual(source);
  await page.goto(originalUrl);
  await expect(page.locator(".electrical-report-reading")).toContainText(
    "0,42 Ω",
  );
  await page.goto("/#/reports");
  await page
    .locator(".report-filters select")
    .selectOption("electrical-inspection");
  await expect(page.locator(".report-list-link")).toHaveCount(2);
});

test("inspection report stays accessible without horizontal overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startFromMeasurement(page);
  await saved(page);
  await expect(
    page.getByRole("heading", {
      name: "Käyttöönottotarkastuspöytäkirja",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Viimeistele ja lukitse versio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Täydennä ennen viimeistelyä",
  );
});
