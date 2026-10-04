/* global document, window, Image */
/** Capture fictional site/equipment and its completed service report. */
import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(
  new URL("../apps/web/public/about/images/", import.meta.url),
);
const baseURL = process.argv[2] || "http://127.0.0.1:4184";
const browser = await chromium.launch();
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot();
  const webp = await page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", 0.94).split(",")[1];
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  await writeFile(`${output}${name}.webp`, Buffer.from(webp, "base64"));
}
async function captureCommissioning(page) {
  await page.goto(`${baseURL}/#/checklists/new`);
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  const selector = page.getByRole("combobox", {
    name: "Liitä laitteeseen",
    exact: true,
  });
  const value = await selector
    .locator("option")
    .filter({ hasText: "Lämpöpumppu 1" })
    .getAttribute("value");
  await selector.selectOption(value);
  for (const [name, text] of Object.entries({
    "Kohteen nimi": "Esimerkkikohde – kuvitteellinen esimerkki",
    "Laite / tunniste": "Lämpöpumppu 1",
    Suorituspäivä: "2026-10-04",
    Tekijä: "Demoasentaja",
    "LP · imupaine": "10",
    "HP · korkeapaine": "28",
    "Imukaasun lämpötila · °C": "10",
    "Kuumakaasun lämpötila · °C": "75",
    "Nesteen lämpötila · °C": "35",
  }))
    await page.getByLabel(name, { exact: true }).fill(text);
  await page
    .getByRole("combobox", { name: "Paineviite", exact: true })
    .selectOption("absolute");
  await page.getByRole("button", { name: "Muodosta log(p)–h-kaavio" }).click();
  await page.locator(".field-report-cycle img").waitFor();
  for (const name of [
    "Kohteen käyttöönotto-ohje ja perustiedot tarkistettu",
    "Kylmäaine ja täytös kirjattu",
    "Käyntiarvot ja käyttöolosuhteet kirjattu",
  ])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page
    .getByRole("textbox", { name: "Havainnot ja muistiinpanot", exact: true })
    .fill(
      "Kuvitteellinen esimerkki: R32, 2 kg. Mittaukset ja työvaiheet havainnollistavat kirjaamista; tämä ei ole todellisen laitteen asennustodistus.",
    );
  await page
    .getByRole("combobox", { name: "Asiakirjan tarkoitus", exact: true })
    .selectOption("technical");
  const values = {
    tightnessRecordMode: "internal",
    evacuationRecordMode: "internal",
    testRunRecordMode: "internal",
    tightnessMedium: "Typpi – kuvitteellinen esimerkki",
    tightnessCriterion:
      "Esimerkkiohje: 30 bar(a), 30 min, ei havaittavaa paineen muutosta samassa lämpötilassa.",
    tightnessStart: "4.10.2026 klo 09.00 · 30 bar(a) · 20 °C",
    tightnessEnd: "4.10.2026 klo 09.30 · 30 bar(a) · 20 °C",
    tightnessFinding:
      "Esimerkkikirjaus: paine säilyi, tarkastetuissa liitoksissa ei havaittu vuotoa.",
    vacuumUnit: "mbar",
    targetPressure: "0.3",
    achievedPressure: "0.25",
    holdAcceptanceCriterion:
      "Esimerkkiohje: loppupaine alle 0,30 mbar(a), pitoaika 15 min.",
    instrumentName: "Esimerkkimittari DEMO-01",
    measurementLocation: "Huoltoliitäntä",
    holdStartPressure: "0.25",
    holdEndPressure: "0.28",
    holdMinutes: "15",
    evacuationFinding:
      "Esimerkkikirjaus: paineennousu 0,03 mbar, esimerkin raja alittui.",
    conditions:
      "Kuvitteellinen jäähdytyskoe: ulkoilma 25 °C, sisäilma 24 °C, tasainen kuormitus.",
    testRunMeasurements:
      "LP 10 bar(a), HP 28 bar(a), imu 10 °C, kuumakaasu 75 °C, neste 35 °C.",
    testRunFinding:
      "Esimerkkikirjaus: säätö, anturit ja käynnistys/pysäytys tarkastettu. Ei havaittuja poikkeamia.",
  };
  for (const [id, value] of Object.entries(values)) {
    const field = page.locator(`#report-field-${id}`);
    if (!(await field.count())) continue;
    const closed = field.locator("xpath=ancestor::details[not(@open)]").first();
    if (await closed.count()) await closed.locator(":scope > summary").click();
    const select = field.locator("select");
    if (await select.count()) await select.selectOption(value);
    else await field.locator("input, textarea").fill(value);
  }
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Lukitse raportti", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Luo uusi versio", exact: true })
    .waitFor();
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const report = await pending;
  await report.waitForLoadState("domcontentloaded");
  await report.setViewportSize({ width: 1220, height: 850 });
  const printed = await report.locator("body").innerText();
  for (const required of [
    "Viimeistelty raportti",
    "6 / 6 merkitty",
    "Tiiviyskoepöytäkirja — sisältyy tähän asiakirjaan",
    "Tyhjiöintipöytäkirja — sisältyy tähän asiakirjaan",
    "Koekäyttöpöytäkirja — sisältyy tähän asiakirjaan",
  ])
    if (!printed.includes(required))
      throw new Error(`Incomplete commissioning example: ${required}`);
  if (printed.includes("Täydennettävät tiedot"))
    throw new Error("Commissioning example has missing required fields");
  await capture(report, "commissioning-desktop");
  console.log("COMMISSIONING", await report.locator("body").innerText());
}
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 850 },
    colorScheme: "light",
    deviceScaleFactor: 1,
  });
  await page.goto(`${baseURL}/#/equipment`);
  await page.getByRole("button", { name: "Lisää kohde", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Esimerkkikohde");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await page
    .getByRole("button", { name: "Lisää laite", exact: true })
    .first()
    .click();
  await page.getByLabel("Nimi", { exact: true }).fill("Lämpöpumppu 1");
  await page
    .locator("#equipment-site")
    .selectOption({ label: "Esimerkkikohde" });
  await page.getByLabel("Sijainti", { exact: true }).fill("Tekninen tila");
  await page.locator(".equipment-optional-details > summary").click();
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  await page.getByPlaceholder("R-numero, nimi, CAS tai kauppanimi").fill("R32");
  await page
    .getByRole("button", {
      name: "Valitse kylmäaine työkalulle R32",
      exact: true,
    })
    .click();
  await page.getByLabel("Täytös (kg)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  if (process.argv.includes("--commissioning-only")) {
    await captureCommissioning(page);
  } else {
    await page.goto(`${baseURL}/#/checklists/new`);
    await page
      .getByRole("combobox", { name: "Raporttipohja", exact: true })
      .selectOption("service");
    await page
      .getByRole("button", { name: "Luo raportti", exact: true })
      .click();
    const equipmentSelect = page.getByRole("combobox", {
      name: "Liitä laitteeseen",
      exact: true,
    });
    const equipmentValue = await equipmentSelect
      .locator("option")
      .filter({ hasText: "Lämpöpumppu 1" })
      .getAttribute("value");
    await equipmentSelect.selectOption(equipmentValue);
    for (const [name, value] of Object.entries({
      "Kohteen nimi": "Esimerkkikohde",
      "Laite / tunniste": "Lämpöpumppu 1",
      Suorituspäivä: "2026-10-04",
      Tekijä: "Demoasentaja",
      "Lähtötilanne ja oireet":
        "Lauhduttimen puhdistustarve havaittu määräaikaishuollossa.",
      "Tehdyt työt ja vaihdetut osat":
        "Lauhdutin puhdistettu. Liitokset ja laitteen toiminta tarkastettu.",
    }))
      await page.getByLabel(name, { exact: true }).fill(value);
    await page
      .getByRole("textbox", { name: "Havainnot ja muistiinpanot", exact: true })
      .fill(
        "Esimerkkiraportti. Laitteen toiminta tarkastettu ja huoltotyö kirjattu.",
      );
    for (const checkbox of await page.getByRole("checkbox").all())
      await checkbox.check();
    await page
      .getByRole("button", { name: "Lukitse raportti", exact: true })
      .click();
    const pending = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Tulosta / PDF", exact: true })
      .click();
    const report = await pending;
    await report.waitForLoadState("domcontentloaded");
    await report.setViewportSize({ width: 1220, height: 850 });
    await capture(report, "report-desktop");
    await report.setViewportSize({ width: 390, height: 760 });
    await capture(report, "report-mobile");
    console.log("REPORT", await report.locator("body").innerText());
    await page.goto(`${baseURL}/#/equipment`);
    await page.locator(".equipment-history > summary").click();
    await page
      .getByRole("heading", { name: "Laitteet ja kohteet", exact: true })
      .evaluate((el) =>
        window.scrollTo(
          0,
          el.getBoundingClientRect().top + window.scrollY - 16,
        ),
      );
    await capture(page, "equipment-mobile");
    console.log("EQUIPMENT", await page.locator(".equipment-site").innerText());
  }
} finally {
  await browser.close();
}
