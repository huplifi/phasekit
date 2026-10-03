import { expect, test } from "@playwright/test";

test("mixed reports share rows and open dedicated details with reliable return navigation", async ({
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
  await expect(tool).toContainText("Putkilaskelma");
  await expect(check).toContainText("Vuototarkastusarvio");
  await expect(check.locator(".report-summary")).not.toContainText(
    "Vuototarkastusarvio",
  );
  const leftEdges = await page
    .locator(".report-timeline > .report-list-link .report-row-content")
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
  await expect(page.locator(".report-timeline > details")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Näytä", exact: true })
    .selectOption("calculation");
  await tool.click();
  await expect(page).toHaveURL(/#\/reports\/(?!check\/).+/);
  await expect(page.locator(".saved-report-detail")).toContainText("20 mm");
  await expect(page.locator(".report-timeline")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tulosta / PDF", exact: true }),
  ).toHaveClass(/secondary-button/);
  await expect(
    page.getByRole("button", { name: "Vie JSON", exact: true }),
  ).toHaveClass(/secondary-button/);
  await expect(
    page.getByRole("button", { name: "Lukitse raportti", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("calculation-detail-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Muokkaa muistiinpanoja", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Muistiinpanot", exact: true })
    .fill("Unsaved test note");
  const detailUrl = page.url();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.evaluate(() => {
    window.location.hash = "/reports";
  });
  await expect(page).toHaveURL(detailUrl);
  await expect(
    page.getByRole("textbox", { name: "Muistiinpanot", exact: true }),
  ).toHaveValue("Unsaved test note");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goForward();
  await expect(page).toHaveURL(detailUrl);
  await expect(
    page.getByRole("textbox", { name: "Muistiinpanot", exact: true }),
  ).toHaveValue("Unsaved test note");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page).toHaveURL(detailUrl);
  await expect(
    page.getByRole("textbox", { name: "Muistiinpanot", exact: true }),
  ).toHaveValue("Unsaved test note");
  page.once("dialog", (dialog) => dialog.accept());
  await page.goBack();
  await expect(page).toHaveURL(/#\/reports$/);
  await expect(
    page.getByRole("combobox", { name: "Näytä", exact: true }),
  ).toHaveValue("calculation");
  await page
    .getByRole("combobox", { name: "Näytä", exact: true })
    .selectOption("all");
  await check.click();
  await expect(page).toHaveURL(/#\/reports\/check\//);
  await expect(page.locator(".saved-report-detail")).toContainText("R134a");
  await page.reload();
  await expect(page.locator(".saved-report-detail")).toContainText(
    "Tallennettu alkuperäinen tulos",
  );
  await expect(
    page.getByRole("button", { name: "Tulosta / PDF", exact: true }),
  ).toHaveClass(/secondary-button/);
  await page
    .getByRole("button", { name: "Takaisin raportteihin", exact: true })
    .click();
  await field.click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    site,
  );
});

test("unknown saved detail provides an explicit route back to reports", async ({
  page,
}) => {
  for (const route of ["/#/reports/missing", "/#/reports/check/missing"]) {
    await page.goto(route);
    await expect(
      page.getByText("Tallennettua raporttia ei löytynyt tästä selaimesta.", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Takaisin raportteihin", exact: true })
      .click();
    await expect(page).toHaveURL(/#\/reports$/);
  }
});
