import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("saved report keeps frozen provenance and equipment history after equipment deletion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/equipment");
  await page.getByRole("button", { name: "Lisää laite", exact: true }).click();
  await page.getByLabel("Nimi", { exact: true }).fill("Testikohde 4");
  await page.getByLabel("Sijainti", { exact: true }).fill("Konehuone");
  await page
    .getByLabel("Muistiinpanot", { exact: true })
    .fill("Huoltohistoria alkaa");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Testikohde 4" }),
  ).toBeVisible();

  await page.goto("/#/pipe");
  await page
    .getByRole("textbox", { name: "Sisähalkaisija · mm", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Pituus · m", exact: true })
    .fill("10");
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Laite / kohde", exact: true })
    .selectOption({ label: "Testikohde 4" });
  await page
    .getByLabel("Muistiinpanot", { exact: true })
    .fill("Lähtötiedot mitattu paikan päällä.");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();

  await page.goto("/#/reports");
  const report = page.locator(".report-entry");
  await report.click();
  await expect(report.locator(".report-summary")).toContainText("20 mm");
  await expect(report).toContainText("Testikohde 4");
  await expect(report).toContainText("Lähtötiedot mitattu paikan päällä.");
  await expect(report).toContainText("Lähteet ja versiotiedot");
  await expect(report).toContainText(
    "ei ole vaatimustenmukaisuussertifikaatti",
  );

  const jsonDownload = page.waitForEvent("download");
  await report.getByRole("button", { name: "Vie JSON", exact: true }).click();
  expect((await jsonDownload).suggestedFilename()).toMatch(
    /^phasekit-report-.*\.json$/,
  );
  const imageDownload = page.waitForEvent("download");
  await report.getByRole("button", { name: "Tallenna kuvana" }).click();
  const image = await imageDownload;
  expect(image.suggestedFilename()).toMatch(/^phasekit-report-.*\.png$/);
  const png = await readFile(await image.path());
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBeGreaterThan(500);
  const popupPromise = page.waitForEvent("popup");
  await report
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const printPage = await popupPromise;
  await expect(printPage).toHaveTitle("Putken tilavuus ja virtaus");
  await expect(printPage.locator("body")).toContainText(
    "Lähteet ja versiotiedot",
  );
  await expect(printPage.locator("body")).toContainText(
    "Lähtötiedot mitattu paikan päällä.",
  );

  await page.goto("/#/equipment");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".equipment-actions > summary").click();
  await page.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(page.getByText("Testikohde 4", { exact: true })).toHaveCount(0);
  await page.goto("/#/reports");
  await expect(page.locator(".report-entry")).toContainText("Testikohde 4");
  expect(errors).toEqual([]);
});

test("current result prints with notes without creating a saved record", async ({
  page,
}) => {
  await page.goto("/#/pipe");
  await page
    .getByRole("textbox", { name: "Sisähalkaisija · mm", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Pituus · m", exact: true })
    .fill("10");
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page
    .getByLabel("Muistiinpanot", { exact: true })
    .fill("Mitattu työmaalla.");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const printPage = await popupPromise;
  await expect(printPage.locator("body")).toContainText("Mitattu työmaalla.");
  await expect(printPage.locator("body")).toContainText("20 mm");
  await expect(printPage.locator("body")).toContainText(
    "Lähteet ja versiotiedot",
  );
  await page.goto("/#/reports");
  await expect(
    page.getByText("Tallennetut laskelmat", { exact: true }),
  ).toHaveCount(0);
});
