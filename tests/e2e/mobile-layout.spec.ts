import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("compact cycle keeps units aligned and pressures side by side", async ({
  page,
}, info) => {
  await page.goto("/#/ph/r134a");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.fonts.ready);
  const lp = (await page.locator("#shsc-lp").boundingBox())!;
  const hp = (await page.locator("#shsc-hp").boundingBox())!;
  expect(Math.abs(lp.y - hp.y)).toBeLessThan(1);
  expect(lp.x + lp.width).toBeLessThan(hp.x);
  if (info.project.name.startsWith("mobile")) {
    const units = await page.locator(".shsc-unit-settings select").all();
    const a = (await units[0].boundingBox())!;
    const b = (await units[1].boundingBox())!;
    expect(Math.abs(a.x + a.width - b.x - b.width)).toBeLessThan(1);
    const suction = (await page.locator("#shsc-suction").boundingBox())!;
    const liquid = (await page.locator("#shsc-liquid").boundingBox())!;
    expect(liquid.y - suction.y).toBeLessThan(150);
  } else {
    const temperatures = await page.locator(".shsc-temperatures input").all();
    const rectangles = await Promise.all(
      temperatures.map((input) => input.boundingBox()),
    );
    for (const rectangle of rectangles) {
      expect(Math.abs(rectangle!.y - rectangles[0]!.y)).toBeLessThan(1);
      expect(rectangle!.height).toBe(rectangles[0]!.height);
    }
  }
  await noOverflow(page);
  await page.screenshot({
    path: test
      .info()
      .outputPath(`phasekit-compact-cycle-${info.project.name}.png`),
    fullPage: true,
  });
});

test("native selects match form fields and backup actions share their corners", async ({
  page,
}) => {
  await page.goto("/#/check/r134a");
  const charge = (await page.locator(".charge-grid input").boundingBox())!;
  for (const selector of [
    ".charge-grid select",
    "#check-equipment",
    "#check-date",
  ]) {
    const control = (await page.locator(selector).boundingBox())!;
    expect(Math.abs(control.height - charge.height)).toBeLessThan(1);
  }
  await page.locator(".charge-grid select").selectOption("g");
  await expect(page.locator(".charge-grid select")).toHaveValue("g");
  await page.goto("/#/settings");
  for (const select of await page.locator(".settings-fields select").all()) {
    expect((await select.boundingBox())!.height).toBe(50);
  }
  const radii = await page
    .locator(".settings-actions .secondary-button")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).borderRadius),
    );
  expect(radii).toEqual(["8px", "8px"]);
  await page.getByRole("combobox", { name: /^Kieli/ }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: /^Theme/ }).selectOption("light");
  await noOverflow(page);
});

test("date input fits the form and remains editable at narrow widths", async ({
  page,
}, info) => {
  await page.goto("/#/check/r134a");
  const date = page.locator("#check-date");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await date.fill("2027-02-15");
    await expect(date).toHaveValue("2027-02-15");
    const rect = (await date.boundingBox())!;
    const parent = (await date.locator("..").boundingBox())!;
    expect(rect.x + rect.width).toBeLessThanOrEqual(
      parent.x + parent.width + 1,
    );
    await noOverflow(page);
  }
  await page.screenshot({
    path: test.info().outputPath(`phasekit-date-${info.project.name}.png`),
    fullPage: true,
  });
});

