import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fillCycle(page: Page) {
  await page.locator("#shsc-lp").fill("2.5");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-suction").fill("10");
  await page.locator("#shsc-hot-gas").fill("70");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
}

test("log(p)-h plots a sourced R134a cycle and clears it after changed or invalid measurements", async ({
  page,
}, info) => {
  await page.goto("/#/tools");
  await page.getByRole("button", { name: "Kylmäkierto", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kylmäkierto" }),
  ).toBeVisible();
  await page.goto("/#/ph/r134a");
  await fillCycle(page);
  await expect(page.locator(".calculator-result")).toContainText("14");
  await expect(page.locator(".calculator-result")).toContainText("Tulistus");
  await expect(page.locator(".calculator-result")).toContainText(
    "Alijäähdytys",
  );
  await expect(page.locator('svg[role="img"]')).toBeVisible();
  await expect(page.locator(".ph-cycle")).toHaveCount(4);
  await expect(page.locator(".ph-pressure-guide")).toHaveCount(2);
  expect(await page.locator(".ph-isoline-temperature").count()).toBeGreaterThan(
    0,
  );
  await page.getByRole("button", { name: /Entropia s/ }).click();
  expect(await page.locator(".ph-isoline-entropy").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Ominaistilavuus v/ }).click();
  expect(await page.locator(".ph-isoline-volume").count()).toBeGreaterThan(0);
  const segments = await page
    .locator(".ph-cycle")
    .evaluateAll((lines) =>
      lines.map((line) =>
        ["x1", "y1", "x2", "y2"].map((attr) => Number(line.getAttribute(attr))),
      ),
    );
  expect(segments[0][2]).toBeGreaterThan(segments[0][0]); // Imu → kuumakaasu
  expect(segments[0][3]).toBeLessThan(segments[0][1]);
  expect(segments[1][1]).toBe(segments[1][3]); // High pressure
  expect(segments[2][0]).toBe(segments[2][2]); // h3 = h4
  expect(segments[3][1]).toBe(segments[3][3]); // Low pressure
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v3-${info.project.name}-ph.png`),
    fullPage: true,
  });
  await page
    .locator(".ph-diagram-section")
    .screenshot({
      path: test
        .info()
        .outputPath(`phasekit-v3-${info.project.name}-ph-chart.png`),
    });
  for (const id of ["shsc-suction", "shsc-hot-gas", "shsc-liquid"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("inputmode", "text");
  }
  await page.locator("#shsc-suction").fill("-1,5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-results")).toBeVisible();
  await expect(page.locator(".ph-point-table")).toContainText("−1,5");
  await page.locator("#shsc-hot-gas").fill("200");
  await expect(page.locator(".ph-results")).toHaveCount(0);
  await expect(page.locator(".ph-cycle")).toHaveCount(0);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-diagram-message")).toBeVisible();
  await expect(page.locator(".ph-cycle")).toHaveCount(0);
  await page.locator("#shsc-hot-gas").fill("60");
  await page.locator("#shsc-liquid").fill("39.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-diagram-message")).toContainText("T3 · Neste");
  await expect(page.locator(".ph-diagram-message")).toContainText("10 bar(a)");
  await expect(page.locator(".ph-diagram-message")).toContainText("kuplapiste");
  await expect(page.locator(".ph-diagram-message")).toContainText(
    "ei ole laitteen toimintavaatimus",
  );
});

test("log(p)-h survives offline reload, converts units, and rejects unavailable fluid", async ({
  page,
  context,
}) => {
  await page.goto("/#/ph/r134a");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator("#shsc-suction")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await fillCycle(page);
  await expect(page.locator(".ph-results")).toBeVisible();
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).uncheck();
  await expect
    .poll(async () => Number(await page.locator("#shsc-lp").inputValue()))
    .toBeCloseTo(1.48675, 4);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-results")).toBeVisible();
  const gaugeReading = await page.locator("#shsc-lp").inputValue();
  await page.locator("#cycle-atmosphere").fill("1.0");
  await expect(page.locator("#shsc-lp")).toHaveValue(gaugeReading);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-results")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Lämpötilayksikkö", exact: true })
    .selectOption("F");
  await expect(page.locator("#shsc-suction")).toHaveValue("50");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-results")).toBeVisible();
  await page.goto("/#/ph/r514a");
  await expect(page.locator(".ph-results")).toHaveCount(0);
  await expect(
    page.getByText(
      /ei ole.*(?:entalpia|p–h|log\(p\)–h)|(?:entalpia|p–h).*ei ole/i,
    ),
  ).toBeVisible();
});

test("log(p)-h is readable in English dark mode and enlarged text", async ({
  page,
}, info) => {
  await page.goto("/#/settings");
  await page.getByLabel("Kieli").selectOption("en");
  await page.getByLabel("Theme").selectOption("dark");
  await page.goto("/#/ph/r134a");
  await page.locator("#shsc-lp").fill("2.5");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-suction").fill("10");
  await page.locator("#shsc-hot-gas").fill("70");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator(".calculator-result")).toContainText("Superheat");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: test
      .info()
      .outputPath(`phasekit-v3-${info.project.name}-ph-dark.png`),
    fullPage: true,
  });
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
});
