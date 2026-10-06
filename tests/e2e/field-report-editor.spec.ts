import {
  completeExternalCertificate,
  openReportSection,
} from "./helpers/commissioning";
import { expect, test } from "@playwright/test";

test("field report survives reload and finalisation preserves the original revision", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Työsali / KEUDA");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("Samu Hupli");
  await page.getByLabel("Pitokokeen alkupaine", { exact: true }).fill("1");
  await page.getByLabel("Pitokokeen loppupaine", { exact: true }).fill("2,3");
  await page.getByLabel("Pitokokeen kesto · min", { exact: true }).fill("15");
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  const originalUrl = page.url();
  await page.reload();
  await expect(
    page.getByLabel("Pitokokeen loppupaine", { exact: true }),
  ).toHaveValue("2,3");
  await page.getByRole("button", { name: "Lukitse raportti" }).click();
  await expect(
    page.getByLabel("Pitokokeen loppupaine", { exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  await page.getByRole("button", { name: "Luo uusi versio" }).click();
  await expect(page).not.toHaveURL(originalUrl);
  await page.getByLabel("Pitokokeen loppupaine", { exact: true }).fill("2,4");
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  await page.goto(originalUrl);
  await expect(
    page.getByLabel("Pitokokeen loppupaine", { exact: true }),
  ).toHaveValue("2,3");
  await expect(
    page.getByLabel("Pitokokeen loppupaine", { exact: true }),
  ).toBeDisabled();
});

test("unfinished reports save but require identifying fields before finalisation", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  await page.getByRole("button", { name: "Lukitse raportti" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Täytä kohteen nimi, suorituspäivä ja tekijä",
  );
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toBeEnabled();
});

test("commissioning cycle remains frozen through notes and finalisation", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Commissioning test");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("Test technician");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("SN-123");
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  await page
    .getByPlaceholder("R-numero, nimi, CAS tai kauppanimi")
    .fill("R134a");
  await page
    .getByRole("button", {
      name: "Valitse kylmäaine työkalulle R134a",
      exact: true,
    })
    .click();
  await page.getByLabel("Täyttömäärä · kg", { exact: true }).fill("2");
  await page
    .getByRole("combobox", { name: "Paineviite", exact: true })
    .selectOption("absolute");
  await page.getByLabel("LP · imupaine", { exact: true }).fill("2.5");
  await page.getByLabel("HP · korkeapaine", { exact: true }).fill("10");
  await page.getByLabel("Imukaasun lämpötila · °C", { exact: true }).fill("10");
  await page
    .getByLabel("Kuumakaasun lämpötila · °C", { exact: true })
    .fill("70");
  await page.getByLabel("Nesteen lämpötila · °C", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Muodosta log(p)–h-kaavio" }).click();
  const chart = page.locator(".field-report-cycle img");
  await expect(chart).toBeVisible();
  const frozenSrc = await chart.getAttribute("src");
  await page
    .getByLabel("Havainnot ja muistiinpanot", { exact: true })
    .fill("Ready for handover");
  await expect(chart).toHaveAttribute("src", frozenSrc!);
  await completeExternalCertificate(page);
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  await page.getByRole("button", { name: "Lukitse raportti" }).click();
  await expect(chart).toHaveAttribute("src", frozenSrc!);
  await page.getByRole("button", { name: "Luo uusi versio" }).click();
  const revisedDeclaration = page.getByRole("checkbox", {
    name: "Toiminnanharjoittajan vakuutus",
    exact: true,
  });
  // The editor preserves disclosure state when switching to the new revision.
  if (!(await revisedDeclaration.isVisible())) {
    await openReportSection(page, "Painekoe, asiakirjat ja vakuutus");
  }
  await expect(revisedDeclaration).not.toBeChecked();
  await page.getByLabel("LP · imupaine", { exact: true }).fill("3.1");
  await expect(chart).toHaveCount(0);
});

test("commissioning retains air temperatures and finalises without a liquid reading or chart", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("ILP / testikohde");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("ILP-TEST-1");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-10-06");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testiasentaja");
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
  await page.getByLabel("Täyttömäärä · kg", { exact: true }).fill("1");
  for (const name of ["Ulkolämpötila · °C", "Sisälämpötila · °C"])
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      "inputmode",
      "text",
    );
  await page.getByLabel("Ulkolämpötila · °C", { exact: true }).fill("-7,5");
  await page.getByLabel("Sisälämpötila · °C", { exact: true }).fill("21");
  await page
    .getByRole("button", { name: "Muodosta log(p)–h-kaavio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "voit tehdä raportin ilman kaaviota",
  );
  await expect(page.locator(".field-report-cycle")).toHaveCount(0);
  await completeExternalCertificate(page);
  await openReportSection(page, "Koekäyttö");
  await page
    .locator("#report-field-testRunRecordMode select")
    .selectOption("internal");
  await page
    .getByLabel("Käyttöolosuhteet ja kuormitus", { exact: true })
    .fill("Lämmityskäyttö, puhallus valmistajan ohjeen mukaan");
  await page
    .getByLabel("Koekäytön mittaukset olosuhteineen", { exact: true })
    .fill("Puhallusilma 38 °C. Nesteputken lämpötila ei mitattavissa.");
  await page
    .locator("#report-field-testRunFinding textarea")
    .fill("Koekäyttö kirjattu; kaaviota ei muodostettu.");
  await page
    .getByRole("checkbox", {
      name: "Toiminnanharjoittajan vakuutus",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Lukitse raportti", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Luo uusi versio", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Ulkolämpötila · °C", { exact: true }),
  ).toHaveValue("-7,5");
  await expect(
    page.getByLabel("Sisälämpötila · °C", { exact: true }),
  ).toHaveValue("21");
  await expect(
    page.getByLabel("Nesteen lämpötila · °C", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".field-report-cycle")).toHaveCount(0);
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const printed = await pending;
  await expect(printed.locator("body")).toContainText("Ulkolämpötila");
  await expect(printed.locator("body")).toContainText("Sisälämpötila");
  await expect(printed.locator("body")).toContainText("21 °C");
  expect(
    (await printed.locator("body").innerText()).replaceAll("−", "-"),
  ).toContain("-7,5 °C");
  await expect(printed.locator("img.chart")).toHaveCount(0);
  await expect(printed.locator("body")).toContainText("tietokentät täytetty");
});
