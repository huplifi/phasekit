import { expect, test } from "@playwright/test";

for (const input of [
  {
    id: "r1224ydz",
    lp: "0.6",
    hp: "2",
    suction: "20",
    hot: "60",
    liquid: "10",
  },
  { id: "r454c", lp: "4", hp: "14", suction: "15", hot: "70", liquid: "15" },
]) {
  test(`${input.id} supports both P–T and a complete refrigeration cycle`, async ({
    page,
  }) => {
    await page.goto(`/#/pt/${input.id}`);
    await page.getByLabel("Lämpötila", { exact: true }).fill("20");
    await expect(page.locator("#pt-pressure")).not.toHaveValue("");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.goto(`/#/ph/${input.id}`);
    await page.locator("#shsc-lp").fill(input.lp);
    await page.locator("#shsc-hp").fill(input.hp);
    await page.locator("#shsc-suction").fill(input.suction);
    await page.locator("#shsc-hot-gas").fill(input.hot);
    await page.locator("#shsc-liquid").fill(input.liquid);
    await page.getByRole("button", { name: "Laske", exact: true }).click();
    await expect(page.locator(".ph-cycle")).toHaveCount(4);
    await expect(page.locator(".ph-diagram-message")).toHaveCount(0);
  });
}

test("R410A heating measurements also produce a bounded log(p)-h cycle", async ({
  page,
}) => {
  await page.goto("/#/ph/r410a");
  // 8 / 35 bar(g), converted with the explicit 1.01325 bar atmosphere.
  await page.locator("#shsc-lp").fill("9.01325");
  await page.locator("#shsc-hp").fill("36.01325");
  await page.locator("#shsc-suction").fill("15");
  await page.locator("#shsc-hot-gas").fill("85");
  await page.locator("#shsc-liquid").fill("45");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await expect(page.locator(".ph-results")).toBeVisible();
  await expect(page.locator(".ph-cycle")).toHaveCount(4);
  await expect(page.locator(".ph-diagram-message")).toHaveCount(0);
});

test("R410A heating case works and genuine bounds explain the data limit", async ({
  page,
}) => {
  await page.goto("/#/pt/r410a");
  const temperature = page.getByLabel("Lämpötila", { exact: true });
  const pressure = page.getByLabel("Paine", { exact: true });
  await temperature.fill("56");
  await expect(page.locator(".picker-compact-trigger")).toContainText("R410A");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const provenance = page.locator(".calculation-details");
  await provenance.locator(":scope > summary").click();
  await expect(
    provenance.getByRole("heading", { name: "Laskentamalli", exact: true }),
  ).toBeVisible();
  await expect(
    provenance.getByRole("heading", { name: "Käyttöalue", exact: true }),
  ).toBeVisible();
  await expect(
    provenance.getByRole("heading", { name: "Lähteet", exact: true }),
  ).toBeVisible();
  await expect(provenance.locator(".source-disclosure")).toHaveCount(0);
  expect(Number((await pressure.inputValue()).replace(",", "."))).toBeCloseTo(
    35.1,
    1,
  );
  await page.getByRole("switch", { name: "Höyry / Neste" }).uncheck();
  await expect(
    page.getByRole("switch", { name: "Höyry / Neste" }),
  ).not.toBeChecked();
  await temperature.fill("80");
  await expect(pressure).toHaveValue("");
  await expect(page.getByRole("alert")).toContainText("tuettu alue");
  await expect(page.getByRole("alert")).toContainText(
    "ei ole laitteen käyttöraja",
  );
  await page.getByLabel("Lämpötilayksikkö").selectOption("F");
  await expect(page.getByRole("alert")).toContainText("°F");
});

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
  await expect(
    page.getByRole("button", {
      name: `Vaihda kylmäainetta: ${value}`,
      exact: true,
    }),
  ).toBeVisible();
}

