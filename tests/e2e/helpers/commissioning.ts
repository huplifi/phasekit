import { expect, type Page } from "@playwright/test";

export async function openReportSection(page: Page, name: string) {
  const section = page
    .locator("details.field-report-optional")
    .filter({ has: page.locator("summary").filter({ hasText: name }) });
  if (!(await section.getAttribute("open"))) {
    // An empty open attribute is valid; inspect the property rather than its value.
    if (
      !(await section.evaluate(
        (element) => (element as HTMLDetailsElement).open,
      ))
    )
      await section.locator("summary").click();
  }
}

/** Complete certificate-only inputs using explicit external test records. */
export async function completeExternalCertificate(page: Page) {
  await openReportSection(page, "Asentaja ja vastuuhenkilö");
  for (const [label, value] of Object.entries({
    Asennusliike: "Test Company",
    "Laitteen käyttöpaikka": "Testiosoite 1, Testikaupunki",
    "Asentajan lupanumero": "INST-1",
    "Vastuuhenkilön nimi": "Responsible person",
    "Vastuuhenkilön lupanumero": "RESP-1",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("combobox", {
      name: "Laitetyyppi vuototarkastusta varten",
      exact: true,
    })
    .selectOption("stationary_refrigeration");
  await page
    .getByRole("combobox", {
      name: "Vuodonilmaisujärjestelmä asennettu",
      exact: true,
    })
    .selectOption("no");
  await page
    .getByRole("combobox", {
      name: "Laite ilmatiiviisti suljettu",
      exact: true,
    })
    .selectOption("no");
  await expect(page.locator("#report-field-leakCheckInterval")).toContainText(
    "kynnys ei täyty",
  );
  for (const [section, mode, reference] of [
    ["Tiiviyskoe", "tightnessRecordMode", "tightnessTestReportReference"],
    [
      "Tyhjiöinti ja pitokoe",
      "evacuationRecordMode",
      "evacuationReportReference",
    ],
    ["Koekäyttö", "testRunRecordMode", "testRunReportReference"],
  ]) {
    await openReportSection(page, section);
    await page.locator(`#report-field-${mode} select`).selectOption("external");
    await page
      .locator(`#report-field-${reference} input`)
      .fill(`Annex ${reference}`);
  }
  await openReportSection(page, "Painekoe, asiakirjat ja vakuutus");
  await page
    .locator("#report-field-pressureTestRequired select")
    .selectOption("no");
  await page
    .locator("#report-field-pressureAssessmentBasis select")
    .selectOption("equipment_documents");
  await page
    .locator("#report-field-pressureTestExemptionReason input")
    .fill("Documented equipment assessment");
  await page
    .getByRole("checkbox", {
      name: "Toiminnanharjoittajan vakuutus",
      exact: true,
    })
    .check();
}
