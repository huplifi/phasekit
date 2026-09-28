import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cpLabel = "Ominaislämpökapasiteetti · kJ/(kg·K)";
async function waterExample(page: Page) {
  await page.goto("/#/heat-quantity");
  await page.getByLabel("Määrä", { exact: true }).fill("100");
  await page.getByLabel("Alkulämpötila · °C", { exact: true }).fill("10");
  await page.getByLabel("Loppulämpötila · °C", { exact: true }).fill("60");
  await page.getByLabel(cpLabel, { exact: true }).fill("4,2");
}
async function calculate(page: Page) {
  await page.getByRole("button", { name: "Laske", exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("water energy and ideal duration use entered properties; invalid edits remove stale output", async ({
  page,
}) => {
  await waterExample(page);
  await calculate(page);
  const result = page.getByRole("region", { name: "Lämpölaskennan tulos" });
  await expect(result).toContainText("5,83333 kWh");
  await expect(result).toContainText(/21\s?000 kJ/);
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("time");
  await expect(result).toHaveCount(0);
  await page.getByLabel("Lämpöteho · kW", { exact: true }).fill("2");
  await calculate(page);
  await expect(result.locator(".field-result-value")).toHaveText("2 h 55 min");
  await expect(result).toContainText("ei sähkötehoa");
  await noOverflow(page);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByLabel("Loppulämpötila · °C", { exact: true }).fill("100");
  await expect(result).toHaveCount(0);
  await expect(page.locator(".report-save")).toHaveCount(0);
  await calculate(page);
  await expect(page.getByRole("alert")).toContainText("yli 0 ja alle 100");
});

test("Kiisseli estimate can be overridden and saved print retains user-supplied calculation", async ({
  page,
}) => {
  await waterExample(page);
  await page
    .getByRole("combobox", { name: "Aine", exact: true })
    .selectOption("kiisseli");
  await expect(page.getByLabel(cpLabel, { exact: true })).toHaveValue("3.9");
  await page
    .getByRole("combobox", { name: "Määrän yksikkö", exact: true })
    .selectOption("l");
  await expect(page.getByLabel("Tiheys · kg/m³", { exact: true })).toHaveValue(
    "",
  );
  await calculate(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Määrän yksikkö", exact: true })
    .selectOption("kg");
  await page.getByLabel(cpLabel, { exact: true }).fill("3.2");
  await calculate(page);
  await expect(
    page.getByRole("region", { name: "Lämpölaskennan tulos" }),
  ).toContainText(/16\s?000 kJ/);
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  const records = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<{
      toolRecords: {
        tool: string;
        inputs: { label: { en: string }; value: string }[];
        outputs: { label: { en: string }; value: string }[];
        sources: { title: string }[];
      }[];
    }>((resolve, reject) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.toolRecords;
  });
  const saved = records.find((record) => record.tool === "heat-quantity")!;
  expect(saved.inputs.find((item) => item.label.en === "Material")?.value).toBe(
    "Kiisseli",
  );
  expect(
    saved.inputs.find((item) => item.label.en === "Specific heat used")?.value,
  ).toBe("3.2");
  expect(
    saved.inputs.find((item) => item.label.en === "Specific heat provenance")
      ?.value,
  ).toBe("Käyttäjän syöttämä");
  expect(saved.inputs.some((item) => item.label.en === "Density used")).toBe(
    false,
  );
  expect(
    saved.outputs.find((item) => item.label.en === "Heat quantity")?.value,
  ).toBe("16000");
  expect(
    saved.inputs.some((item) => /90\s*(?:massa|mass|%)/i.test(item.value)),
  ).toBe(false);
  expect(saved.sources.some((source) => /ASHRAE/i.test(source.title))).toBe(
    false,
  );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(
    printed.getByRole("heading", {
      name: "Lämpömäärä",
      exact: true,
    }),
  ).toBeVisible();
  await expect(printed.locator("body")).toContainText("Käyttäjän syöttämä");
  await expect(printed.locator("body")).toContainText("3,2");
  await expect(printed.locator("body")).not.toContainText(
    "Koostumuksesta arvioitu",
  );
  await expect(printed.locator("body")).not.toContainText("ASHRAE");
  await printed.close();
  await page.goto("/#/reports");
  await expect(page.getByText(/Lämpömäärä.*Kiisseli/).first()).toBeVisible();
});

test("inverse temperature validates solved water range and specific heat omits unused preset", async ({
  page,
}) => {
  await waterExample(page);
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("temperature");
  await page
    .getByRole("combobox", { name: "Energian yksikkö", exact: true })
    .selectOption("kJ");
  await page.getByLabel("Lämpömäärä", { exact: true }).fill("21000");
  await calculate(page);
  await expect(page.locator(".field-result-value")).toHaveText("60 °C");
  await page.getByLabel("Lämpömäärä", { exact: true }).fill("42000");
  await calculate(page);
  await expect(page.getByRole("alert")).toContainText("yli 0 ja alle 100");
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("specific-heat");
  await page.getByLabel("Lämpömäärä", { exact: true }).fill("21000");
  await calculate(page);
  await expect(page.getByLabel(cpLabel, { exact: true })).toHaveCount(0);
  await expect(page.locator(".field-result-value")).toHaveText("4,2 kJ/(kg·K)");
  await noOverflow(page);
});

test("English heat form and result remain usable at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/settings");
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page.goto("/#/heat-quantity");
  await expect(
    page.getByRole("heading", {
      name: "Heat energy and heating time",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Solve for", exact: true })
    .selectOption("power");
  await page
    .getByRole("textbox", { name: "Material amount", exact: true })
    .fill("100");
  await page
    .getByRole("textbox", { name: "Initial temperature · °C", exact: true })
    .fill("10");
  await page
    .getByRole("textbox", { name: "Final temperature · °C", exact: true })
    .fill("60");
  await page
    .getByRole("textbox", {
      name: "Specific heat capacity · kJ/(kg·K)",
      exact: true,
    })
    .fill("4.2");
  await page
    .getByRole("textbox", { name: "Duration · min", exact: true })
    .fill("175");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  const result = page.getByRole("region", { name: "Heat calculation result" });
  await expect(result.locator(".field-result-value")).toHaveText("2 kW");
  await expect(result).toContainText("not electrical input");
  await noOverflow(page);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("flowing liquid tool shares water properties and clears results when properties change", async ({
  page,
}) => {
  await page.goto("/#/thermal-power");
  const preset = page.getByRole("combobox", {
    name: "Nesteen taulukkoarvot",
    exact: true,
  });
  await preset.selectOption("water");
  await expect(
    page.getByRole("textbox", { name: cpLabel, exact: true }),
  ).toHaveValue("4.186");
  await expect(
    page.getByRole("textbox", { name: "Tiheys · kg/m³", exact: true }),
  ).toHaveValue("1000");
  await page
    .getByRole("textbox", { name: "Tilavuusvirta", exact: true })
    .fill("0.2");
  await page
    .getByRole("textbox", { name: "Sisään · °C", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Ulos · °C", exact: true })
    .fill("30");
  await calculate(page);
  const result = page.getByRole("region", { name: "Lämpötehon tulos" });
  await expect(result.locator(".field-result-value")).toHaveText("8,372 kW");
  await page
    .getByRole("textbox", { name: "Ulos · °C", exact: true })
    .fill("100");
  await expect(result).toHaveCount(0);
  await calculate(page);
  await expect(page.getByRole("alert")).toContainText("100");
  await preset.selectOption("custom");
  await expect(
    page.getByRole("textbox", { name: cpLabel, exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Tiheys · kg/m³", exact: true }),
  ).toHaveValue("");
  await noOverflow(page);
});

test("Kiisseli composition estimate calculates energy and time and freezes its basis in saved print", async ({
  page,
}) => {
  await page.goto("/#/heat-quantity");
  await page
    .getByRole("combobox", { name: "Aine", exact: true })
    .selectOption("kiisseli");
  await expect(page.getByLabel(cpLabel, { exact: true })).toHaveValue("3.9");
  await expect(
    page.getByText("Koostumuksesta arvioitu", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Määrä", { exact: true }).fill("1");
  await page.getByLabel("Alkulämpötila · °C", { exact: true }).fill("0");
  await page.getByLabel("Loppulämpötila · °C", { exact: true }).fill("60");
  await calculate(page);
  const result = page.getByRole("region", { name: "Lämpölaskennan tulos" });
  await expect(result).toContainText("234 kJ");
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("time");
  await page.getByLabel("Lämpöteho · kW", { exact: true }).fill("1");
  await calculate(page);
  await expect(result.locator(".field-result-value")).toHaveText("3 min 54 s");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{
      toolRecords: {
        tool: string;
        inputs: { label: { en: string }; value: string }[];
        outputs: { label: { en: string }; value: string }[];
        sources: { title: string }[];
      }[];
    }>((resolve, reject) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.toolRecords.find((record) => record.tool === "heat-quantity")!;
  });
  expect(
    saved.inputs.find((item) => item.label.en === "Specific heat used")?.value,
  ).toBe("3.9");
  expect(
    saved.inputs.find((item) => item.label.en === "Specific heat provenance")
      ?.value,
  ).toBe("Koostumuksesta arvioitu");
  expect(
    saved.inputs.some((item) => /90\s*(?:massa|mass|%)/i.test(item.value)),
  ).toBe(true);
  expect(
    saved.outputs.find((item) => item.label.en === "Heat quantity")?.value,
  ).toBe("234");
  expect(
    saved.outputs.find((item) => item.label.en === "Duration")?.value,
  ).toBe("3.9");
  expect(saved.sources.some((source) => /ASHRAE/i.test(source.title))).toBe(
    true,
  );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(printed.locator(".result-card").first()).toContainText(
    "3 min 54 s",
  );
  await expect(printed.locator("body")).toContainText(
    "Koostumuksesta arvioitu",
  );
  await expect(printed.locator("body")).toContainText(/90\s*(?:massa|mass|%)/i);
  await expect(printed.locator("body")).toContainText("ASHRAE");
  await printed.close();
  await page
    .getByRole("combobox", { name: "Aine", exact: true })
    .selectOption("custom");
  await expect(page.getByLabel(cpLabel, { exact: true })).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Määrän yksikkö", exact: true })
    .selectOption("l");
  await expect(page.getByLabel("Tiheys · kg/m³", { exact: true })).toHaveValue(
    "",
  );
  await expect(result).toHaveCount(0);
  await noOverflow(page);
});

test("rounded heating duration stays human-readable in calculation, saved report and print", async ({
  page,
}) => {
  await page.goto("/#/heat-quantity");
  await page
    .getByRole("combobox", { name: "Aine", exact: true })
    .selectOption("kiisseli");
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("time");
  await page.getByLabel("Määrä", { exact: true }).fill("1");
  await page.getByLabel("Alkulämpötila · °C", { exact: true }).fill("21");
  await page.getByLabel("Loppulämpötila · °C", { exact: true }).fill("100");
  await page.getByLabel("Lämpöteho · kW", { exact: true }).fill("1");
  await calculate(page);
  const headline = page
    .getByRole("region", { name: "Lämpölaskennan tulos" })
    .locator(".field-result-value");
  await expect(headline).toHaveText(/^≈\s*5 min 8 s$/);
  const displayedDuration = (await headline.innerText()).trim();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/reports");
  await page.reload();
  const saved = page.locator(".saved-entry").filter({ hasText: "Kiisseli" });
  await expect(saved.locator(".report-summary")).toContainText(
    displayedDuration,
  );
  await saved.locator(":scope > summary").click();
  await expect(
    saved
      .getByRole("region", { name: "Päätulos", exact: true })
      .locator(".result-number"),
  ).toHaveText(displayedDuration);
  const popup = page.waitForEvent("popup");
  await saved
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(
    printed.locator(".result-card").first().locator("dd"),
  ).toHaveText(displayedDuration);
  await printed.close();
  const duration = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{
      toolRecords: {
        tool: string;
        outputs: { label: { en: string }; value: string; unit?: string }[];
      }[];
    }>((resolve, reject) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.toolRecords
      .find((record) => record.tool === "heat-quantity")
      ?.outputs.find((row) => row.label.en === "Duration");
  });
  expect(duration?.value).toBe("5.135");
  expect(duration?.unit).toBe("min");
});

test("long ideal durations use compact calendar units without narrow-screen overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/heat-quantity");
  await page
    .getByRole("combobox", { name: "Aine", exact: true })
    .selectOption("kiisseli");
  await page
    .getByRole("combobox", { name: "Ratkaise", exact: true })
    .selectOption("time");
  await page.getByLabel("Määrä", { exact: true }).fill("1");
  await page.getByLabel("Alkulämpötila · °C", { exact: true }).fill("0");
  await page.getByLabel("Loppulämpötila · °C", { exact: true }).fill("60");
  await page.getByLabel("Lämpöteho · kW", { exact: true }).fill("0.000001");
  await calculate(page);
  const result = page.getByRole("region", { name: "Lämpölaskennan tulos" });
  await expect(result.locator(".field-result-value")).toHaveText(/7 v\s+5 kk/);
  await expect(result.locator(".field-result-value")).not.toContainText("min");
  await noOverflow(page);
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/settings");
  await page
    .getByRole("combobox", { name: "Kieli", exact: true })
    .selectOption("en");
  await page.goto("/#/reports");
  const saved = page.locator(".saved-entry").filter({ hasText: "Kiisseli" });
  await expect(saved.locator(".report-summary")).toContainText(
    /≈\s*7 yr\s+5 mo/,
  );
  await saved.locator(":scope > summary").click();
  await expect(
    saved.getByRole("region", { name: "Main result", exact: true }),
  ).toContainText(/7 yr\s+5 mo/);
  await noOverflow(page);
});
