import { test, expect } from "@playwright/test";
import packageInfo from "../../package.json" with { type: "json" };
import releases from "../../data/releases.json" with { type: "json" };

test("release history is discoverable and bilingual", async ({ page }) => {
  await page.goto("/#/settings");
  await page
    .getByRole("link", { name: "Versiohistoria ja uutta", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Versiohistoria", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".release-entry")).toHaveCount(releases.length);
  await expect(page.locator(".release-entry").first()).toContainText(
    packageInfo.version,
  );
  await expect(page.locator(".release-entry").first()).toContainText(
    "Käytössäsi",
  );
  await expect(
    page.locator(".main-nav a[aria-current='page']"),
  ).toHaveAttribute("href", "#/settings");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("release-history-fi.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Takaisin", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page
    .getByRole("link", { name: "Release history and what’s new", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Visible release history", exact: true }),
  ).toBeVisible();
});

test("release history survives an offline reload", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit reports an internal error on offline reload in this environment; real-device offline verification remains separate.",
  );
  await page.goto("/#/settings");
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page
    .getByRole("link", { name: "Release history and what’s new", exact: true })
    .click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Release history", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".release-entry").first()).toContainText(
    "Installed version",
  );
  await context.setOffline(false);
});
