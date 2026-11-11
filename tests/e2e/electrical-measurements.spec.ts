import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

interface StoredMeasurement {
  id: string;
  type: string;
  pointId?: string;
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
function row(page: Page, type = "continuity") {
  return page.locator(`.electrical-sheet-row[data-type="${type}"]`).first();
}
function result(page: Page, type = "continuity") {
  return row(page, type).locator(".electrical-sheet-inputs input");
}
async function prepare(page: Page) {
  await page.goto("/#/electrical-measurements");
  await expect(
    page.getByRole("heading", { name: "Sähkömittaukset", exact: true }),
  ).toBeVisible();
  await expect(result(page)).toBeDisabled();
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
  await result(page).fill("0,42");
  await result(page, "voltage").fill("230");
  await row(page).getByText("Ohje ja lisätiedot", { exact: true }).click();
  await row(page)
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
  await result(page).fill("0.43");
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
  await expect(result(page)).toHaveValue("0.43");
  await page
    .getByRole("button", {
      name: "Seuraava piste edellisen pohjalta",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Mittauspiste tai ryhmä", { exact: true }),
  ).toHaveValue("Ryhmä 1");
  await expect(result(page)).toHaveValue("");
  await expect(
    row(page).getByLabel("Huomio (vapaaehtoinen)", { exact: true }),
  ).toHaveValue("");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.length)
    .toBe(4);
  const copies = (await stored(page)).electricalMeasurements!.slice(2);
  const copy = copies[0];
  expect(copies).toHaveLength(2);
  for (const copied of copies) {
    expect(copied).toMatchObject({
      result: "",
      assessment: "unassessed",
      assessmentNote: "",
      note: "",
    });
    expect(copied.photo).toBeUndefined();
  }
  await expect(result(page, "voltage")).toHaveValue("");
  expect(copy).toMatchObject({
    result: "",
    assessment: "unassessed",
    assessmentNote: "",
    note: "",
    unit: "Ω",
  });
  expect(copy.photo).toBeUndefined();
  await page.reload();
  await expect(result(page)).toHaveValue("");
  expect((await stored(page)).electricalSession?.activeMeasurementId).toBe(
    copy.id,
  );
  await expect(
    page.getByRole("heading", {
      name: "Mittauskerran pisteet · 2",
      exact: true,
    }),
  ).toBeVisible();
  await row(page, "insulation")
    .getByText("Ohje ja lisätiedot", { exact: true })
    .click();
  await row(page, "insulation").getByRole("combobox").selectOption(">");
  await expect(page.locator(".electrical-point-summary").last()).toContainText(
    "0 kirjattua",
  );
  await result(page, "insulation").fill("999");
  await row(page, "insulation").getByRole("combobox").selectOption(">");
  await expect(result(page, "insulation")).toHaveValue("> 999");
  await expect(result(page, "insulation")).toHaveAttribute(
    "inputmode",
    "decimal",
  );
  await expect
    .poll(
      async () =>
        (await stored(page)).electricalMeasurements?.find(
          (item) => item.type === "insulation",
        )?.result,
    )
    .toBe("> 999");
  await row(page, "insulation")
    .getByLabel("Tekstinäppäimistö / mittarin ilmoitus", { exact: true })
    .check();
  await result(page, "insulation").fill("> 999 MΩ");
  await expect(page.locator(".electrical-point-summary").last()).toContainText(
    "> 999 MΩ",
  );
  await expect(
    page.locator(".electrical-point-summary").last(),
  ).not.toContainText("MΩ MΩ");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await expect(page).toHaveURL(/#\/electrical-reports\/new\?session=/);
});

test("all nine optional rows are directly fillable; exact-model guidance and compact sheet stay accessible at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await prepare(page);
  await expect(page.locator(".electrical-sheet-row")).toHaveCount(9);
  await expect(
    page.getByRole("combobox", { name: "Mittaustyyppi", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Uusi mittaus", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Mittarin merkki", { exact: true }).fill("Fluke");
  await row(page).getByText("Ohje ja lisätiedot", { exact: true }).click();
  await expect(
    row(page).getByText(
      "Valitse mittarimalli nähdäksesi mittarikohtaisen ohjeen",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1664");
  await expect(
    row(page).getByText(
      "Valitse mittarimalli nähdäksesi mittarikohtaisen ohjeen",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Mittarimalli", { exact: true }).fill("1664 FC");
  await expect(
    row(page).getByText("Mittarin toiminto: RLO", { exact: true }),
  ).toBeVisible();
  await row(page, "insulation")
    .getByText("Ohje ja lisätiedot", { exact: true })
    .click();
  await row(page, "insulation")
    .getByText("Näytä ohje", { exact: true })
    .click();
  await expect(
    row(page, "insulation").getByText(/1664 FC: käytä Safety Pretest/),
  ).toBeVisible();
  await expect(
    row(page, "insulation").getByRole("link", { name: /Fluke 1664 FC/ }),
  ).toHaveAttribute("href", /media\.fluke\.com\/.*#page=30$/);
  await expect(
    row(page, "insulation").getByLabel("Yksikkö", { exact: true }),
  ).toHaveValue("MΩ");
  await result(page).fill("0,3");
  await result(page, "insulation").fill("999");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.length)
    .toBe(2);
  const state = await stored(page);
  expect(state.electricalMeasurements).toHaveLength(2);
  expect(state.electricalMeasurements![0].pointId).toBe(
    state.electricalMeasurements![1].pointId,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await row(page, "phase-sequence")
    .getByText("Ohje ja lisätiedot", { exact: true })
    .click();
  await expect(
    row(page, "phase-sequence").getByText(
      /Tälle mittaustyypille ei ole tarkistettua mittariohjetta/,
    ),
  ).toBeVisible();
  await expect(result(page, "phase-sequence")).toHaveAttribute(
    "inputmode",
    "text",
  );
});

test("photo is bounded and unsafe upload retains the previous image; copied point has no photo", async ({
  page,
}) => {
  await prepare(page);
  await row(page).getByText("Ohje ja lisätiedot", { exact: true }).click();
  const input = row(page).getByLabel("Lisää kuva (vapaaehtoinen)", {
    exact: true,
  });
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
  await result(page).fill("1,2");
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
  await result(page).fill("1,3");
  await expect(
    page.getByRole("status").filter({ hasText: "Tallennus epäonnistui" }),
  ).toBeVisible();
  await expect(result(page)).toHaveValue("1,3");
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
  await expect(result(page)).toHaveValue("1,3");
});

test("legacy readings with the same point name remain separate when new sibling rows are added", async ({
  page,
}) => {
  await prepare(page);
  await page
    .getByLabel("Mittauspiste tai ryhmä", { exact: true })
    .fill("Vanha piste");
  await result(page).fill("0,4");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.[0]?.result)
    .toBe("0,4");
  const untouched = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("phasekit");
      request.onsuccess = () => resolve(request.result);
    });
    const state = await new Promise<Record<string, unknown>>((resolve) => {
      const request = db.transaction("user").objectStore("user").get("state");
      request.onsuccess = () => resolve(request.result);
    });
    const first = {
      ...(state.electricalMeasurements as Record<string, unknown>[])[0],
    };
    delete first.pointId;
    const second = {
      ...first,
      id: crypto.randomUUID(),
      type: "insulation",
      result: "500",
      unit: "MΩ",
    };
    state.electricalMeasurements = [first, second];
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("user", "readwrite");
      transaction.objectStore("user").put(state, "state");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    return second;
  });
  await page.reload();
  await expect(page.locator(".electrical-point-summary")).toHaveCount(2);
  await expect(result(page)).toHaveValue("0,4");
  await expect(result(page, "insulation")).toHaveValue("");
  await result(page, "voltage").fill("231");
  await expect
    .poll(async () => (await stored(page)).electricalMeasurements?.length)
    .toBe(3);
  expect((await stored(page)).electricalMeasurements![1]).toEqual(untouched);
  await page.locator(".electrical-point-summary").last().click();
  await expect(result(page, "insulation")).toHaveValue("500");
  await expect(result(page, "voltage")).toHaveValue("");
  await expect(page.locator(".electrical-point-summary").last()).toHaveCSS(
    "box-shadow",
    "none",
  );
});
