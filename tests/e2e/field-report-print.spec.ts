import { completeExternalCertificate } from "./helpers/commissioning";
import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("evacuation draft and final print keep measured facts, status and provenance", async ({
  page,
}, info) => {
  await page.goto("/#/checklists");
  await page.locator(".checklist-create select").selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Konehuone A");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("PK-17");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("S. Asentaja");
  await expect(
    page.getByLabel("Allekirjoituksen nimenselvennys", { exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".field-report-field")
    .filter({ hasText: "Tyhjiöpaineen yksikkö (absoluuttinen)" })
    .locator("select")
    .selectOption("mbar");
  await page.getByLabel("Tavoitepaine", { exact: true }).fill("0,30");
  await page.getByLabel("Saavutettu paine", { exact: true }).fill("0,25");
  await page.getByLabel("Pitokokeen alkupaine", { exact: true }).fill("0,25");
  await page.getByLabel("Pitokokeen loppupaine", { exact: true }).fill("0,29");
  await page.getByLabel("Pitokokeen kesto · min", { exact: true }).fill("15");
  await page
    .getByRole("textbox", { name: "Havainnot ja muistiinpanot", exact: true })
    .fill("Poikkeama kirjattu jatkotutkimusta varten.");

  const draftPopup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printedDraft = await draftPopup;
  await expect(printedDraft.locator("h1")).toHaveText(
    "Tyhjiöinti- ja pitokoeraportti",
  );
  await expect(printedDraft.locator(".document-status")).toContainText(
    "Luonnos",
  );
  await expect(printedDraft.locator(".document-subhead")).toContainText(
    "Konehuone A",
  );
  await expect(printedDraft.locator(".document-subhead")).toContainText(
    "PK-17",
  );
  await expect(printedDraft.locator(".field-summary")).toContainText(
    "0,04 mbar",
  );
  await expect(printedDraft.locator(".field-summary")).toContainText("15 min");
  await expect(printedDraft.locator("body")).toContainText(
    "Poikkeama kirjattu jatkotutkimusta varten.",
  );
  await expect(printedDraft.locator(".document-footer")).toContainText(
    "Raportin tunnus",
  );
  await expect(printedDraft.locator(".document-footer")).toContainText(
    "Tulostusohjelma: PhaseKit",
  );
  await expect(printedDraft.locator("body")).toContainText(
    "Allekirjoitus paperille",
  );
  await expect(printedDraft.locator(".signature-line")).toHaveCount(2);
  await expect(printedDraft.locator(".signature-caption")).toContainText([
    "Allekirjoitus",
    "Nimenselvennys",
  ]);
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("evacuation-draft.pdf"),
      await printedDraft.pdf({ format: "A4", printBackground: false }),
    );

  const finalise = page.getByRole("button", {
    name: "Lukitse raportti",
  });
  await expect(finalise).toBeEnabled();
  await finalise.click();
  const finalPopup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printedFinal = await finalPopup;
  await expect(printedFinal.locator(".document-status")).toContainText(
    "Viimeistelty raportti",
  );
  await expect(printedFinal.locator("body")).toContainText("Viimeistelty");
  await expect(printedFinal.locator(".field-summary")).toContainText(
    "0,04 mbar",
  );
  await expect(printedFinal.locator(".document-footer")).toContainText(
    "Kirjattu sovelluksella: PhaseKit",
  );
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("evacuation-final.pdf"),
      await printedFinal.pdf({ format: "A4", printBackground: false }),
    );
});

