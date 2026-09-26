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

  await page.goto("/#/saved");
  const report = page.locator(".report-entry").first();
  await expect(report.locator("summary")).toContainText(
    "Nykyinen laite: Unit A",
  );
  await report.locator("summary").click();
  await expect(report).toContainText("Alkuperäinen laitenimi");
  await expect(report).toContainText("Unit A");
  await expect(report).toContainText("20 mm");
  const currentLink = report.getByRole("combobox", {
    name: "Nykyinen laitelinkki",
  });
  await currentLink.selectOption({ label: "Unit B" });
  await expect(currentLink.locator("option:checked")).toHaveText("Unit B");
  await expect(report.locator("summary")).toContainText(
    "Nykyinen laite: Unit B",
  );
  await expect(report.locator("summary")).not.toContainText("Unit A");
  await expect(report).toContainText("Unit A");

  await page.goto("/#/equipment");
  const unitB = page.locator(".equipment-card", { hasText: "Unit B" });
  await expect(unitB.locator(".equipment-record-link")).toHaveCount(1);
  await unitB.locator(".equipment-record-link").click();
  await expect(page).toHaveURL(/#\/saved\//);
  await expect(page.locator(".report-entry[open]")).toContainText("20 mm");

  await page
    .locator(".report-entry[open]")
    .getByRole("combobox", { name: "Nykyinen laitelinkki" })
    .selectOption("");
  await expect(page.locator(".report-entry[open] summary")).toContainText(
    "Ei liitetty",
  );
  await expect(page.locator(".report-entry[open]")).toContainText("Unit A");
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
