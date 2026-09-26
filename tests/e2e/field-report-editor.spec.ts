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
  await page
    .getByRole("button", { name: "Merkitse raportti valmiiksi" })
    .click();
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
  await page
    .getByRole("button", { name: "Merkitse raportti valmiiksi" })
    .click();
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
  await page.getByText("Asentaja ja vastuuhenkilö", { exact: true }).click();
  await page.getByLabel("Asennusliike", { exact: true }).fill("Test Company");
  await page.getByLabel("Asentajan lupanumero", { exact: true }).fill("INST-1");
  await page
    .getByLabel("Vastuuhenkilön nimi", { exact: true })
    .fill("Responsible person");
  await page
    .getByLabel("Vastuuhenkilön lupanumero", { exact: true })
    .fill("RESP-1");
  await page.getByText("Koepöytäkirjat ja vakuutus", { exact: true }).click();
  await page
    .getByLabel("Lakisääteinen vuototarkastusväli ja peruste", { exact: true })
    .fill("Documented assessment");
  await page
    .getByRole("combobox", {
      name: "Edellyttääkö painelaitesääntely painekoetta?",
      exact: true,
    })
    .selectOption("no");
  await page
    .getByLabel("Peruste sille, ettei painekoetta edellytetä", { exact: true })
    .fill("Documented equipment assessment");
  await page
    .getByLabel("Tiiviyskoepöytäkirjan viite / liite", { exact: true })
    .fill("Annex T-1");
  await page
    .getByLabel("Tyhjiöintipöytäkirjan viite / liite", { exact: true })
    .fill("Annex V-1");
  await page
    .getByLabel("Koekäyttöpöytäkirjan viite / liite", { exact: true })
    .fill("Annex R-1");

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
    .getByLabel("Muistiinpanot", { exact: true })
    .fill("Ready for handover");
  await expect(chart).toHaveAttribute("src", frozenSrc!);
  await page
    .getByLabel("Lakisääteinen vuototarkastusväli ja peruste", { exact: true })
    .fill("Documented final assessment");
  await page
    .getByRole("combobox", {
      name: "Edellyttääkö painelaitesääntely painekoetta?",
      exact: true,
    })
    .selectOption("no");
  await page
    .getByRole("checkbox", {
      name: "Toiminnanharjoittajan vakuutus",
      exact: true,
    })
    .check();
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  await page
    .getByRole("button", { name: "Merkitse raportti valmiiksi" })
    .click();
  await expect(chart).toHaveAttribute("src", frozenSrc!);
  await page.getByRole("button", { name: "Luo uusi versio" }).click();
  const revisedDeclaration = page.getByRole("checkbox", {
    name: "Toiminnanharjoittajan vakuutus",
    exact: true,
  });
  // The editor preserves disclosure state when switching to the new revision.
  if (!(await revisedDeclaration.isVisible())) {
    await page.getByText("Koepöytäkirjat ja vakuutus", { exact: true }).click();
  }
  await expect(revisedDeclaration).not.toBeChecked();
  await page.getByLabel("LP · imupaine", { exact: true }).fill("3.1");
  await expect(chart).toHaveCount(0);
});
