import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import symbolLibrary from "../../apps/web/src/symbol-data.json" with { type: "json" };

test("all six additions are searchable in Finnish and English with source scope", async ({
  page,
}) => {
  const ids = [
    "vaihtokosketin-keskiasento",
    "kosketin-no-aikaisemmin-sulkeutuva",
    "kosketin-nc-myohassa-avautuva",
    "suojajannitemuuntaja",
    "suojaerotusmuuntaja",
    "suojausluokka-ii",
  ];
  for (const locale of ["fi", "en"]) {
    await page.goto("/#/settings");
    await page
      .getByRole("combobox", { name: /^(Kieli|Language)$/ })
      .selectOption(locale);
    await page.goto("/#/symbols");
    await page
      .getByRole("button", {
        name: locale === "fi" ? "Sähkö" : "Electrical",
        exact: true,
      })
      .click();
    for (const id of ids) {
      const symbol = symbolLibrary.symbols.find((item) => item.id === id)!;
      const name = locale === "fi" ? symbol.name_fi : symbol.name_en;
      await page
        .getByRole("combobox", {
          name: locale === "fi" ? "Ryhmä" : "Category",
          exact: true,
        })
        .selectOption(symbol.category);
      await page.getByRole("searchbox").fill(name);
      await page.getByRole("button", { name, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(symbol.purpose);
      await expect(dialog).toContainText(symbol.notes);
      if (symbol.representation === "laitemerkinta") {
        await expect(dialog).toContainText(
          locale === "fi" ? "Laitemerkintä" : "Equipment marking",
        );
        await dialog
          .getByText(
            locale === "fi" ? "Lähteet ja rajaukset" : "Sources and scope",
            { exact: true },
          )
          .click();
        await expect(dialog).toContainText(symbol.sources[0].labels![0]);
      }
      await page
        .getByRole("button", {
          name:
            locale === "fi" ? "Sulje symbolin tiedot" : "Close symbol details",
        })
        .click();
    }
  }
});

test("visual reference has separate domains, alias search and accessible details", async ({
  page,
}) => {
  await page.goto("/#/tools");
  await page
    .getByRole("button", { name: "Kaaviosymbolit", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kaaviosymbolit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kylmä", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(18);
  const search = page.getByRole("searchbox", { name: "Hae symboleja" });
  await expect(search).not.toBeFocused();
  await search.fill("hoyrystin");
  const card = page.locator(".schematic-symbol-card");
  await expect(card).toHaveCount(1);
  await card.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Sovellettu merkki");
  await dialog.getByText("Lähteet ja rajaukset", { exact: true }).click();
  await expect(dialog).toContainText("GUNT");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
  await page.getByRole("button", { name: "Sähkö", exact: true }).click();
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(0);
  await search.fill("");
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(65);
  await page
    .getByRole("combobox", { name: "Ryhmä", exact: true })
    .selectOption("maadoitus");
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Kylmä", exact: true }).click();
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(18);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("symbol pictures and detail remain available offline, including dark mobile layout", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("/#/symbols");
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(18);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The prompt-mode worker controls the client after its first reload.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cachedSymbols = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = (
      await Promise.all(
        keys.map(async (key) => (await caches.open(key)).keys()),
      )
    ).flat();
    return [
      ...new Set(
        requests
          .map((request) => new URL(request.url).pathname)
          .filter((path) => path.startsWith("/symbols/")),
      ),
    ];
  });
  expect(cachedSymbols).toHaveLength(83);
  // Playwright WebKit fails network requests when emulated offline even with
  // a controlling worker; inspect its complete precache and UI online instead.
  // Chromium verifies actual offline reload and asset responses.
  if (browserName !== "webkit") {
    await context.setOffline(true);
    await page.reload();
  }
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(18);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 320, height: 740 });
  const assets = await page.evaluate(async () => {
    const urls = Array.from(
      document.querySelectorAll(".schematic-symbol-image"),
    )
      .map(
        (el) =>
          getComputedStyle(el)
            .getPropertyValue("--schematic-symbol-url")
            .match(/url\("(.+)"\)/)?.[1],
      )
      .filter(Boolean) as string[];
    return Promise.all(
      urls.map(async (url) => {
        const r = await fetch(url);
        return r.ok && (await r.text()).includes("<svg");
      }),
    );
  });
  expect(assets).toHaveLength(18);
  expect(assets.every(Boolean)).toBe(true);
  await page.locator(".schematic-symbol-card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Sulje symbolin tiedot" }).click();
  await page.getByRole("button", { name: "Sähkö", exact: true }).click();
  await expect(page.locator(".schematic-symbol-card")).toHaveCount(65);
  await page
    .getByRole("combobox", { name: "Ryhmä", exact: true })
    .selectOption("ohjaus");
  await page
    .getByRole("searchbox", { name: "Hae symboleja" })
    .fill("myohemmin avautuva");
  await page.getByRole("button", { name: /myöhemmin avautuva/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("saman kosketinyksikön");
  await dialog.getByText("Lähteet ja rajaukset", { exact: true }).click();
  await expect(
    dialog.getByText("Oppituntidia: Koskettimet", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
