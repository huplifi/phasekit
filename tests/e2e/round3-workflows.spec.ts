import { test, expect } from "@playwright/test";

test("leak result keeps input context, readable explanation and adjacent save/print actions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  await expect(page.locator(".check-result-context")).toHaveText(
    "R134a · 120 kg",
  );
  const actions = page.locator(".check-result-actions");
  await expect(
    actions.getByRole("button", { name: "Tallenna laskelma" }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Tulosta / tallenna PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kopioi selite" }),
  ).toBeHidden();
  await page.getByText("Näytä jaettava selite", { exact: true }).click();
  const text = page.locator(".share-text");
  await expect(text).toBeVisible();
  await expect(text).toContainText("Täytös: 120 kg");
  expect((await text.boundingBox())!.height).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Kopioi selite" }).click();
  await expect(page.locator(".share-explanation [role=status]")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(await text.textContent());
  await actions.getByRole("button", { name: "Tallenna laskelma" }).click();
  await expect(
    actions.getByRole("button", { name: "Laskelma tallennettu." }),
  ).toBeDisabled();
  await expect(
    actions.getByRole("button", { name: "Tulosta / tallenna PDF" }),
  ).toBeEnabled();
  await page.screenshot({
    path: test.info().outputPath("check-result.png"),
    fullPage: true,
  });
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await expect(page.locator(".check-result-context")).toHaveCount(0);
});

test("picker indicates remaining results without changing modal bounds", async ({
  page,
}) => {
  await page.goto("/#/pt");
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const cue = dialog.locator(".picker-continuation-cue");
  await expect(cue.locator("svg")).toBeVisible();
  const bounds = await dialog.boundingBox();
  await dialog.getByRole("searchbox").fill("R134a");
  await expect(cue.locator("svg")).toHaveCount(0);
  expect(
    Math.abs((await dialog.boundingBox())!.height - bounds!.height),
  ).toBeLessThan(2);
  const searchBounds = await dialog.getByRole("searchbox").boundingBox();
  const countBounds = await dialog
    .locator(".picker-result-count")
    .boundingBox();
  expect(
    countBounds!.y - searchBounds!.y - searchBounds!.height,
  ).toBeGreaterThanOrEqual(8);
});
