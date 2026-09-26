import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("preview tools remain reachable in English offline, with narrow-screen labels and accessible forms", async ({
  page,
  context,
}) => {
  await page.goto("/#/settings");
  await page.getByRole("combobox", { name: /^Kieli/ }).selectOption("en");
  await page.getByRole("combobox", { name: /^Theme/ }).selectOption("light");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  const routes = [
    ["convert", "Unit converter"],
    ["thermal-power", "Liquid thermal power"],
    ["electrical", "Electrical calculator"],
    ["pipe", "Pipe calculators"],
    ["checklists", "Work checklists"],
    ["equipment", "Equipment and sites"],
  ] as const;
  for (const [route, title] of routes) {
    await page.goto(`/#/${route}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.goto("/#/convert");
  await page
    .getByRole("combobox", { name: "Quantity", exact: true })
    .selectOption("temperature");
  await page
    .getByRole("combobox", { name: "From unit", exact: true })
    .selectOption("°C");
  await page
    .getByRole("combobox", { name: "To unit", exact: true })
    .selectOption("°F");
  await page
    .getByRole("textbox", { name: "Value · °C", exact: true })
    .fill("-40");
  await expect(page.locator("output")).toHaveText("-40 °F");
  await page.screenshot({
    path: test.info().outputPath("offline-converter-en.png"),
    fullPage: true,
  });
  await context.setOffline(false);
});
