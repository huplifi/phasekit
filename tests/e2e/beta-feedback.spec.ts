import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const theme of ["light", "dark"] as const) {
  test(`beta form alignment and touch controls in ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Kaikki kylmäaineet", exact: true })
      .click();
    await page.locator(".filter-panel > summary").click();
    const filterSelects = page.locator(".filter-panel select");
    const first = await filterSelects.nth(0).boundingBox();
    const second = await filterSelects.nth(1).boundingBox();
    if (!info.project.name.startsWith("mobile")) {
      expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
      const headings = page.locator(".filter-panel .help-heading");
      const a = await headings.nth(0).boundingBox();
      const b = await headings.nth(1).boundingBox();
      expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    }
    await expect(
      page.getByRole("switch", { name: "Varmennettu EU-luokittelu" }),
    ).toBeVisible();
    await page.locator(".filter-panel").screenshot({
      path: test.info().outputPath(`filters-${theme}.png`),
      style: ".main-nav { visibility: hidden; }",
    });
    await page.goto("/#/checklists");
    await page
      .getByRole("button", { name: "Luo raportti", exact: true })
      .click();
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.check();
    await expect(
      page.locator(".field-checklist-save-state > [role=status]"),
    ).toHaveText("Tallennettu automaattisesti tähän selaimeen");
    expect(
      await checkbox.evaluate((el) => getComputedStyle(el).appearance),
    ).toBe("none");
    await page.screenshot({
      path: test.info().outputPath(`checklist-${theme}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}

test("pipe expansion retains contraction and rejects values outside sourced range", async ({
  page,
}) => {
  await page.goto("/#/pipe");
  await page
    .getByRole("button", { name: "Lämpölaajeneminen", exact: true })
    .click();
  const section = page.locator(".field-expansion");
  await section.getByLabel("Vertailupituus · m", { exact: true }).fill("10");
  await section.getByLabel("Alkulämpötila · °C", { exact: true }).fill("80");
  await section.getByLabel("Loppulämpötila · °C", { exact: true }).fill("20");
  await section
    .getByRole("button", { name: "Laske pituuden muutos", exact: true })
    .click();
  await expect(section.locator(".result-card")).toContainText(/[−-]10,152/);
  await section.getByLabel("Loppulämpötila · °C", { exact: true }).fill("-10");
  await expect(section.locator(".result-card")).toHaveCount(0);
  await section
    .getByRole("button", { name: "Laske pituuden muutos", exact: true })
    .click();
  await expect(section.getByRole("alert")).toBeVisible();
});

test("refrigeration power and vacuum conversions are useful without changing pressure reference", async ({
  page,
}) => {
  await page.goto("/#/convert");
  await page
    .getByRole("combobox", { name: "Suure", exact: true })
    .selectOption("power");
  await page.getByLabel("Arvo · Btu_IT/h", { exact: true }).fill("12000");
  await expect(page.locator("output")).toContainText("3,5168532 kW");
  await page
    .getByRole("combobox", { name: "Suure", exact: true })
    .selectOption("vacuum");
  await page.getByLabel("Arvo · µmHg", { exact: true }).fill("500");
  await expect(page.locator("output")).toContainText("66,6612 Pa");
});

test("pipe pressure loss uses explicit fluid properties and rejects transitional flow", async ({
  page,
}) => {
  await page.goto("/#/pipe");
  await page.getByRole("button", { name: "Painehäviö", exact: true }).click();
  const section = page.locator(".field-pipe-loss");
  for (const [label, value] of [
    ["Sisähalkaisija · mm", "20"],
    ["Pituus · m", "10"],
    ["Tilavuusvirta", "0.01"],
    ["Tiheys · kg/m³", "1000"],
    ["Dynaaminen viskositeetti · Pa·s", "0.001"],
    ["Sisäpinnan karheus · mm", "0"],
  ])
    await section
      .getByRole("textbox", { name: label, exact: true })
      .fill(value);
  await section.getByRole("button", { name: "Arvioi painehäviö" }).click();
  await expect(section.locator(".result-card")).toContainText("laminaarinen");
  await expect(section.locator(".result-card")).toContainText("0,025");
  await section
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("0.05");
  await expect(section.locator(".result-card")).toHaveCount(0);
  await section.getByRole("button", { name: "Arvioi painehäviö" }).click();
  await expect(section.getByRole("alert")).toContainText("siirtymäalueella");
});

test("refrigerant details keep context accessible without duplicate metadata or oil zero", async ({
  page,
}, info) => {
  await page.goto("/#/refrigerants/r514a");
  await page.getByRole("tab", { name: "Ominaisuudet", exact: true }).click();
  const panel = page.locator("#detail-panel");
  const composition = panel.locator("section").filter({
    has: page.getByRole("heading", { name: "Koostumus", exact: true }),
  });
  await expect(
    composition.getByRole("link", { name: "R1130(E)", exact: true }),
  ).toHaveAttribute("href", "#/refrigerants/r1130e");
  await expect(composition.locator("dd a")).toHaveCount(0);
  await expect(composition).toContainText("25,3 %");
  const thermo = panel.locator("section").filter({
    has: page.locator(".property-context").filter({ hasText: "28,8 °C" }),
  });
  const method = thermo.getByText(
    "BITZER normal dew minus bubble point at ambient pressure",
    { exact: true },
  );
  await expect(method).toHaveCount(1);
  await expect(method).toBeHidden();
  await expect(
    thermo.locator(".property-context").filter({ hasText: "28,8 °C" }),
  ).toContainText("Neste ja höyry");
  await thermo.locator(".property-background > summary").click();
  await expect(method).toBeVisible();
  await thermo.locator(".property-background > summary").click();
  const oil = panel.locator(".oil-facts");
  await expect(oil.locator("dt")).toHaveText(["Öljytyyppi"]);
  await expect(oil).toContainText("POE");
  expect(
    await oil.evaluate((node) =>
      [...node.childNodes]
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent?.trim())
        .filter(Boolean),
    ),
  ).toEqual([]);
  const environment = panel.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Ympäristö ja sääntely",
      exact: true,
    }),
  });
  await expect(environment.locator(".gwp-heading")).toContainText("GWP");
  const help = environment.locator(".gwp-heading button");
  await help.click();
  await expect(environment.getByRole("tooltip")).toContainText("2024/573");
  await page.keyboard.press("Escape");
  await expect(environment.getByRole("tooltip")).toBeHidden();
  await environment.screenshot({
    path: test.info().outputPath(`detail-environment-${info.project.name}.png`),
    scale: "css",
  });
  await thermo.screenshot({
    path: test.info().outputPath(`detail-thermo-${info.project.name}.png`),
    scale: "css",
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await composition
    .getByRole("link", { name: "R1130(E)", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/refrigerants\/r1130e$/);
  await page.getByRole("tab", { name: "Ominaisuudet", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Koostumus", exact: true }),
  ).toHaveCount(0);
  await expect(panel.getByText("Puhdas aine", { exact: true })).toBeVisible();
});

test("coverage stays in the app and restriction sources are not duplicated", async ({
  page,
}) => {
  await page.goto("/#/refrigerants/r134a");
  await page.getByRole("tab", { name: "Ominaisuudet", exact: true }).click();
  await page.getByRole("link", { name: "Avaa kattavuusraportti" }).click();
  await expect(page).toHaveURL(/#\/coverage\/r134a$/);
  await expect(
    page.getByRole("heading", { name: "Aineiston kattavuus", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "R134a", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".main-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Takaisin", exact: true }).click();
  await expect(page).toHaveURL(/#\/refrigerants\/r134a\/properties$/);
  await expect(
    page.getByRole("tab", { name: "Ominaisuudet", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("link", { name: "Avaa kattavuusraportti" }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Rajoitukset", exact: true }).click();
  const restriction = page
    .locator("details.restriction")
    .filter({ hasText: "Uuden kotitalouskylmälaitteen F-kaasurajoitus" });
  await restriction.locator(":scope > summary").click();
  await restriction.locator(".source-disclosure > summary").click();
  await expect(
    restriction.locator(
      'a[href="https://eur-lex.europa.eu/eli/reg/2024/573/oj"]',
    ),
  ).toHaveCount(1);
  await expect(restriction).toContainText("Tarkistettu");
});
