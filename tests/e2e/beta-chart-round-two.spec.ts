import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function calculateR134aCycle(page: Page) {
  await page.goto("/#/ph/r134a");
  await page.locator("#shsc-lp").fill("2.5");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-suction").fill("10");
  await page.locator("#shsc-hot-gas").fill("70");
  await page.locator("#shsc-liquid").fill("25");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-cycle")).toHaveCount(4);
}

async function pointExtent(page: Page) {
  return page.locator(".ph-point").evaluateAll((points) => {
    const x = points.map((point) => Number(point.getAttribute("cx")));
    const y = points.map((point) => Number(point.getAttribute("cy")));
    return {
      width: Math.max(...x) - Math.min(...x),
      height: Math.max(...y) - Math.min(...y),
      centreX: (Math.min(...x) + Math.max(...x)) / 2,
      centreY: (Math.min(...y) + Math.max(...y)) / 2,
    };
  });
}

async function plotRect(page: Page) {
  return page.locator(".ph-chart defs rect").evaluate((rect) => ({
    x: Number(rect.getAttribute("x")),
    y: Number(rect.getAttribute("y")),
    width: Number(rect.getAttribute("width")),
    height: Number(rect.getAttribute("height")),
  }));
}

test("cycle fit centres only the four calculated points and guide controls remain independent", async ({
  page,
}) => {
  await calculateR134aCycle(page);
  const fit = page.getByRole("switch", {
    name: "Sovita kiertoon",
    exact: true,
  });
  await expect(fit).not.toBeChecked();
  const fullExtent = await pointExtent(page);
  await fit.check();
  await expect(fit).toBeChecked();
  const fitExtent = await pointExtent(page);
  const plot = await plotRect(page);
  expect(fitExtent.width).toBeGreaterThan(plot.width * 0.75);
  expect(fitExtent.height).toBeGreaterThan(plot.height * 0.75);
  expect(Math.abs(fitExtent.centreX - (plot.x + plot.width / 2))).toBeLessThan(
    plot.width * 0.04,
  );
  expect(Math.abs(fitExtent.centreY - (plot.y + plot.height / 2))).toBeLessThan(
    plot.height * 0.04,
  );
  expect(fitExtent.width).toBeGreaterThan(fullExtent.width);

  const temperature = page.getByRole("button", { name: /Lämpötila T/ });
  const entropy = page.getByRole("button", { name: /Entropia s/ });
  const volume = page.getByRole("button", { name: /Ominaistilavuus v/ });
  await expect(temperature).toHaveAttribute("aria-pressed", "true");
  await expect(entropy).toHaveAttribute("aria-pressed", "false");
  await expect(volume).toHaveAttribute("aria-pressed", "false");
  const activeColour = await temperature.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  const inactiveColour = await entropy.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  expect(activeColour).not.toBe(inactiveColour);

  await entropy.click();
  await volume.click();
  await expect(temperature).toHaveAttribute("aria-pressed", "true");
  await expect(entropy).toHaveAttribute("aria-pressed", "true");
  await expect(volume).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ph-isoline-temperature")).not.toHaveCount(0);
  await expect(page.locator(".ph-isoline-entropy")).not.toHaveCount(0);
  await expect(page.locator(".ph-isoline-volume")).not.toHaveCount(0);
  await temperature.click();
  await expect(temperature).toHaveAttribute("aria-pressed", "false");
  await expect(entropy).toHaveAttribute("aria-pressed", "true");
  await expect(volume).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ph-isoline-temperature")).toHaveCount(0);
});

test("390px chart shows all four cycle points and readable labels without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await calculateR134aCycle(page);
  await page
    .getByRole("switch", { name: "Sovita kiertoon", exact: true })
    .check();
  await expect(page.locator(".ph-point")).toHaveCount(4);
  const plot = await plotRect(page);
  const extent = await pointExtent(page);
  expect(extent.centreX - extent.width / 2).toBeGreaterThan(plot.x);
  expect(extent.centreX + extent.width / 2).toBeLessThan(plot.x + plot.width);
  expect(extent.centreY - extent.height / 2).toBeGreaterThan(plot.y);
  expect(extent.centreY + extent.height / 2).toBeLessThan(plot.y + plot.height);
  const dimensions = await page
    .locator(".ph-chart-scroll")
    .evaluate((container) => {
      const svg = container.querySelector("svg")!;
      return {
        containerWidth: container.clientWidth,
        scrollWidth: container.scrollWidth,
        svgWidth: svg.getBoundingClientRect().width,
        viewBoxWidth: svg.viewBox.baseVal.width,
        labelHeight: svg
          .querySelector(".ph-point-label")!
          .getBoundingClientRect().height,
      };
    });
  expect(dimensions.viewBoxWidth).toBeLessThan(560);
  expect(dimensions.svgWidth).toBeLessThanOrEqual(
    dimensions.containerWidth + 1,
  );
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.containerWidth + 1,
  );
  expect(dimensions.labelHeight).toBeGreaterThan(12);
  expect(
    await page.locator('.ph-tick[text-anchor="middle"]').count(),
  ).toBeGreaterThanOrEqual(2);
});

