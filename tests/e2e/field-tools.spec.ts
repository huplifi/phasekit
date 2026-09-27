import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("thermal power retains cooling sign, uses explicit properties and clears stale output", async ({
  page,
}) => {
  await page.goto("/#/thermal-power");
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("60");
  await page
    .getByRole("combobox", { name: "Virtaaman yksikkö", exact: true })
    .selectOption("l/min");
  await page.getByLabel("Sisään · °C", { exact: true }).fill("15");
  await page.getByLabel("Ulos · °C", { exact: true }).fill("10");
  await page.getByLabel("Tiheys · kg/m³", { exact: true }).fill("1000");
  await page
    .getByLabel("Ominaislämpökapasiteetti · kJ/(kg·K)", { exact: true })
    .fill("4,18");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  const result = page.getByRole("region", { name: "Lämpötehon tulos" });
  await expect(result).toContainText(/20,9 kW/);
  await expect(result).toContainText(/−|-/);
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("-1");
  await expect(result).toHaveCount(0);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Virtaama ei voi olla negatiivinen",
  );
  await noOverflow(page);
});
test("electrical modes separate apparent and real power and validate power factor", async ({
  page,
}) => {
  await page.goto("/#/electrical");
  await page
    .getByRole("combobox", { name: "Laskenta", exact: true })
    .selectOption("three_phase");
  await page.getByLabel("Pääjännite · V", { exact: true }).fill("400");
  await page.getByLabel("Virta · A", { exact: true }).fill("10");
  await page.getByLabel("Tehokerroin · 0–1", { exact: true }).fill("0.8");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Sähkölaskennan tulos" }),
  ).toContainText(/5\s?542,56 W/);
  await page.getByLabel("Tehokerroin · 0–1", { exact: true }).fill("1.1");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("välillä 0–1");
  await page
    .getByRole("combobox", { name: "Laskenta", exact: true })
    .selectOption("ohm");
  await page.getByLabel("Jännite · V", { exact: true }).fill("24");
  await page.getByLabel("Resistanssi · Ω", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Sähkölaskennan tulos" }),
  ).toContainText("48 W");
  await noOverflow(page);
});
test("pipe geometry converts flow without inferring a recommended pipe size", async ({
  page,
}) => {
  await page.goto("/#/pipe");
  await page
    .getByRole("textbox", { name: "Sisähalkaisija · mm", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Pituus · m", exact: true })
    .fill("10");
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Putkilaskennan tulos" }),
  ).toContainText("3,14159 l");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await noOverflow(page);
  const axe = await new AxeBuilder({ page })
    .include(".field-tools")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
test("checklist keeps observations after reload, exports them and requires deletion confirmation", async ({
  page,
}) => {
  await page.goto("/#/checklists");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Testikohde");
  await page
    .getByRole("combobox", {
      name: "Tyhjiöpaineen yksikkö (absoluuttinen)",
      exact: true,
    })
    .selectOption("Pa");
  await page.getByLabel("Saavutettu paine", { exact: true }).fill("300");
  await page
    .getByLabel("Tyhjiöinnin kesto tavoitepaineeseen · min", { exact: true })
    .fill("30");
  await page
    .getByLabel("Saavutettu tyhjiö ja mittauspaikka kirjattu", { exact: true })
    .check();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("phasekit");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        const state = await new Promise<{
          checklistDrafts?: { checkedIds: string[] }[];
        }>((resolve, reject) => {
          const r = db.transaction("user").objectStore("user").get("state");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        db.close();
        return (
          state?.checklistDrafts?.[0]?.checkedIds.includes("measurement") ??
          false
        );
      }),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByLabel("Saavutettu paine", {
      exact: true,
    }),
  ).toHaveValue("300");
  await page.goto("/#/reports");
  await page
    .locator(".field-report-link")
    .filter({ hasText: "Testikohde" })
    .click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Testikohde",
  );
  await expect(
    page.getByLabel("Saavutettu paine", {
      exact: true,
    }),
  ).toHaveValue("300");
  await expect(
    page.getByRole("combobox", {
      name: "Tyhjiöpaineen yksikkö (absoluuttinen)",
      exact: true,
    }),
  ).toHaveValue("Pa");
  await expect(
    page.getByLabel("Tyhjiöinnin kesto tavoitepaineeseen · min", {
      exact: true,
    }),
  ).toHaveValue("30");
  await expect(
    page.getByLabel("Saavutettu tyhjiö ja mittauspaikka kirjattu", {
      exact: true,
    }),
  ).toBeChecked();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Vie tekstinä", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /phasekit-evacuation.*\.txt/,
  );
  await noOverflow(page);
  const axe = await new AxeBuilder({ page })
    .include(".field-tools")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("checklist.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Poista raportti", exact: true })
    .click();
  await page.getByRole("button", { name: "Peruuta", exact: true }).click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Testikohde",
  );
  await page
    .getByRole("button", { name: "Poista raportti", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vahvista poisto", exact: true })
    .click();
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveCount(0);
});
