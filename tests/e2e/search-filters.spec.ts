import { expect, test } from "@playwright/test";

test("catalogue filters combine sourced blend classes and thermodynamic support", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("R513A");
  await page.locator(".filter-panel > summary").click();
  const annex = page.locator("#annex-filter");
  await expect(annex).toBeVisible();
  await annex.selectOption("II-1");
  await expect(
    page.locator(".refrigerant-link").filter({ hasText: "R513A" }),
  ).toBeVisible();

  await page.locator("#annex-filter").selectOption("");
  await page.getByRole("searchbox").fill("R134a");
  await page
    .getByRole("combobox", { name: "P–T-taulukko" })
    .selectOption("available");
  await expect(
    page.locator(".refrigerant-link").filter({ hasText: "R134a" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "log(p)–h-kaavio" })
    .selectOption("available");
  await expect(
    page.locator(".refrigerant-link").filter({ hasText: "R134a" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("oil filter says data is reference and can be cleared with the other filters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("R134a");
  await page.locator(".filter-panel > summary").click();
  await page.locator("#oil-filter").selectOption({ index: 1 });
  const help = page.getByRole("button", {
    name: /About: Oil code|Lisätietoa: Öljykoodi/,
  });
  await help.click();
  await expect(page.getByRole("tooltip")).toContainText(
    /compressor approval|kompressorihyväksyntää/,
  );
  await help.click();
  await expect(page.getByRole("tooltip")).toBeHidden();
  await page.getByRole("button", { name: "Tyhjennä suodattimet" }).click();
  await expect(page.locator("#oil-filter")).toHaveValue("");
});
