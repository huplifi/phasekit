import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

interface StoredMeasurement {
  id: string;
  point: string;
  result: string;
  unit: string;
  note: string;
  assessment: string;
  assessmentNote: string;
  photo?: string;
  technician: string;
  siteName: string;
  meter: { brand: string; model: string };
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{
      electricalMeasurements?: StoredMeasurement[];
      electricalSession?: { activeMeasurementId?: string };
    }>((resolve, reject) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state;
  });
}
async function prepare(page: Page) {
  await page.goto("/#/electrical-measurements");
  await expect(
    page.getByRole("heading", { name: "Sähkömittaukset", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Tulos", { exact: true })).toBeDisabled();
  await page.getByLabel("Kohteen nimi", { exact: true }).fill("Testikohde");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testaaja");
}

test("measurement autosaves locally without report, survives offline and reload, and copies only point context", async ({
  page,
  context,
}) => {
  await prepare(page);
  await page.getByLabel("Mittarin merkki", { exact: true }).fill("Fluke");
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1663");
  await page.getByLabel("Mittarin sarjanumero", { exact: true }).fill("M-123");
  await page
    .getByLabel("Mittauspiste tai ryhmä", { exact: true })
    .fill("Ryhmä 1");
  await page.getByLabel("Tulos", { exact: true }).fill("0,42");
  await page
    .getByLabel("Huomio (vapaaehtoinen)", { exact: true })
    .fill("Ensimmäisen pisteen huomio");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("0,42");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Tallennettu tälle laitteelle" }),
  ).toBeVisible();
  expect((await stored(page)).electricalMeasurements?.[0]).toMatchObject({
    siteName: "Testikohde",
    technician: "Testaaja",
    result: "0,42",
    assessment: "unassessed",
    meter: { brand: "Fluke", model: "1663" },
  });
  await context.setOffline(true);
  await page.getByLabel("Tulos", { exact: true }).fill("0.43");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("0.43");
  await expect(
    page.getByText("Tallennettu tälle laitteelle · ei palvelinsynkronointia", {
      exact: true,
    }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveValue("0.43");
  await page
    .getByRole("button", {
      name: "Seuraava piste edellisen pohjalta",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Mittauspiste tai ryhmä", { exact: true }),
  ).toHaveValue("Ryhmä 1");
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Huomio (vapaaehtoinen)", { exact: true }),
  ).toHaveValue("");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.length)
    .toBe(2);
  const copy = (await stored(page)).electricalMeasurements![1];
  expect(copy).toMatchObject({
    result: "",
    assessment: "unassessed",
    assessmentNote: "",
    note: "",
    unit: "Ω",
  });
  expect(copy.photo).toBeUndefined();
  await page.reload();
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveValue("");
  expect((await stored(page)).electricalSession?.activeMeasurementId).toBe(
    copy.id,
  );
  await expect(
    page.getByRole("heading", {
      name: "Mittauskerran kirjaukset · 1",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Mittaustyyppi", exact: true })
    .selectOption("insulation");
  await page.getByLabel("Vertailumerkki", { exact: true }).selectOption(">");
  await expect(
    page.getByRole("heading", {
      name: "Mittauskerran kirjaukset · 1",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Tulos", { exact: true }).fill("999");
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveAttribute(
    "inputmode",
    "decimal",
  );
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[1]?.result)
    .toBe("> 999");
  await page
    .getByLabel("Tekstinäppäimistö / mittarin ilmoitus", { exact: true })
    .check();
  await page.getByLabel("Tulos", { exact: true }).fill("> 999 MΩ");
  await expect(page.locator(".electrical-reading").last()).toContainText(
    "> 999 MΩ",
  );
  await expect(page.locator(".electrical-reading").last()).not.toContainText(
    "MΩ MΩ",
  );
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await expect(page).toHaveURL(/#\/electrical-reports\/new\?session=/);
});

test("manufacturer guidance gates exact model and stays accessible at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await prepare(page);
  await page.getByLabel("Mittarin merkki", { exact: true }).fill("Fluke");
  await expect(
    page.getByText("Valitse mittarimalli nähdäksesi mittarikohtaisen ohjeen", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1664");
  await expect(
    page.getByText("Valitse mittarimalli nähdäksesi mittarikohtaisen ohjeen", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1664 FC");
  await expect(
    page.getByText("Mittarin toiminto: RLO", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Mittaustyyppi", exact: true })
    .selectOption("insulation");
  await page.getByText("Näytä ohje", { exact: true }).click();
  await expect(page.getByText(/1664 FC: käytä Safety Pretest/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Fluke 1664 FC/ }),
  ).toHaveAttribute("href", /media\.fluke\.com\/.*#page=30$/);
  await expect(page.getByLabel("Yksikkö", { exact: true })).toHaveValue("MΩ");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page
    .getByRole("combobox", { name: "Mittaustyyppi", exact: true })
    .selectOption("phase-sequence");
  await expect(
    page.getByText(/Tälle mittaustyypille ei ole tarkistettua mittariohjetta/),
  ).toBeVisible();
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveAttribute(
    "inputmode",
    "text",
  );
});

test("photo is bounded and unsafe upload retains the previous image; copied point has no photo", async ({
  page,
}) => {
  await prepare(page);
  await page.getByText("Kuva ja mittaustiedot", { exact: true }).click();
  const input = page.getByLabel("Lisää kuva (vapaaehtoinen)", { exact: true });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "red";
    context.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.evaluate(() => {
    const decode = Image.prototype.decode;
    Image.prototype.decode = async function () {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return decode.call(this);
    };
  });
  await input.setInputFiles({
    name: "point.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page
    .getByLabel("Mittauspiste tai ryhmä", { exact: true })
    .fill("Kuvapiste");
  await expect(
    page.getByAltText("Mittauksen liitekuva", { exact: true }),
  ).toBeVisible();
  expect((await stored(page)).electricalMeasurements).toHaveLength(1);
  expect((await stored(page)).electricalMeasurements![0].point).toBe(
    "Kuvapiste",
  );
  await expect
    .poll(async () =>
      Boolean((await stored(page)).electricalMeasurements?.[0]?.photo),
    )
    .toBe(true);
  const photo = (await stored(page)).electricalMeasurements![0].photo!;
  expect(photo).toMatch(/^data:image\/jpeg;base64,/);
  expect(photo.length).toBeLessThanOrEqual(300_000);
  await input.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByRole("alert")).toContainText("aiempi kuva säilyy");
  expect((await stored(page)).electricalMeasurements![0].photo).toBe(photo);
  await page
    .getByRole("button", {
      name: "Seuraava piste edellisen pohjalta",
      exact: true,
    })
    .click();
  await expect(
    page.getByAltText("Mittauksen liitekuva", { exact: true }),
  ).toHaveCount(0);
});

test("failed local save retains inputs and retry makes the current reading durable", async ({
  page,
}) => {
  await prepare(page);
  await page
    .getByLabel("Mittauspiste tai ryhmä", { exact: true })
    .fill("Piste A");
  await page.getByLabel("Tulos", { exact: true }).fill("1,2");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("1,2");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, {
      restoreMeasurementPut: () => {
        IDBObjectStore.prototype.put = original;
      },
    });
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "user")
        throw new DOMException("Test storage full", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.getByLabel("Tulos", { exact: true }).fill("1,3");
  await expect(
    page.getByRole("status").filter({ hasText: "Tallennus epäonnistui" }),
  ).toBeVisible();
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveValue("1,3");
  expect((await stored(page)).electricalMeasurements![0].result).toBe("1,2");
  await page.evaluate(() =>
    (
      window as unknown as { restoreMeasurementPut: () => void }
    ).restoreMeasurementPut(),
  );
  await page
    .getByRole("button", { name: "Yritä tallentaa uudelleen", exact: true })
    .click();
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("1,3");
  await page.reload();
  await expect(page.getByLabel("Tulos", { exact: true })).toHaveValue("1,3");
});
