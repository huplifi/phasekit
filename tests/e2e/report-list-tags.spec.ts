import { expect, test } from "@playwright/test";

test("mixed reports use aligned rows with clear type and field status labels on mobile", async ({
  page,
}, info) => {
  await page.goto("/#/checklists/new");
  await page.locator(".checklist-create select").selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  const site = "Konehuone A / pitkä laitetunniste ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  await page.getByLabel("Kohteen nimi", { exact: true }).fill(site);
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testaaja");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu",
  );
  await page.goto("/#/pipe");
  await page
    .getByRole("textbox", { name: "Sisähalkaisija · mm", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Pituus · m", exact: true })
    .fill("10");
  await page.getByRole("textbox", { name: "Tilavuusvirta" }).fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  await page
    .getByRole("button", { name: "Tallenna laskelma", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/reports");
  const field = page.locator(".field-report-link");
  const tool = page.locator(".report-entry");
  const check = page.locator(
    ".report-timeline > .saved-entry:not(.report-entry)",
  );
  await expect(field.locator(".report-field-secondary")).toHaveText(
    "Tyhjiöinti",
  );
  await expect(field.locator(".report-field-draft-status")).toHaveText(
    "Luonnos",
  );
  await expect(field.locator(".report-summary")).toHaveText(site);
  await expect(tool.locator(".report-kind")).toHaveText("Putkilaskelma");
  await expect(check.locator(".report-kind")).toHaveText("Vuototarkastusarvio");
  await expect(check.locator(".report-summary")).not.toContainText(
    "Vuototarkastusarvio",
  );
  const leftEdges = await page
    .locator(
      ".report-timeline > .field-report-link .report-row-content, .report-timeline > .saved-entry > summary .report-row-content",
    )
    .evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().left)),
    );
  expect(leftEdges).toHaveLength(3);
  expect(Math.max(...leftEdges) - Math.min(...leftEdges)).toBeLessThanOrEqual(
    1,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.locator(".live-message")).toBeEmpty();
  await page.locator(".report-timeline").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("report-list-mobile.png") });
  await tool.locator(":scope > summary").click();
  await expect(tool).toHaveAttribute("open", "");
  await check.locator(":scope > summary").click();
  await expect(check).toHaveAttribute("open", "");
  await field.click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    site,
  );
});
