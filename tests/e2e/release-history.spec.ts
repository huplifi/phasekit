import { test, expect } from "@playwright/test";
import packageInfo from "../../package.json" with { type: "json" };
import releases from "../../data/releases.json" with { type: "json" };

test("release history is discoverable and bilingual", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.locator(".beta-banner .beta-release-link")).toHaveAttribute(
    "href",
    "#/releases",
  );
  await expect(page.locator(".beta-banner .beta-release-link")).toHaveText(
    "Uutta →",
  );
  await expect(
    page.getByRole("link", { name: "Anna palautetta", exact: true }),
  ).toHaveAttribute("href", "https://github.com/huplifi/phasekit/issues");
  await expect(
    page.getByRole("link", { name: /kattavuusraportti/ }),
  ).toHaveAttribute("href", "#/coverage");
  const versionLink = page.getByRole("link", {
    name: packageInfo.version, exact: true,
  });
  await expect(versionLink).toContainText(packageInfo.version);
  await versionLink.click();
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
    // A long history at mobile DPR 3 exceeds Linux WebKit's bitmap limit.
    scale: "css",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Takaisin", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page
    .getByRole("link", { name: packageInfo.version, exact: true })
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
    .getByRole("link", { name: packageInfo.version, exact: true })
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
