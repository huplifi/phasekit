import { expect, test } from "@playwright/test";

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
  await page.getByLabel("Sisähalkaisija · mm", { exact: true }).fill("20");
  await page.getByLabel("Pituus · m", { exact: true }).fill("10");
  await page.getByLabel("Tilavuusvirta", { exact: true }).fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.getByText("Tallenna laskelma", { exact: true }).click();
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

  await page.goto("/#/saved");
  const report = page.locator(".report-entry");
  await report.getByText("Putken tilavuus ja virtaus", { exact: true }).click();
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
  const popupPromise = page.waitForEvent("popup");
  await report
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
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
  await page.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(page.getByText("Testikohde 4", { exact: true })).toHaveCount(0);
  await page.goto("/#/saved");
  await expect(page.locator(".report-entry")).toContainText("Testikohde 4");
  expect(errors).toEqual([]);
});
