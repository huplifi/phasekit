import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("general converter distinguishes temperature intervals and clears invalid results", async ({
  page,
}) => {
  await page.goto("/#/convert");
  await page
    .getByRole("combobox", { name: "Suure", exact: true })
    .selectOption("temperature_difference");
  await page
    .getByRole("combobox", { name: "Lähtöyksikkö", exact: true })
    .selectOption("°F Δ");
  await page
    .getByRole("combobox", { name: "Kohdeyksikkö", exact: true })
    .selectOption("K");
  await page.getByLabel("Arvo · °F Δ", { exact: true }).fill("-18");
  await expect(page.locator("output")).toHaveText(/[−-]10 K/);
  await page.getByLabel("Arvo · °F Δ", { exact: true }).fill("abc");
  await expect(page.locator("output")).toHaveCount(0);
  await expect(page.locator("#conversion-error")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Suure", exact: true })
    .selectOption("pressure");
  await page
    .getByRole("combobox", { name: "Lähtöyksikkö", exact: true })
    .selectOption("bar");
  await page
    .getByRole("combobox", { name: "Kohdeyksikkö", exact: true })
    .selectOption("kPa");
  await page
    .getByRole("combobox", { name: "Lähtöpaine", exact: true })
    .selectOption("gauge");
  await page.getByLabel("Arvo · bar", { exact: true }).fill("0");
  await expect(page.locator("output")).toHaveText("101,325 kPa (a)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("inverse CO2e calculation shows actual component masses and clears after edit", async ({
  page,
}) => {
  await page.goto("/#/co2e/r410a");
  // Route supports initial refrigerant like the other calculator deep links.
  await expect(page.getByRole("heading", { name: "kg ↔ CO₂e" })).toBeVisible();
  await page.getByRole("button", { name: "t CO₂e", exact: true }).click();
  await page.locator("#co2e-quantity").fill("20,875");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  const breakdown = page.locator(".co2e-breakdown");
  await expect(breakdown).toContainText("Laskettu massa: 10 kg");
  await expect(breakdown).toContainText("20,875 t CO₂e");
  await expect(breakdown.getByText("5 kg", { exact: true })).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.locator("#co2e-quantity").fill("21");
  await expect(breakdown).toHaveCount(0);
  await page.goto("/#/reports");
  const record = page.locator(".report-entry");
  await record.locator(":scope > summary").click();
  await expect(record).toContainText("R32 · massa");
  await expect(record).toContainText("R125 · massa");
  await expect(record).toContainText("20,875 t CO₂e");
  await expect(record).toContainText("EU-2024/573-Annex-I-AR4");
});

test("live conversion reports reset on edits and retain exact input and reference", async ({
  page,
}) => {
  await page.goto("/#/convert");
  await page
    .getByRole("combobox", { name: "Lähtöpaine", exact: true })
    .selectOption("gauge");
  await page.getByLabel("Arvo · bar", { exact: true }).fill("2,50");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Arvo · bar", { exact: true }).fill("3");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Arvo · bar", { exact: true }).fill("invalid");
  await expect(
    page.getByText("Tallenna tai tulosta", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/reports");
  const entry = page.locator(".report-entry");
  await entry.locator(":scope > summary").click();
  await expect(entry).toContainText("2,5 bar");
  await expect(entry).toContainText("1,01325 bar(a)");
  await expect(entry).toContainText("351,325 kPa");
  await expect(entry).toContainText("NIST SP 811");
  const downloaded = page.waitForEvent("download");
  await entry.getByRole("button", { name: "Vie JSON", exact: true }).click();
  const frozen = JSON.parse(
    await readFile(await (await downloaded).path(), "utf8"),
  );
  expect(
    frozen.inputs.find(
      (row: { label: { en: string } }) => row.label.en === "Entered value",
    ).value,
  ).toBe("2,50");
  expect(frozen.outputs[0].value).toBe("351.325");
});

test("PT saves model precision and phase boundary and removes save for invalid input", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  await page.locator("#pt-temperature").fill("20");
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.locator("#pt-temperature").fill("invalid");
  await expect(
    page.getByText("Tallenna tai tulosta", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/reports");
  const entry = page.locator(".report-entry");
  await entry.locator(":scope > summary").click();
  await expect(entry).toContainText("R134a (r134a)");
  await expect(entry).toContainText("20 °C");
  await expect(entry).toContainText("Kastepiste");
  await expect(entry).toContainText("P–T-aineistoversio");
});
