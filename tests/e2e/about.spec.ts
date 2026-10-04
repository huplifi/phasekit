import { expect, test } from "@playwright/test";

test.describe("public introduction", () => {
  test.use({ javaScriptEnabled: false });
  test("language navigation and installation guides work without JavaScript", async ({
    page,
  }) => {
    await page.goto("/tietoa/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fi");
    await page.getByRole("link", { name: "EN · English" }).click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator("summary").first().click();
    await expect(page.locator("details").first()).toHaveAttribute("open", "");
    await expect(page.locator(".hero .button")).toHaveAttribute(
      "href",
      "https://phasekit.app/",
    );
    for (const route of ["/tietoa/", "/about/"]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() =>
          [...document.images].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        ),
      ).toBe(true);
    }
  });
});

test("social previews and linked assets are served as files", async ({
  page,
  request,
}) => {
  for (const route of ["/tietoa/", "/about/"]) {
    await page.goto(route);
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const response = await request.get(new URL(image!).pathname);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});
