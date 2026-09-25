import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function choose(page: import("@playwright/test").Page, value: string) {
  const change = page.getByRole("button", { name: /Vaihda kylmäainetta/ });
  if (await change.isVisible()) await change.click();
  const open = page.getByRole("button", {
    name: "Valitse kylmäaine",
    exact: true,
  });
  if (await open.isVisible()) await open.click();
  await page.getByRole("searchbox", { name: "Hae kylmäainetta" }).fill(value);
  await page
    .getByRole("button", {
      name: `Valitse kylmäaine työkalulle ${value}`,
      exact: true,
    })
    .click();
}

test("tools open without a refrigerant; P–T and SHSC retain measurements on fluid changes", async ({
  page,
}) => {
  await page.goto("/#/tools");
  await page
    .getByRole("button", { name: "Paine–lämpötila", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Paine–lämpötila" }),
  ).toBeVisible();
  await choose(page, "R134a");
  await page.getByLabel("Paine", { exact: true }).fill("5");
  await expect(page.getByLabel("Lämpötila", { exact: true })).toHaveValue(
    "15.8",
  );
  await choose(page, "R32");
  await expect(page.getByLabel("Paine", { exact: true })).toHaveValue("5");
  await expect(page.getByLabel("Lämpötila", { exact: true })).not.toHaveValue(
    "15.8",
  );
  await page.goto("/#/shsc/r134a");
  await page.locator("#shsc-lp").fill("5");
  await page.locator("#shsc-suction").fill("25");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".calculator-number")).toHaveCount(2);
  await expect(page.locator(".calculator-number").first()).toContainText("K");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("CO2e and new calculators work after offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/#/co2e/r134a");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByLabel("Massa (kg)")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel("Massa (kg)").fill("10");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".calculator-number")).toContainText("14,3 t CO₂e");
  await page.getByRole("button", {name: "t CO₂e", exact: true}).click();
  await page.getByLabel("t CO₂e", { exact: true }).fill("14,3");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".calculator-number")).toContainText("10 kg");
  await page.goto("/#/pt/r134a");
  await page.reload();
  await page.getByLabel("Paine", { exact: true }).fill("5");
  await expect(page.getByLabel("Lämpötila", { exact: true })).toHaveValue(
    "15.8",
  );
});

test("R514A 26kg calculates, and changing fluid preserves charge but clears result", async ({
  page,
}) => {
  await page.goto("/#/check/r514a");
  await page.getByLabel("Täytös", { exact: true }).fill("26");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  await expect(page.locator(".result-number")).toHaveText("6 kuukauden välein");
  await choose(page, "R134a");
  await expect(page.getByLabel("Täytös", { exact: true })).toHaveValue("26");
  await expect(page.locator(".result-number")).toHaveCount(0);
});

test("unit changes convert measurements and invalid PT remains blocked", async ({
  page,
}) => {
  await page.goto("/#/shsc/r134a");
  await page.locator("#shsc-lp").fill("5");
  await page.locator("#shsc-suction").fill("25");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByLabel("Paineyksikkö").selectOption("psi");
  await expect
    .poll(async () =>
      Number(await page.locator("#shsc-lp").inputValue()),
    )
    .toBeCloseTo(72.5189, 3);
  await expect(page.locator("#shsc-suction")).toHaveValue("25");
  await page.getByLabel("Lämpötilayksikkö").selectOption("F");
  await expect(page.locator("#shsc-suction")).toHaveValue("77");
  await page.locator("#shsc-lp").fill("100000");
  await page.locator("#shsc-hp").fill("200000");
  await page.locator("#shsc-suction").fill("77");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "käyttöalueen ulkopuolella",
  );
  await expect(page.locator(".calculator-number")).toHaveCount(0);
  await page.goto("/#/pt/r514a");
  await expect(
    page.getByText("Tälle aineelle ei ole P–T-aineistoa", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Lämpötila", { exact: true })).toHaveValue("");
});

test("compact provenance, formula, restrictions and comparison remain accessible", async ({
  page,
}, testInfo) => {
  await page.goto("/#/refrigerants/r134a");
  await page.getByRole("tab", { name: "Ominaisuudet", exact: true }).click();
  await expect(page.locator(".chemical-formula sub").first()).toBeVisible();
  await expect(page.locator(".source-disclosure[open]")).toHaveCount(0);
  await page.getByRole("tab", { name: "Rajoitukset", exact: true }).click();
  await expect(page.locator(".restriction")).toHaveCount(6);
  await page.locator(".restriction > summary").first().click();
  await expect(page.locator(".restriction[open]")).toHaveCount(1);
  await page.getByRole("button", { name: "Tulossa", exact: true }).click();
  await expect(page.locator(".restriction-meta").first()).toContainText(
    "Tulossa",
  );
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-restrictions.png`),
    fullPage: true,
  });
  await page.goto("/#/tools");
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-tools.png`),
    fullPage: true,
  });
  await page.goto("/#/shsc/r134a");
  await page.locator("#shsc-lp").fill("5");
  await page.locator("#shsc-suction").fill("25");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-shsc.png`),
    fullPage: true,
  });
});

test("new tool forms work in English dark mode and enlarged text", async ({
  page,
}, testInfo) => {
  await page.goto("/#/settings");
  await page.getByLabel("Kieli").selectOption("en");
  await page.getByLabel("Theme").selectOption("dark");
  await page.goto("/#/pt/r134a");
  await page.getByLabel("Pressure", { exact: true }).fill("5");
  await expect(page.getByLabel("Temperature", { exact: true })).toHaveValue(
    "15.8",
  );
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-pt-dark.png`),
    fullPage: true,
  });
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await page.goto("/#/refrigerants/r134a");
  await page.getByRole("tab", { name: "Restrictions", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
});

