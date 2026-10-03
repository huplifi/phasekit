import { expect, test } from "@playwright/test";

test("saved calculation keeps its original identity while its equipment link changes", async ({
  page,
}) => {
  await page.goto("/#/equipment");
  for (const name of ["Unit A", "Unit B"]) {
    await page
      .getByRole("button", { name: "Lisää laite", exact: true })
      .click();
    await page.getByLabel("Nimi", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  }

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
    .selectOption({ label: "Unit A" });
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();

  await page.goto("/#/reports");
  const report = page.locator(".report-entry").first();
  await expect(report).toContainText("Unit A");
  await report.click();
  await expect(report).not.toContainText("Alkuperäinen laitenimi");
  await report.getByText("Vaihda laitetta", { exact: true }).click();
  await expect(report).toContainText("Unit A");
  await expect(report).toContainText("20 mm");
  const currentLink = report.getByRole("combobox", {
    name: "Laite",
  });
  await currentLink.selectOption({ label: "Unit B" });
  await expect(currentLink.locator("option:checked")).toHaveText("Unit B");
  await expect(report.locator(".saved-report-header")).toContainText("Unit B");
  await expect(
    report.getByText("Laite: Unit B", { exact: true }),
  ).toBeVisible();
  await expect(report.getByText("Laite: Unit A", { exact: true })).toHaveCount(
    0,
  );
  await expect(report).toContainText("Unit A");

  await page.goto("/#/equipment");
  const unitB = page.locator(".equipment-card", { hasText: "Unit B" });
  await unitB.locator(".equipment-history > summary").click();
  await expect(unitB.locator(".equipment-record-link")).toHaveCount(1);
  await unitB.locator(".equipment-record-link").click();
  await expect(page).toHaveURL(/#\/reports\//);
  const detail = page.locator(
    "article.saved-report-detail.report-entry.saved-entry",
  );
  await expect(detail).toContainText("20 mm");

  await page
    .locator("article.saved-report-detail.report-entry.saved-entry")
    .getByText("Vaihda laitetta", { exact: true })
    .click();
  await page
    .locator("article.saved-report-detail.report-entry.saved-entry")
    .getByRole("combobox", { name: "Laite" })
    .selectOption("");
  await expect(page.locator(".saved-report-header")).toContainText(
    "Ei liitetty",
  );
  await expect(
    page.locator("article.saved-report-detail.report-entry.saved-entry"),
  ).toContainText("Unit A");
  await page.goto("/#/equipment");
  await expect(
    page
      .locator(".equipment-card", { hasText: "Unit B" })
      .locator(".equipment-record-link"),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".equipment-card", { hasText: "Unit A" })
      .locator(".equipment-record-link"),
  ).toHaveCount(0);
});
