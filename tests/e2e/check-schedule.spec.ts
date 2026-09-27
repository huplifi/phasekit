import { expect, test } from "@playwright/test";

test("next inspection and shareable explanation survive a saved snapshot", async ({
  page,
}) => {
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page.locator("#check-date").fill("2026-09-26");
  await page.locator("#check-last-inspection").fill("2026-01-31");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  const schedule = page.locator(".check-schedule");
  await expect(schedule).toContainText("31.1.2027");
  await schedule.getByText("Näytä jaettava selite", { exact: true }).click();
  await expect(schedule.locator(".share-text")).toContainText("2027-01-31");
  await expect(schedule.locator(".share-text")).toContainText("R134a");
  await expect(schedule.locator(".share-text")).toContainText("Sääntöversio");
  const printPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const printed = await printPromise;
  await expect(printed.locator(".hero")).toContainText(
    "Seuraava vuototarkastus viimeistään",
  );
  await expect(printed.locator(".hero")).toContainText("31.1.2027");
  await expect(printed.locator("body")).toContainText("Kiinteä jäähdytyslaite");
  await expect(
    printed
      .locator("dt")
      .filter({ hasText: /^Vuodonilmaisu$/ })
      .locator("+ dd"),
  ).toHaveText("Ei");
  await expect(printed.locator("body")).toContainText("Aineosien laskenta");
  await expect(printed.locator("body")).not.toContainText("Vaaditut tiedot");
  await expect(printed.locator("body")).toContainText("Sääntöversio");
  await page
    .getByRole("button", { name: "Tallenna laskelma", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Laskelma tallennettu.", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/reports");
  await page.locator(".saved-entry > summary").first().click();
  await expect(page.locator(".check-schedule")).toContainText("31.1.2027");
  await page.reload();
  await page.locator(".saved-entry > summary").first().click();
  await expect(page.locator(".check-schedule")).toContainText("31.1.2027");
});

test("assessment date alone never creates a completed inspection or due date", async ({
  page,
}) => {
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  await expect(page.locator(".check-schedule")).toContainText(
    "Syötä viimeksi tehdyn tarkastuksen",
  );
  await expect(page.locator(".check-schedule strong")).toHaveCount(0);
});

test("overdue status uses the assessment date and precedes report actions", async ({
  page,
}) => {
  await page.goto("/#/check/r404a");
  await page.getByLabel("Täytös", { exact: true }).fill("20");
  await page.locator("#check-date").fill("2026-09-26");
  await page.locator("#check-last-inspection").fill("2025-11-01");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  const card = page.locator(".check-due-card");
  await expect(card).toHaveClass(/error/);
  await expect(card).toContainText("Tarkastus myöhässä");
  await expect(card).toContainText("26.9.2026");
  await expect(card).toContainText("1.5.2026");
  const dueBox = (await card.boundingBox())!;
  const actions = (await page.locator(".check-result-actions").boundingBox())!;
  expect(dueBox.y + dueBox.height).toBeLessThanOrEqual(actions.y);
  await page.locator("#check-date").fill("2026-05-01");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  await expect(card).not.toHaveClass(/error/);
  await expect(
    page.getByText("Tarkastus myöhässä", { exact: true }),
  ).toHaveCount(0);
});