test("fit switch is explained until a cycle exists, and all selected guide labels clear point labels", async ({
  page,
}) => {
  await page.goto("/#/ph/r134a");
  const fit = page.getByRole("switch", { name: "Sovita kiertoon" });
  await expect(fit).toBeDisabled();
  await expect(fit).not.toBeChecked();
  await expect(page.locator("#ph-fit-unavailable")).toContainText(
    "Laske kelvollinen kierto",
  );
  await calculateR134aCycle(page);
  await expect(fit).toBeEnabled();
  const entropy = page.getByRole("button", { name: /Entropia s/ });
  const volume = page.getByRole("button", { name: /Ominaistilavuus v/ });
  await entropy.click();
  await volume.click();
  const details = page.getByText("Näytä apukäyrien arvot");
  await details.click();
  await expect(page.locator(".ph-guide-list")).toContainText("Lämpötila T");
  await expect(page.locator(".ph-guide-list")).toContainText("Entropia s");
  await expect(page.locator(".ph-guide-list")).toContainText(
    "Ominaistilavuus v",
  );
  const guideValues = page.locator(".ph-guide-value");
  expect(await guideValues.count()).toBeGreaterThan(2);
  await guideValues.first().focus();
  await expect(guideValues.first()).toHaveAttribute("aria-pressed", "true");
  const firstGuideIndex = await guideValues
    .first()
    .evaluate((button) => Number(button.getAttribute("data-guide-index")));
  await expect(
    page.locator(`.ph-isoline[data-guide-index="${firstGuideIndex}"]`),
  ).toHaveClass(/ph-isoline-highlighted/);
  await guideValues.nth(1).click();
  await expect(guideValues.first()).toHaveAttribute("aria-pressed", "false");
  await expect(guideValues.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ph-isoline-highlighted")).not.toHaveCount(0);

  async function assertLabelSpacing() {
    const collisions = await page.locator(".ph-chart").evaluate((svg) => {
      const labels = [
        ...svg.querySelectorAll<SVGGraphicsElement>(".ph-isoline-label"),
      ];
      const protectedItems = [
        ...svg.querySelectorAll<SVGGraphicsElement>(
          ".ph-point, .ph-point-label",
        ),
      ];
      const intersects = (
        a: DOMRect | SVGRect,
        b: DOMRect | SVGRect,
        gap: number,
      ) =>
        a.x < b.x + b.width + gap &&
        a.x + a.width + gap > b.x &&
        a.y < b.y + b.height + gap &&
        a.y + a.height + gap > b.y;
      return labels.flatMap((label, index) => {
        const box = label.getBBox();
        return [...labels.slice(0, index), ...protectedItems]
          .filter((other) => intersects(box, other.getBBox(), 2))
          .map((other) => `${label.textContent}/${other.textContent}`);
      });
    });
    expect(collisions).toEqual([]);
  }
  await assertLabelSpacing();
  await fit.check();
  await assertLabelSpacing();
  await page.setViewportSize({ width: 390, height: 844 });
  await assertLabelSpacing();
  await fit.uncheck();
  await assertLabelSpacing();
});

test("saved cycle retains its vector chart across reload and prints the stored chart", async ({
  page,
}) => {
  await calculateR134aCycle(page);
  const chart = page.locator(".ph-diagram-section");
  const save = page.locator(".report-save");
  const chartBox = (await chart.boundingBox())!;
  expect((await save.boundingBox())!.y).toBeGreaterThan(
    chartBox.y + chartBox.height,
  );
  await save.locator("summary").click();
  await save.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    save.getByRole("button", { name: "Tallennettu" }),
  ).toBeDisabled();

  await page.goto("/#/reports");
  const report = page.locator(".report-entry");
  await expect(report).toHaveCount(1);
  await report.click();
  const savedChart = report.locator(".report-chart img");
  await expect(savedChart).toBeVisible();
  await expect
    .poll(() =>
      savedChart.evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  const chartSource = await savedChart.getAttribute("src");
  expect(chartSource).toContain("data:image/svg+xml");
  expect(decodeURIComponent(chartSource!)).toContain(
    "Kylmäkierron log(p)–h-kaavio",
  );

  const download = page.waitForEvent("download");
  await report.getByRole("button", { name: "Vie JSON", exact: true }).click();
  const file = await download;
  const record = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(record.chartSnapshot.kind).toBe("ph-cycle-v1");
  expect(record.chartSnapshot.points).toHaveLength(4);
  expect(record.chartSnapshot.dome.length).toBeGreaterThan(10);
  expect(record.chartSnapshot.points[2][1]).toBe(
    record.chartSnapshot.points[3][1],
  );

  await page.reload();
  await expect(page.locator(".saved-report-detail .report-chart img")).toHaveAttribute(
    "src",
    chartSource!,
  );
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printPage = await popup;
  const printedChart = printPage.locator("img.chart");
  await expect(printedChart).toHaveCount(1);
  await expect
    .poll(() =>
      printedChart.evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(printPage.locator("body")).toContainText(
    "Suorat viivat kuvaavat kierron järjestystä",
  );
});
