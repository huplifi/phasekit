import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import legacy from "../fixtures/beta9-field-reports.json" with { type: "json" };
import {
  completeExternalCertificate,
  openReportSection,
} from "./helpers/commissioning";

async function importBackup(page: Page, value: unknown) {
  await page.goto("/#/settings");
  await page.getByLabel("Tuo varmuuskopio", { exact: true }).setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await page.goto("/#/reports");
  await expect(page.locator(".field-report-link")).toHaveCount(10);
}
async function exportBackup(page: Page) {
  await page.goto("/#/settings");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Vie varmuuskopio", exact: true })
    .click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8"));
}

test("beta9 reports preserve all original fields through import, print and export", async ({
  page,
}) => {
  await importBackup(page, legacy);
  for (const report of legacy.checklistDrafts) {
    await page.goto(`/#/checklists/${report.id}`);
    await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
      report.title,
    );
    const pending = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Tulosta / PDF", exact: true })
      .click();
    const printed = await pending;
    for (const text of [
      report.fields.finding,
      report.fields.instructions,
      report.notes,
      report.fields.signatureName,
    ])
      await expect(printed.locator("body")).toContainText(text);
    await printed.close();
  }
  expect((await exportBackup(page)).checklistDrafts).toEqual(
    legacy.checklistDrafts,
  );
});

