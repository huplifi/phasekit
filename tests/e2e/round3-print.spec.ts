import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("direct and saved leak-check printouts keep the same dated assessment", async ({
  page,
}, info) => {
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page.locator("#check-date").fill("2026-09-26");
  await page.locator("#check-last-inspection").fill("2026-01-31");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  const directPopup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const direct = await directPopup;
  const hero = direct.locator(".hero");
  await expect(hero).toContainText("R134a · 10 kg");
  await expect(hero).toContainText("Seuraava vuototarkastus viimeistään");
  await expect(hero).toContainText("31.1.2027");
  await expect(hero).toContainText("Edellinen vuototarkastus");
  await expect(hero).toContainText("31.1.2026");
  await page
    .getByRole("button", { name: "Tallenna laskelma", exact: true })
    .click();
  await page.goto("/#/saved");
  await page.locator(".saved-entry > summary").first().click();
  const savedPopup = page.waitForEvent("popup");
  await page
    .locator(".saved-entry")
    .first()
    .getByRole("button", { name: "Tulosta / tallenna PDF" })
    .click();
  const saved = await savedPopup;
  await expect(saved.locator(".hero")).toHaveText((await hero.textContent())!);
  await expect(saved.locator("body")).toContainText("Sääntöversio");
  if (info.project.name === "desktop-chromium") {
    await writeFile(
      info.outputPath("leak-direct.pdf"),
      await direct.pdf({ format: "A4", printBackground: false }),
    );
    await writeFile(
      info.outputPath("leak-saved.pdf"),
      await saved.pdf({ format: "A4", printBackground: false }),
    );
  }
});

test("leak-check print does not invent a completed inspection", async ({
  page,
}) => {
  await page.goto("/#/check/r134a");
  await page.getByLabel("Täytös", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const printed = await popup;
  await expect(printed.locator(".hero")).toContainText(
    "Edellistä tarkastuspäivää ei kirjattu",
  );
  await expect(printed.locator(".hero")).toContainText(
    "Edellinen vuototarkastus",
  );
  await expect(printed.locator(".date-card-secondary strong")).toHaveText("—");
});

test("overdue leak-check PDF leads with the saved assessment date and compact evidence", async ({
  page,
}, info) => {
  await page.goto("/#/check/r404a");
  await page.getByLabel("Täytös", { exact: true }).fill("20");
  await page.locator("#check-date").fill("2026-09-26");
  await page.locator("#check-last-inspection").fill("2025-11-01");
  await page.getByRole("button", { name: "Laske tarkastusväli" }).click();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const printed = await popup;
  await expect(printed.locator(".hero")).toContainText(
    "Tarkastus myöhässä arviointipäivänä 26.9.2026",
  );
  await expect(printed.locator(".hero")).toContainText("1.5.2026");
  await expect(printed.locator(".compact-table")).toHaveCount(2);
  await expect(printed.locator(".compact-table").last()).toContainText(
    "F-kaasu, liite I, 50 t CO₂e",
  );
  await expect(printed.locator(".compact-table").first()).toContainText(
    "1,144 t",
  );
  await expect(printed.locator(".compact-table").last()).toContainText(
    "78,432 t CO₂e",
  );
  await expect(printed.locator("body")).not.toContainText("Vaaditut tiedot");
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("leak-r404a-overdue.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
});

test("commissioning print keeps marked steps, blank steps and written measurements", async ({
  page,
}, info) => {
  await page.goto("/#/checklists");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Konehuone A");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("PK-17");
  const longNotes =
    "Koekäynti keskeytettiin. Tarkista anturi.\n" +
    Array.from(
      { length: 65 },
      (_, index) =>
        `Havainto ${index + 1}: Mittaus kirjattu ja tarkistettava ennen hyväksyntää.`,
    ).join("\n");
  await page
    .getByRole("textbox", { name: "Muistiinpanot", exact: true })
    .fill(longNotes);
  const firstStep = page.getByRole("checkbox", {
    name: "Kohteen käyttöönotto-ohje ja perustiedot tarkistettu",
  });
  await firstStep.check();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printed = await popup;
  await expect(printed.locator("body")).toContainText("Konehuone A");
  await expect(printed.locator("body")).toContainText("PK-17");
  await expect(
    printed.locator(".checklist-steps .checkmark").first(),
  ).toHaveText("☑");
  await expect(
    printed.locator(".checklist-steps .checkmark").nth(1),
  ).toHaveText("☐");
  await expect(printed.locator("body")).toContainText(
    "Koekäynti keskeytettiin. Tarkista anturi.",
  );
  await expect(printed.locator("body")).toContainText("eivät yksin osoita");
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("commissioning-long.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
});

test("direct tool print keeps its primary result and inputs together", async ({
  page,
}, info) => {
  await page.goto("/#/pipe");
  await page
    .getByRole("textbox", { name: "Sisähalkaisija · mm", exact: true })
    .fill("20");
  await page
    .getByRole("textbox", { name: "Pituus · m", exact: true })
    .fill("10");
  await page.getByRole("textbox", { name: "Tilavuusvirta" }).fill("0.5");
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page.getByText("Tallenna tai tulosta", { exact: true }).click();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / tallenna PDF" }).click();
  const printed = await popup;
  await expect(printed.locator(".result-card")).not.toHaveCount(0);
  await expect(printed.locator("body")).toContainText("Lähtötiedot");
  await expect(printed.locator("body")).toContainText("20 mm");
  await expect(printed.locator("body")).toContainText(
    "Lähteet ja versiotiedot",
  );
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("pipe-direct.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
});