test("picker preserves the touch list and desktop search focus", async ({
  page,
}, info) => {
  await page.goto("/#/pt/r134a");
  const trigger = page.getByRole("button", { name: /Vaihda kylmäainetta/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("searchbox");
  if (info.project.name.startsWith("mobile")) {
    await expect(search).not.toBeFocused();
    await expect(
      dialog.getByRole("button", { name: "Sulje kylmäainevalinta" }),
    ).toBeFocused();
  } else await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("autocomplete", "off");
  await expect(search).toHaveAttribute("autocapitalize", "none");
  await search.click();
  await search.fill("R32");
  await dialog
    .getByRole("button", {
      name: "Valitse kylmäaine työkalulle R32",
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("R32");
});

test("PT arrows share the input centre and redundant slider is gone", async ({
  page,
}, info) => {
  await page.goto("/#/pt/r134a");
  await page.getByLabel("Lämpötila", { exact: true }).fill("60");
  await expect(page.getByLabel("Paine", { exact: true })).not.toHaveValue("");
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const input = (await page.locator("#pt-pressure").boundingBox())!;
  const arrow = (await page.locator(".pt-relation").boundingBox())!;
  expect(
    Math.abs(input.y + input.height / 2 - arrow.y - arrow.height / 2),
  ).toBeLessThan(1);
  await page.getByLabel("Paine", { exact: true }).fill("5");
  await expect(page.getByLabel("Lämpötila", { exact: true })).toHaveValue(
    "15.8",
  );
  await noOverflow(page);
  await page.screenshot({
    path: test
      .info()
      .outputPath(`phasekit-compact-pt-${info.project.name}.png`),
    fullPage: true,
  });
});

test("CO2e quantity and calculation fit initially with contextual help", async ({
  page,
}, info) => {
  await page.goto("/#/co2e/r134a");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("combobox", { name: "Laskentasuunta" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tooltip").filter({ hasText: "Muunnos kuvaa" }),
  ).toBeHidden();
  const calculate = page.getByRole("button", { name: "Laske", exact: true });
  const button = (await calculate.boundingBox())!;
  const nav = (await page.locator(".main-nav").boundingBox())!;
  expect(button.y + button.height).toBeLessThanOrEqual(nav.y);
  await page.getByLabel("Massa (kg)", { exact: true }).fill("10");
  await calculate.click();
  await expect(page.locator(".calculator-number")).toHaveText("14,3 t CO₂e");
  await page.getByRole("button", { name: "t CO₂e", exact: true }).click();
  await expect(page.locator(".calculator-number")).toHaveCount(0);
  await page.getByLabel("t CO₂e", { exact: true }).fill("14,3");
  await calculate.click();
  await expect(page.locator(".calculator-number")).toHaveText("10 kg");
  await page
    .getByRole("button", { name: "Lisätietoa: CO₂e-muunnos", exact: true })
    .click();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "Muunnos kuvaa" }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await noOverflow(page);
  await page.screenshot({
    path: test
      .info()
      .outputPath(`phasekit-compact-co2e-${info.project.name}.png`),
    fullPage: true,
  });
});

test("all report date controls fit their labelled container on narrow screens", async ({
  page,
}) => {
  await page.goto("/#/checklists/new");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  const date = page.getByLabel("Suorituspäivä", { exact: true });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await date.fill("2026-09-26");
    await expect(date).toHaveValue("2026-09-26");
    const rect = (await date.boundingBox())!;
    const parent = (await date.locator("..").boundingBox())!;
    expect(rect.x + rect.width).toBeLessThanOrEqual(
      parent.x + parent.width + 1,
    );
    expect(await date.evaluate((el) => getComputedStyle(el).appearance)).toBe(
      "none",
    );
    await noOverflow(page);
  }
});

test("equipment empty state keeps inset space and report guidance is subordinate", async ({
  page,
}) => {
  await page.goto("/#/equipment");
  const card = page.locator(".equipment-empty");
  const cardBox = (await card.boundingBox())!;
  const heading = (await card.locator("h2").boundingBox())!;
  expect(heading.x - cardBox.x).toBeGreaterThanOrEqual(20);
  await page.goto("/#/reports");
  const actions = (await page.locator(".reports-actions").boundingBox())!;
  const guidance = page.locator(".reports-header > .supporting-copy");
  const box = (await guidance.boundingBox())!;
  expect(box.y - actions.y - actions.height).toBeGreaterThanOrEqual(12);
  expect(
    await guidance.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeLessThanOrEqual(14);
});