test("empty tool picker stays closed and removed-favourite notification expires", async ({
  page,
}) => {
  await page.goto("/#/check");
  await expect(
    page.getByRole("button", { name: "Valitse kylmäaine", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".picker-result")).toHaveCount(0);
  await expect(page.getByLabel("Täytös", { exact: true })).toBeVisible();
  await choose(page, "R134a");
  await expect(page.locator(".picker-result")).toHaveCount(0);
  await page.goto("/#/refrigerants/r134a");
  await page
    .getByRole("button", { name: "Lisää R134a suosikkeihin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Poista R134a suosikeista", exact: true })
    .click();
  await expect(page.locator(".undo-toast")).toContainText("Suosikki poistettu");
  await expect(page.locator(".undo-toast")).toBeHidden({ timeout: 6500 });
});

test("transparent logos follow theme and are cached for offline use", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/#/settings");
  await page.getByLabel("Teema").selectOption("light");
  await expect(page.locator(".brand-header img")).toHaveAttribute(
    "src",
    "/phasekit-logo-light.svg",
  );
  await expect(page.locator("#phasekit-theme-favicon")).toHaveAttribute(
    "href",
    "/phasekit-logo-light.svg",
  );
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-logo-light.png`),
    fullPage: true,
  });
  await page.getByLabel("Teema").selectOption("dark");
  await expect(page.locator(".brand-header img")).toHaveAttribute(
    "src",
    "/phasekit-logo-dark.svg",
  );
  await expect(page.locator("#phasekit-theme-favicon")).toHaveAttribute(
    "href",
    "/phasekit-logo-dark.svg",
  );
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-logo-dark.png`),
    fullPage: true,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".brand-header img")).toHaveAttribute(
    "src",
    "/phasekit-logo-dark.svg",
  );
  await expect
    .poll(() =>
      page
        .locator(".brand-header img")
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByLabel("Teema").selectOption("light");
  await expect(page.locator(".brand-header img")).toHaveAttribute(
    "src",
    "/phasekit-logo-light.svg",
  );
  await expect
    .poll(() =>
      page
        .locator(".brand-header img")
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
});

test("comparison can be populated directly from Tools", async ({ page }) => {
  await page.goto("/#/tools");
  await page.getByRole("button", { name: "Vertaa", exact: true }).click();
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "Valitse kylmäaine",
    exact: true,
  });
  await search.fill("R134a");
  await page
    .getByRole("button", { name: "Lisää vertailuun R134a", exact: true })
    .click();
  await search.fill("R32");
  await page
    .getByRole("button", { name: "Lisää vertailuun R32", exact: true })
    .click();
  await expect(page.locator(".compare-table")).toContainText("R134a");
  await expect(page.locator(".compare-table")).toContainText("R32");
  await expect(search).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Työkalut", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("EU GWP defaults include ODS and reset correctly when the fluid changes", async ({
  page,
}) => {
  await page.goto("/#/co2e/r11");
  await expect(
    page.getByLabel("GWP-laskentaperuste", { exact: true }),
  ).toHaveValue("gwp_eu_2024_590_100yr");
  await page.getByLabel("Massa (kg)").fill("1");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".calculator-number")).toContainText("5,56 t CO₂e");
  await expect(page.locator(".calculator-result")).toContainText("GWP 5 560");
  await choose(page, "R134a");
  await expect(
    page.getByLabel("GWP-laskentaperuste", { exact: true }),
  ).toHaveValue("gwp_eu_2024_573_100yr");
  await expect(page.locator(".calculator-number")).toHaveCount(0);
  await choose(page, "R1123");
  await expect(
    page.getByLabel("GWP-laskentaperuste", { exact: true }),
  ).toHaveValue("");
});

test("field help works by touch and keyboard; charge and unit have matching heights", async ({
  page,
}, testInfo) => {
  await page.goto("/#/check");
  const charge = await page.getByLabel("Täytös", { exact: true }).boundingBox();
  const unit = await page
    .getByRole("combobox", { name: "Yksikkö", exact: true })
    .boundingBox();
  expect(Math.abs(charge!.height - unit!.height)).toBeLessThanOrEqual(1);
  const help = page.getByRole("button", {
    name: "Lisätietoa: Laitetyyppi",
    exact: true,
  });
  await help.click();
  await expect(page.getByRole("tooltip")).toContainText("laitetyypistä");
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-help.png`),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(help).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v2-${testInfo.project.name}-check.png`),
    fullPage: true,
  });
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Lisätietoa: Sääntöalue", exact: true })
    .click();
  await expect(page.getByRole("tooltip")).toContainText("EU / Suomi");
});
