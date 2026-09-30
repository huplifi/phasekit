import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function choose(page: import("@playwright/test").Page, value: string) {
  await page
    .getByRole("button", { name: /Vaihda kylmäainetta|^Valitse kylmäaine$/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill(value);
  await dialog
    .getByRole("button", {
      name: `Valitse kylmäaine työkalulle ${value}`,
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
}

test("P–T edits either value, converts units and reference, and rejects stale unsupported values", async ({
  page,
}, info) => {
  await page.goto("/#/pt/r134a");
  const p = page.getByLabel("Paine", { exact: true });
  const t = page.getByLabel("Lämpötila", { exact: true });
  await p.fill("5");
  await expect(t).toHaveValue("15.8");
  await t.fill("20");
  await expect
    .poll(async () => Number(await p.inputValue()))
    .toBeCloseTo(5.72, 1);
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).uncheck();
  await expect
    .poll(async () => Number(await p.inputValue()))
    .toBeCloseTo(4.7, 1);
  await expect(page.locator(".pt-live-result")).toContainText(
    "standardi-ilmakehä",
  );
  await page.getByLabel("Paineyksikkö").selectOption("kPa");
  await expect
    .poll(async () => Number(await p.inputValue()))
    .toBeCloseTo(470, -1);
  await expect(t).toHaveValue("20");
  await page.getByLabel("Lämpötilayksikkö").selectOption("F");
  await expect(t).toHaveValue("68");
  await expect(page.getByLabel("Lämpötilapiste", { exact: true })).toHaveCount(
    0,
  );
  await t.fill("-999");
  await expect(p).toHaveValue("");
  await expect(page.getByRole("alert")).toContainText(
    "tuettu alue",
  );
  await t.fill("68");
  await choose(page, "R514A");
  await expect(t).toHaveValue("68");
  await expect(p).toHaveValue("");
  await expect(
    page.getByLabel("Lämpötilapiste", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lisätietoa: Lämpötilapiste" })
    .click();
  await expect(page.getByRole("tooltip")).toContainText("Tulistuksessa");
  await page.keyboard.press("Escape");
  await choose(page, "R134a");
  await expect(p).not.toHaveValue("");
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v3-${info.project.name}-pt.png`),
    fullPage: true,
  });
});

test("modal shows full list, keeps favourites first and restores calculator focus", async ({
  page,
}, info) => {
  await page.goto("/#/pt/r134a");
  await page.getByLabel("Paine", { exact: true }).fill("5");
  const trigger = page.getByRole("button", { name: /Vaihda kylmäainetta/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Suosikit", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.locator(".picker-result")).toHaveCount(249);
  await expect(
    dialog.getByRole("button", { name: /Näytä.*lisää/ }),
  ).toHaveCount(0);
  await dialog.getByRole("searchbox").fill("R134a");
  await dialog
    .getByRole("button", { name: "Lisää R134a suosikkeihin", exact: true })
    .click();
  await expect(dialog.locator(".picker-result")).toHaveCount(1);
  await dialog.getByRole("searchbox").fill("");
  await expect(dialog.locator(".picker-result").first()).toContainText("R134a");
  await expect(
    dialog.getByRole("button", { name: "Poista R134a suosikeista" }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v3-${info.project.name}-picker.png`),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Paine", { exact: true })).toHaveValue("5");
});

test("R142b uses sourced name, ODS GWP and one environmental provenance block", async ({
  page,
}, info) => {
  await page.goto("/#/refrigerants/r142b");
  await expect(page.locator(".chemical-name")).not.toHaveText("Tieto puuttuu");
  await expect(
    page.getByRole("button", { name: "Rajoitukset", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Ominaisuudet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Perustiedot", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#detail-panel")).not.toContainText("gwp_ar4_100");
  await expect(page.locator("#detail-panel")).not.toContainText(
    "non_fluorinated",
  );
  const environment = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Ympäristö ja sääntely",
      exact: true,
    }),
  });
  await expect(environment.locator(".source-disclosure")).toHaveCount(1);
  await expect(environment).toContainText("2 300");
  await expect(page.locator(".data-footer")).toHaveCount(0);
  await page.screenshot({
    path: test
      .info()
      .outputPath(`phasekit-v3-${info.project.name}-properties.png`),
    fullPage: true,
  });
});

test("leak result exposes the controlling quantity and refrigerant family with styled checkboxes", async ({
  page,
}, info) => {
  await page.goto("/#/check/r32");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Laske tarkastusväli", exact: true })
    .click();
  await expect(page.locator(".check-decisive-quantity")).toContainText(
    "6,75 t CO₂e",
  );
  await expect(page.locator(".check-decisive-family")).toHaveText("HFC");
  await expect(page.locator(".check-decisive-basis")).toContainText(
    "Liitteen I",
  );
  const detector = page.getByLabel("Vuodonilmaisujärjestelmä käytössä", {
    exact: true,
  });
  await detector.check();
  await page
    .getByRole("button", { name: "Laske tarkastusväli", exact: true })
    .click();
  await expect(page.locator(".result-number")).toContainText("24");
  await expect(page.locator(".check-decisive-quantity")).toContainText(
    "6,75 t CO₂e",
  );
  await page.screenshot({
    path: test.info().outputPath(`phasekit-v3-${info.project.name}-check.png`),
    fullPage: true,
  });
  await page.goto("/#/check/r513a");
  await page.getByLabel("Täytös", { exact: true }).fill("50");
  await page
    .getByRole("button", { name: "Laske tarkastusväli", exact: true })
    .click();
  await expect(page.locator(".check-decisive-family")).toContainText("HFO");
  await expect(page.locator(".check-decisive-family")).toContainText("HFC");
  await expect(page.locator(".check-decisive-quantity")).toContainText("28 kg");
  await expect(page.locator(".check-decisive-basis")).toContainText(
    "liitteen II",
  );
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});
