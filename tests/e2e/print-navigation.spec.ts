import { expect, test } from "@playwright/test";

async function openDraftPrint(page: import("@playwright/test").Page) {
  await page.goto("/#/checklists/new");
  await page.locator(".checklist-create select").selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Palattava raportti");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testaaja");
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  const reportUrl = page.url();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  return { printed: await popup, reportUrl };
}

test("print preview has manual controls, keeps them off paper and closes back to draft", async ({
  page,
}) => {
  const { printed, reportUrl } = await openDraftPrint(page);
  const toolbar = printed.getByRole("navigation", {
    name: "Raportin toiminnot",
  });
  const back = toolbar.getByRole("link", { name: "Takaisin raporttiin" });
  const print = toolbar.getByRole("button", { name: "Tulosta / PDF" });
  await expect(back).toHaveAttribute("href", reportUrl);
  await expect(print).toBeEnabled();
  await printed.evaluate(() => {
    (window as Window & { printCalls?: number }).printCalls = 0;
    window.print = () => {
      (window as Window & { printCalls?: number }).printCalls! += 1;
    };
  });
  await print.click();
  expect(
    await printed.evaluate(
      () => (window as Window & { printCalls?: number }).printCalls,
    ),
  ).toBe(1);
  await printed.emulateMedia({ media: "print" });
  await expect(toolbar).toBeHidden();
  await printed.emulateMedia({ media: "screen" });
  await expect(toolbar).toBeVisible();
  const close = printed.waitForEvent("close");
  await back.click().catch((error: unknown) => {
    // Chromium can close this page before acknowledging the successful click.
    // Still require the close event and the intact editor below.
    if (!printed.isClosed()) throw error;
  });
  await close;
  await expect(page).toHaveURL(reportUrl);
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Palattava raportti",
  );
});

test("print preview returns to persisted draft in the same window when close is unavailable", async ({
  page,
}) => {
  const { printed, reportUrl } = await openDraftPrint(page);
  await printed.evaluate(() => {
    window.close = () => {};
  });
  await printed.getByRole("link", { name: "Takaisin raporttiin" }).click();
  await expect(printed).toHaveURL(reportUrl);
  await expect(printed.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Palattava raportti",
  );
  await expect(
    printed.getByRole("navigation", { name: "Raportin toiminnot" }),
  ).toHaveCount(0);
});
