import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const result = (page: Page) =>
  page.getByRole("region", { name: "Sähkölaskennan tulos" });
const mode = (page: Page) =>
  page.getByRole("combobox", { name: "Laskenta", exact: true });
const target = (page: Page) =>
  page.getByRole("combobox", { name: "Ratkaise", exact: true });
async function calculate(page: Page) {
  await page.getByRole("button", { name: "Laske", exact: true }).click();
}

test("DC solves current from watts and volts, saves and prints selected result", async ({
  page,
}) => {
  await page.goto("/#/electrical");
  await mode(page).selectOption("dc");
  await target(page).selectOption("current");
  await expect(
    page.getByRole("textbox", { name: "Virta · A", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Jännite · V", exact: true })
    .fill("24");
  await page
    .getByRole("textbox", { name: "Pätöteho · W", exact: true })
    .fill("120");
  await calculate(page);
  await expect(
    result(page).getByRole("heading", { name: "Virta", exact: true }),
  ).toBeVisible();
  await expect(result(page).locator(".field-result-value")).toHaveText("5 A");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(printed.locator(".result-card").first()).toContainText("Virta");
  await expect(printed.locator(".result-card").first()).toContainText("5 A");
  await printed.close();
  await page
    .getByRole("textbox", { name: "Pätöteho · W", exact: true })
    .fill("240");
  await expect(result(page)).toHaveCount(0);
  await expect(page.locator(".report-save")).toHaveCount(0);
  await page.goto("/#/reports");
  await expect(page.getByText(/Sähkölaskuri.*5 A/).first()).toBeVisible();
});

test("AC inverse uses explicit power factor and rejects an indeterminate zero factor", async ({
  page,
}) => {
  await page.goto("/#/electrical");
  await target(page).selectOption("current");
  await page
    .getByRole("textbox", { name: "Jännite · V", exact: true })
    .fill("230");
  await page
    .getByRole("textbox", { name: "Pätöteho · W", exact: true })
    .fill("1840");
  await page
    .getByRole("textbox", { name: "Tehokerroin · 0–1", exact: true })
    .fill("0,8");
  await calculate(page);
  await expect(result(page).locator(".field-result-value")).toHaveText("10 A");
  await expect(result(page)).toContainText(/2\s?300 VA/);
  await page
    .getByRole("textbox", { name: "Tehokerroin · 0–1", exact: true })
    .fill("0");
  await expect(result(page)).toHaveCount(0);
  await calculate(page);
  await expect(page.getByRole("alert")).toContainText(
    "tehokertoimen on oltava yli 0",
  );
  await target(page).selectOption("power");
  await page
    .getByRole("textbox", { name: "Virta · A", exact: true })
    .fill("10");
  await calculate(page);
  await expect(result(page).locator(".field-result-value")).toHaveText("0 W");
  await mode(page).selectOption("three_phase");
  await target(page).selectOption("current");
  await page
    .getByRole("textbox", { name: "Pääjännite · V", exact: true })
    .fill("400");
  await page
    .getByRole("textbox", { name: "Tehokerroin · 0–1", exact: true })
    .fill("0.8");
  await page
    .getByRole("textbox", { name: "Pätöteho · W", exact: true })
    .fill("5542.562584220407");
  await calculate(page);
  await expect(result(page).locator(".field-result-value")).toHaveText("10 A");
});

test("Ohm reverse solves voltage and resistance, hides solved fields and guards zero division", async ({
  page,
}) => {
  await page.goto("/#/electrical");
  await mode(page).selectOption("ohm");
  await expect(target(page)).toHaveValue("current");
  await target(page).selectOption("voltage");
  await expect(
    page.getByRole("textbox", { name: "Jännite · V", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Resistanssi · Ω", exact: true })
    .fill("12");
  await page.getByRole("textbox", { name: "Virta · A", exact: true }).fill("2");
  await calculate(page);
  await expect(result(page).locator(".field-result-value")).toHaveText("24 V");
  await expect(result(page)).toContainText("48 W");
  await target(page).selectOption("resistance");
  await expect(result(page)).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Resistanssi · Ω", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Jännite · V", exact: true })
    .fill("24");
  await calculate(page);
  await expect(result(page).locator(".field-result-value")).toHaveText("12 Ω");
  await page.getByRole("textbox", { name: "Virta · A", exact: true }).fill("0");
  await calculate(page);
  await expect(page.getByRole("alert")).toContainText(
    "virran on oltava nollaa suurempi",
  );
  await mode(page).selectOption("dc");
  await expect(target(page)).toHaveValue("power");
  await expect(result(page)).toHaveCount(0);
});

test("inverse controls and result remain accessible in English at narrow width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/settings");
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page.goto("/#/electrical");
  await page
    .getByRole("combobox", { name: "Calculation", exact: true })
    .selectOption("dc");
  await page
    .getByRole("combobox", { name: "Solve for", exact: true })
    .selectOption("voltage");
  await page
    .getByRole("textbox", { name: "Current · A", exact: true })
    .fill("5");
  await page
    .getByRole("textbox", { name: "Real power · W", exact: true })
    .fill("120");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Electrical result" })
      .locator(".field-result-value"),
  ).toHaveText("24 V");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