test("P–T input and result follow the last edited value and clears invalid results", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  const pressure = page.getByLabel("Paine", { exact: true });
  const temperature = page.getByLabel("Lämpötila", { exact: true });

  await pressure.fill("5");
  await expect(page.locator("#pt-temperature-status")).toContainText(
    "Laskettu",
  );
  await expect(page.locator("#pt-pressure-status")).toContainText("Syötetty");
  await expect(temperature).toHaveValue("15,76");
  await expect(pressure).toHaveValue("5");

  await temperature.fill("20");
  await expect(page.locator("#pt-pressure-status")).toContainText("Laskettu");
  await expect(page.locator("#pt-temperature-status")).toContainText(
    "Syötetty",
  );
  await expect(temperature).toHaveValue("20");

  await temperature.fill("-999");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".pt-reading")).toHaveCount(0);
  await expect(pressure).toHaveValue("");
});

test("P–T blend controls identify the selected phase boundary", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  await choose(page, "R410A");
  await page.getByLabel("Paine", { exact: true }).fill("5");

  await expect(
    page.getByRole("switch", { name: "Höyry / Neste" }),
  ).toBeChecked();
  const before = await page.locator("#pt-temperature").inputValue();
  await page.getByRole("switch", { name: "Höyry / Neste" }).uncheck();
  await expect(
    page.getByRole("switch", { name: "Höyry / Neste" }),
  ).not.toBeChecked();
  await expect(page.locator("#pt-pressure")).toHaveValue("5");
  await expect(page.locator("#pt-temperature")).not.toHaveValue(before);
});

test("R452A keeps the entered dew point and pressure when viewing bubble", async ({
  page,
}) => {
  await page.goto("/#/pt/r452a");
  const pressure = page.locator("#pt-pressure");
  const temperature = page.locator("#pt-temperature");
  const phase = page.getByRole("switch", { name: "Höyry / Neste" });
  await temperature.fill("40,0");
  await expect(pressure).toHaveValue("17,59");
  await expect(page.locator(".pt-reading h2")).toHaveText(
    "Absoluuttinen paine",
  );
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).uncheck();
  await expect(pressure).toHaveValue("16,57");
  const reading = page.locator(".pt-reading");
  await expect(reading).toBeVisible();
  await expect(reading.getByRole("heading")).toHaveText("Mittaripaine");
  await expect(reading.locator(".pt-reading-value")).toHaveText("16,57 bar(g)");
  await phase.uncheck();
  await expect(pressure).toHaveValue("16,57");
  await expect(temperature).toHaveValue("36,60");
  await expect(reading.getByRole("heading")).toHaveText("Kuplapiste");
  await expect(reading.locator(".pt-reading-value")).toHaveText("36,60 °C");
  await expect(page.locator("#pt-temperature-status")).toContainText(
    "Laskettu",
  );
  await expect(page.locator(".pt-source-note")).toContainText("40,0 °C");
  await phase.check();
  await expect(temperature).toHaveValue("40,0");
  await expect(page.locator("#pt-temperature-status")).toContainText(
    "Syötetty",
  );

  await phase.uncheck();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/reports");
  const entry = page.locator(".report-entry");
  await entry.click();
  await expect(entry).toContainText("Kastepiste 40 °C → Kuplapiste");
  await expect(entry).toContainText("36,603");
});

test("temperatures and gauge pressures accept a leading minus from the standard keyboard", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  const temperature = page.locator("#pt-temperature");
  const pressure = page.locator("#pt-pressure");
  await expect(temperature).toHaveAttribute("inputmode", "text");
  await expect(pressure).toHaveAttribute("inputmode", "decimal");
  await temperature.focus();
  await temperature.pressSequentially("-");
  await expect(temperature).toHaveValue("-");
  await temperature.pressSequentially("10,5");
  await expect(temperature).toHaveValue("-10,5");
  await expect(temperature).toBeFocused();
  await expect(page.locator(".pt-reading h2")).toHaveText(
    "Absoluuttinen paine",
  );
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).uncheck();
  await expect(pressure).toHaveAttribute("inputmode", "text");
  await pressure.fill("");
  await pressure.pressSequentially("-0,1");
  await expect(pressure).toHaveValue("-0,1");
  await expect(pressure).toBeFocused();
  await expect(temperature).toHaveValue(/^-\d/);
  await temperature.fill("−10,5");
  await expect(temperature).toHaveValue("-10,5");
  await expect(page.locator(".pt-reading h2")).toHaveText("Mittaripaine");
});