test("company licence can be added without reinterpreting saved personal licences", async ({
  page,
}) => {
  const backup = structuredClone(legacy);
  for (const report of backup.checklistDrafts.filter(
    (item) => item.kind === "commissioning",
  )) {
    Object.assign(report.fields, {
      installerCompany: "Test Company",
      installerQualificationNumber: "PERSON-INST-1",
      responsiblePerson: "Test Responsible Person",
      responsibleQualificationNumber: "EXISTING-NUMBER-1",
    });
  }
  await importBackup(page, backup);
  // Merely opening an existing report must not move or rewrite its numbers.
  for (const report of backup.checklistDrafts.filter(
    (item) => item.kind === "commissioning",
  )) {
    await page.goto(`/#/checklists/${report.id}`);
    await openReportSection(page, "Asentaja ja vastuuhenkilö");
    await expect(
      page.getByLabel("Yrityksen lupanumero (valinnainen)", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Asentajan lupanumero", { exact: true }),
    ).toHaveValue("PERSON-INST-1");
    await expect(
      page.getByLabel("Vastuuhenkilön lupanumero", { exact: true }),
    ).toHaveValue("EXISTING-NUMBER-1");
  }
  expect((await exportBackup(page)).checklistDrafts).toEqual(
    backup.checklistDrafts,
  );

  const original = backup.checklistDrafts.find(
    (item) => item.kind === "commissioning" && item.status === "draft",
  )!;
  await page.goto(`/#/checklists/${original.id}`);
  await openReportSection(page, "Asentaja ja vastuuhenkilö");
  await page
    .getByLabel("Yrityksen lupanumero (valinnainen)", { exact: true })
    .fill("COMPANY-1");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  await page.reload();
  await openReportSection(page, "Asentaja ja vastuuhenkilö");
  await expect(
    page.getByLabel("Yrityksen lupanumero (valinnainen)", { exact: true }),
  ).toHaveValue("COMPANY-1");
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const printed = await pending;
  for (const [label, value] of [
    ["Yrityksen lupanumero (valinnainen)", "COMPANY-1"],
    ["Asentajan lupanumero", "PERSON-INST-1"],
    ["Vastuuhenkilön lupanumero", "EXISTING-NUMBER-1"],
  ]) {
    await expect(
      printed.locator(".detail-list > div").filter({
        has: printed.getByText(label, { exact: true }),
      }),
    ).toContainText(value);
  }
  await printed.close();
  const saved = (await exportBackup(page)).checklistDrafts;
  expect(
    saved.find((item: { id: string }) => item.id === original.id).fields,
  ).toEqual({
    ...original.fields,
    installerCompanyQualificationNumber: "COMPANY-1",
    operatorDeclaration: "",
  });
  expect(
    saved.filter((item: { id: string }) => item.id !== original.id),
  ).toEqual(backup.checklistDrafts.filter((item) => item.id !== original.id));
});

test("long legacy observations survive note edits and multi-page printing", async ({
  page,
}, info) => {
  const backup = structuredClone(legacy);
  const report = backup.checklistDrafts.find(
    (item) => item.id === "old-evacuation-draft",
  )!;
  report.fields.finding =
    "Alkuperäinen havainto. ".repeat(100).slice(0, 1978) + " HAVAINTOLoppu";
  report.notes =
    "Pitkä muistiinpano, säilytettävä kokonaan. ".repeat(260).slice(0, 9978) +
    " MUISTIINPANOLoppu";
  await importBackup(page, backup);
  await page.goto(`/#/checklists/${report.id}`);
  const note = page.getByRole("textbox", {
    name: "Havainnot ja muistiinpanot",
    exact: true,
  });
  await note.fill("Muokattu muistiinpano");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  await expect(
    page.getByText(report.fields.finding, { exact: true }),
  ).toBeVisible();
  // Restore a long note: both full limits must remain printable, including their ends.
  await note.fill(report.notes);
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const printed = await pending;
  await expect(printed.locator("body")).toContainText("HAVAINTOLoppu");
  await expect(printed.locator("body")).toContainText("MUISTIINPANOLoppu");
  if (info.project.name === "desktop-chromium")
    await printed.pdf({
      path: info.outputPath("legacy-long.pdf"),
      format: "A4",
      printBackground: true,
    });
  const saved = (await exportBackup(page)).checklistDrafts.find(
    (item: { id: string }) => item.id === report.id,
  );
  expect(saved.fields.finding).toBe(report.fields.finding);
  expect(saved.notes).toBe(report.notes);
});

test("installation bundle guides missing fields and includes real internal test records", async ({
  page,
}, info) => {
  await page.goto("/#/checklists/new");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("commissioning");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Asennustyö / testikohde");
  await page.getByLabel("Laite / tunniste", { exact: true }).fill("ILP-1");
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-10-02");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testiasentaja");
  await page
    .getByRole("button", { name: "Lukitse raportti", exact: true })
    .click();
  await expect(
    page.locator("#report-field-installationLocation input"),
  ).toBeFocused();
  await expect(page.getByRole("alert")).toContainText(
    "Täydennä asennustodistuksen tiedot",
  );
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
  await completeExternalCertificate(page);
  for (const [section, id] of [
    ["Tiiviyskoe", "tightness"],
    ["Tyhjiöinti ja pitokoe", "evacuation"],
    ["Koekäyttö", "testRun"],
  ]) {
    await openReportSection(page, section);
    await page
      .locator(`#report-field-${id}RecordMode select`)
      .selectOption("internal");
  }
  for (const [id, value] of Object.entries({
    tightnessMedium: "Typpi",
    tightnessCriterion: "Valmistajan ohje TEST-1: 30 bar(g), 30 min",
    tightnessStart: "10:00, 30 bar(g), 20 °C",
    tightnessEnd: "10:30, 30 bar(g), 20 °C",
    tightnessFinding: "Ei havaittua vuotoa",
    targetPressure: "0.5",
    holdAcceptanceCriterion: "TEST-1: enintään 0.8 mbar 15 min kuluttua",
    instrumentName: "Testimittari M1",
    holdStartPressure: "0.5",
    holdEndPressure: "0.7",
    holdMinutes: "15",
    evacuationFinding: "Mitattu paineen nousu 0.2 mbar",
    conditions: "Sisäilma 21 °C, jäähdytyskäyttö",
    testRunMeasurements: "Puhallus 12 °C, imu 21 °C",
    testRunFinding: "Koekäyttö kirjattu",
  }))
    await page
      .locator(`#report-field-${id}`)
      .locator("input, textarea")
      .fill(value);
  await page.locator("#report-field-vacuumUnit select").selectOption("mbar");
  // Re-evaluation follows charge changes; an empty input cannot retain the prior exemption.
  await page.getByLabel("Täyttömäärä · kg", { exact: true }).fill("");
  await expect(
    page.locator("#report-field-leakCheckInterval"),
  ).not.toContainText("kynnys ei täyty");
  await page.getByLabel("Täyttömäärä · kg", { exact: true }).fill("20");
  await expect(page.locator("#report-field-leakCheckInterval")).toContainText(
    "12 kuukauden",
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Toiminnanharjoittajan vakuutus",
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("checkbox", {
      name: "Toiminnanharjoittajan vakuutus",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Lukitse raportti", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Luo uusi versio", exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / PDF", exact: true })
    .click();
  const printed = await pending;
  await expect(printed.locator("h1")).toHaveText(
    "Asennustodistus ja käyttöönottopöytäkirjat",
  );
  await expect(printed.locator(".protocol-manifest a")).toHaveCount(3);
  for (const id of ["tightness", "evacuation", "test-run"])
    await expect(printed.locator(`#protocol-${id}`)).toHaveCount(1);
  await expect(printed.locator("body")).toContainText("TEST-1");
  await expect(printed.locator("body")).toContainText(
    "Vastuuhenkilön allekirjoitus",
  );
  if (info.project.name === "desktop-chromium")
    await printed.pdf({
      path: info.outputPath("installation-bundle.pdf"),
      format: "A4",
      printBackground: true,
    });
});
