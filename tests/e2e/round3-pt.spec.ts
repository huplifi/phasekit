import { expect, test } from "@playwright/test";

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
