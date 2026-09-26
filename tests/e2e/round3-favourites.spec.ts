import { expect, test } from "@playwright/test";

test("favouriting a picker result keeps its row and scroll position until search changes", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  await page.getByRole("button", { name: /Vaihda kylmäainetta/ }).click();

  const dialog = page.getByRole("dialog");
  const results = dialog.locator(".picker-results");
  const rows = dialog.locator(".picker-result");
  const target = rows
    .filter({
      has: page.locator(
        '.picker-result-favourite button[aria-pressed="false"]',
      ),
    })
    .nth(30);
  await target.scrollIntoViewIfNeeded();
  const designation = (await target.locator("strong").textContent())?.trim();
  expect(designation).toBeTruthy();

  const orderBefore = await rows.evaluateAll((elements) =>
    elements.map((element) => element.textContent),
  );
  const scrollBefore = await results.evaluate((element) => element.scrollTop);
  await target.locator(".picker-result-favourite button").click();

  const starredRow = rows.filter({
    has: page.locator("strong", { hasText: new RegExp(`^${designation}$`) }),
  });
  await expect(
    starredRow.locator(".picker-result-favourite button"),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".picker-live-message")).toContainText(
    designation!,
  );
  await expect
    .poll(() => results.evaluate((element) => element.scrollTop))
    .toBe(scrollBefore);
  expect(
    await rows.evaluateAll((elements) =>
      elements.map((element) => element.textContent),
    ),
  ).toEqual(orderBefore);

  await dialog.getByRole("searchbox").fill(designation!);
  const filteredTarget = dialog.locator(".picker-result");
  await expect(filteredTarget).toHaveCount(1);
  await expect(dialog.locator(".picker-group h3").first()).toContainText(
    /Suosikit|Favourites/,
  );
});