test("commissioning print keeps pressure reference, marked steps and written notes", async ({
  page,
}, info) => {
  await page.goto("/#/checklists");
  await page.locator(".checklist-create select").selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Kylmähuone 2");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("CH-2");
  await page
    .locator(".field-report-field")
    .filter({ hasText: "Paineyksikkö" })
    .locator("select")
    .selectOption("bar");
  await page
    .locator(".field-report-field")
    .filter({ hasText: "Paineviite" })
    .locator("select")
    .selectOption("gauge");
  await page.getByLabel("LP · imupaine", { exact: true }).fill("2,1");
  await page.getByLabel("HP · korkeapaine", { exact: true }).fill("12");
  await page.getByLabel("Imukaasun lämpötila · °C", { exact: true }).fill("-8");
  await page
    .getByRole("checkbox", {
      name: "Kohteen käyttöönotto-ohje ja perustiedot tarkistettu",
    })
    .check();
  await page
    .getByRole("textbox", { name: "Havainnot ja muistiinpanot", exact: true })
    .fill("Toimintakoe keskeytettiin; tarkista anturi.");
  await page
    .locator("summary")
    .filter({ hasText: "Tyhjiöinti ja pitokoe" })
    .click();
  await page
    .getByRole("combobox", {
      name: "Tyhjiöpaineen yksikkö (absoluuttinen)",
      exact: true,
    })
    .selectOption("mbar");
  await page.getByLabel("Saavutettu paine", { exact: true }).fill("0,25");
  await page.getByLabel("Pitokokeen alkupaine", { exact: true }).fill("0,25");
  await page.getByLabel("Pitokokeen loppupaine", { exact: true }).fill("0,29");
  await page.getByLabel("Pitokokeen kesto · min", { exact: true }).fill("15");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printed = await popup;
  await expect(printed.locator("h1")).toHaveText(
    "Asennustodistus ja käyttöönottopöytäkirjat",
  );
  await expect(
    printed.getByRole("heading", {
      name: "Tyhjiöinnin ja pitokokeen mittaukset",
    }),
  ).toBeVisible();
  await expect(printed.locator(".field-summary").nth(1)).toContainText(
    "0,04 mbar",
  );
  await expect(printed.locator(".field-summary").nth(1)).toContainText(
    "15 min",
  );
  await expect(printed.locator(".field-summary").first()).toContainText(
    "2,1 bar(g)",
  );
  await expect(printed.locator(".field-summary").first()).toContainText(
    "−8 °C",
  );
  await expect(
    printed.locator(".checklist-steps .checkmark").first(),
  ).toHaveText("☑");
  await expect(
    printed.locator(".checklist-steps .checkmark").nth(1),
  ).toHaveText("☐");
  await expect(printed.locator("body")).toContainText(
    "Toimintakoe keskeytettiin; tarkista anturi.",
  );
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("commissioning-draft.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
});

test("finalised commissioning print keeps the frozen cycle chart", async ({
  page,
}, info) => {
  await page.goto("/#/checklists/new");
  await page.locator(".checklist-create select").selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Kylmähuone 3");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("S. Asentaja");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("SN-123");
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  await page
    .getByPlaceholder("R-numero, nimi, CAS tai kauppanimi")
    .fill("R134a");
  await page
    .getByRole("button", {
      name: "Valitse kylmäaine työkalulle R134a",
      exact: true,
    })
    .click();
  await page.getByLabel("Täyttömäärä · kg", { exact: true }).fill("2");
  await page
    .locator(".field-report-field")
    .filter({ hasText: "Paineviite" })
    .locator("select")
    .selectOption("absolute");
  await page.getByLabel("LP · imupaine", { exact: true }).fill("2.5");
  await page.getByLabel("HP · korkeapaine", { exact: true }).fill("10");
  await page.getByLabel("Imukaasun lämpötila · °C", { exact: true }).fill("10");
  await page
    .getByLabel("Kuumakaasun lämpötila · °C", { exact: true })
    .fill("70");
  await page.getByLabel("Nesteen lämpötila · °C", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Muodosta log(p)–h-kaavio" }).click();
  const frozenSrc = await page
    .locator(".field-report-cycle img")
    .getAttribute("src");
  expect(frozenSrc).toContain("data:image/svg+xml");
  await completeExternalCertificate(page);
  const finalise = page.getByRole("button", {
    name: "Lukitse raportti",
  });
  await expect(finalise).toBeEnabled();
  await finalise.click();
  await expect(page.locator(".field-report-status")).toContainText("Valmis");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  const printed = await popup;
  await expect(printed.locator(".document-status")).toContainText(
    "Viimeistelty raportti",
  );
  await expect(printed.locator("body")).toContainText(
    "Liitetty kylmäkiertolaskelma",
  );
  await expect(printed.locator("body")).toContainText("Tulistus");
  await expect(printed.locator("body")).toContainText("Alijäähdytys");
  await expect(printed.locator("body")).toContainText(
    "Vastuuhenkilön allekirjoitus",
  );
  await expect(printed.locator("body")).toContainText(
    "Viitteet yksilöivät erilliset pöytäkirjat",
  );
  await expect(printed.locator("body")).toContainText(
    "Vakuutan toiminnanharjoittajan edustajana",
  );
  await expect(printed.locator("body")).not.toContainText("confirmed");
  await expect(printed.locator("img.chart")).toHaveAttribute("src", frozenSrc!);
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("commissioning-cycle.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
});
