import { test, expect } from "@playwright/test";

test("Reports discovers a draft after leaving the editor and filters it by site", async ({
  page,
}) => {
  await page.goto("/#/reports");
  await page
    .getByRole("button", { name: "Uusi raportti", exact: true })
    .click();
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Työsali / KEUDA");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  await page
    .getByRole("navigation", { name: "PhaseKit" })
    .getByRole("link", { name: "Raportit" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Raportit", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".field-report-link")).toContainText(
    "Työsali / KEUDA",
  );
  await page
    .getByRole("combobox", { name: "Näytä", exact: true })
    .selectOption("draft");
  await page
    .getByLabel("Hae raporttia, kohdetta tai laitetta")
    .fill("tuntematon");
  await expect(page.locator(".field-report-link")).toHaveCount(0);
  await page.getByLabel("Hae raporttia, kohdetta tai laitetta").fill("keuda");
  await page.locator(".field-report-link").click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Työsali / KEUDA",
  );
  await page.reload();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Työsali / KEUDA",
  );
});

test("old saved route opens the same report catalogue", async ({ page }) => {
  await page.goto("/#/saved");
  await expect(
    page.getByRole("heading", { name: "Raportit", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "PhaseKit" })
      .getByRole("link", { name: "Raportit" }),
  ).toHaveAttribute("aria-current", "page");
});

test("field reports and calculations share newest-first order and one filter", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Aiempi työmaaraportti");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu",
  );
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
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/reports");
  const entries = page.locator(
    ".report-timeline > .field-report-link, .report-timeline > .report-entry",
  );
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText("20 mm");
  await expect(entries.last()).toContainText("Aiempi työmaaraportti");
  await page
    .getByRole("combobox", { name: "Näytä", exact: true })
    .selectOption("draft");
  await expect(entries).toHaveCount(1);
  await expect(entries).toContainText("Aiempi työmaaraportti");
  await page
    .getByRole("combobox", { name: "Näytä", exact: true })
    .selectOption("calculation");
  await expect(entries).toHaveCount(1);
  await expect(entries).toContainText("20 mm");
});
