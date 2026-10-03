import { expect, test } from "@playwright/test";

test("equipment history tolerates an imported legacy work-date value", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/equipment");
  await expect(
    page.getByRole("heading", { name: "Laitteet ja kohteet", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction("user", "readwrite");
    transaction.objectStore("user").put(
      {
        schemaVersion: 1,
        favourites: [],
        recent: [],
        snapshots: [],
        toolRecords: [],
        locale: "fi",
        theme: "system",
        equipment: [
          {
            id: "legacy-equipment",
            name: "Legacy unit",
            location: "",
            notes: "",
            updatedAt: "2026-09-26T12:00:00.000Z",
          },
        ],
        checklistDrafts: [
          {
            id: "legacy-field-report",
            kind: "commissioning",
            equipmentId: "legacy-equipment",
            title: "Legacy site",
            fields: { performedOn: "unknown" },
            checkedIds: [],
            notes: "",
            updatedAt: "2026-09-26T12:00:00.000Z",
          },
        ],
      },
      "state",
    );
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await page.locator(".equipment-history > summary").click();
  await expect(page.locator(".equipment-field-report-link")).toContainText(
    "Legacy site",
  );
  await expect(page.locator(".equipment-field-report-link")).toContainText(
    "26.9.2026",
  );
  await expect(page.locator(".equipment-field-report-link")).toContainText(
    "Luonnos",
  );
  expect(errors).toEqual([]);
});

test("equipment history opens reports and preserves final field records through rename and deletion", async ({
  page,
}) => {
  await page.goto("/#/equipment");
  await page.getByRole("button", { name: "Lisää laite", exact: true }).click();
  await page.getByLabel("Nimi", { exact: true }).fill("Kone #1");
  await page.getByLabel("Sijainti", { exact: true }).fill("Työsali / KEUDA");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await page.goto("/#/checklists");
  await page
    .getByRole("combobox", { name: "Raporttipohja", exact: true })
    .selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Liitä laitteeseen", exact: true })
    .selectOption({ label: "Kone #1" });
  await page.getByLabel("Suorituspäivä", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testaaja");
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  await page
    .getByRole("button", { name: "Lukitse raportti", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Luo uusi versio", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".field-report-save-state").last()).toContainText(
    "Tallennettu automaattisesti",
  );
  const finalUrl = page.url();
  const readReports = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("phasekit");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const records = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction("user").objectStore("user").get("state");
        request.onsuccess = () => resolve(request.result.checklistDrafts);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return records;
    });
  await expect
    .poll(async () => {
      const records = (await readReports()) as { status?: string }[];
      return records[0]?.status;
    })
    .toBe("final");
  const frozen = await readReports();
  await page.goto("/#/equipment");
  const card = page.locator(".equipment-card");
  await card.locator(".equipment-history > summary").click();
  const link = card.locator(".equipment-field-report-link");
  await expect(link).toContainText("Tyhjiöinti");
  await expect(link).toContainText("Työsali / KEUDA");
  await expect(link).toContainText("26.9.2026");
  await expect(link).toContainText("Valmis");
  await link.click();
  await expect(page).toHaveURL(finalUrl);
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Työsali / KEUDA",
  );
  await page.goto("/#/equipment");
  await card.locator(".equipment-actions > summary").click();
  await card.getByRole("button", { name: "Muokkaa", exact: true }).click();
  await page.getByLabel("Nimi", { exact: true }).fill("Kone #1 renamed");
  await page.getByLabel("Sijainti", { exact: true }).fill("New location");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(link).toContainText("Työsali / KEUDA");
  await expect.poll(readReports).toEqual(frozen);
  page.once("dialog", (dialog) => dialog.accept());
  await card.locator(".equipment-actions > summary").click();
  await card.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto("/#/reports");
  await page.locator(".field-report-link").click();
  await expect(page).toHaveURL(finalUrl);
  await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Työsali / KEUDA",
  );
  await expect(page.locator(".field-report-editor")).toContainText(
    "Tämä raportti on viimeistelty",
  );
  expect(await readReports()).toEqual(frozen);
});
