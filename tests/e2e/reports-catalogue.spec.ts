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
