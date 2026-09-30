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
    await expect(page.locator(".pt-live-result")).toBeVisible();
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
  await expect(page.locator(".pt-live-result")).toContainText("R410A");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(Number(await pressure.inputValue())).toBeCloseTo(35.1, 1);
  await page
    .getByLabel("Lämpötilapiste", { exact: true })
    .selectOption("bubble");
  await expect(page.locator(".pt-live-result")).toContainText("kuplapiste");
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

test("P–T result card follows the last edited value and clears invalid results", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  const pressure = page.getByLabel("Paine", { exact: true });
  const temperature = page.getByLabel("Lämpötila", { exact: true });

  await pressure.fill("5");
  const result = page.locator(".pt-live-result");
  await expect(result).toContainText(
    /Laskettu lämpötila|Calculated temperature/,
  );
  await expect(result).toContainText("R134a");
  await expect(result).toContainText(
    /Syötetystä paineesta|Based on entered pressure/,
  );
  await expect(result).toContainText("5 bar(a)");

  await temperature.fill("20");
  await expect(result).toContainText(/Laskettu paine|Calculated pressure/);
  await expect(result).toContainText(
    /Syötetystä lämpötilasta|Based on entered temperature/,
  );
  await expect(result).toContainText("20 °C");

  await temperature.fill("-999");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".pt-live-result")).toHaveCount(0);
});

test("P–T blend result card identifies the selected phase boundary", async ({
  page,
}) => {
  await page.goto("/#/pt/r134a");
  await choose(page, "R410A");
  await page.getByLabel("Paine", { exact: true }).fill("5");

  const result = page.locator(".pt-live-result");
  await expect(result).toContainText(/Höyry · kastepiste|Vapour · dew point/);
  await page
    .getByLabel("Lämpötilapiste", { exact: true })
    .selectOption("bubble");
  await expect(result).toContainText(
    /Neste · kuplapiste|Liquid · bubble point/,
  );
});
