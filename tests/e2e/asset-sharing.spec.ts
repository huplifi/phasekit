import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { createSharedAssetLink } from "../../apps/web/src/asset-sharing-types";
import { buildAssetSnapshot } from "../../apps/web/src/asset-snapshot";
import { emptyData } from "../../apps/web/src/storage";
import { sharedAssetsHandler } from "../../netlify/lib/shared-assets";
import type {
  SharedDocument,
  SnapshotStore,
} from "../../netlify/lib/shared-assets";

test.use({ serviceWorkers: "block" });
const now = "2026-11-11T12:00:00.000Z";
function fixture() {
  return {
    ...emptyData(),
    sites: [
      {
        id: "site-qr",
        name: "Testikohde",
        address: "Testikatu 1",
        updatedAt: now,
      },
    ],
    equipment: [
      {
        id: "equipment-qr",
        siteId: "site-qr",
        name: "Lämpöpumppu",
        model: "Malli 1",
        serialNumber: "ABC-123",
        location: "Katolla",
        notes: "Huoltohuomio",
        updatedAt: now,
      },
    ],
  };
}
class MemoryStore implements SnapshotStore {
  entries = new Map<string, { data: SharedDocument; etag: string }>();
  revision = 0;
  async getWithMetadata(key: string) {
    return this.entries.get(key) ?? null;
  }
  async setJSON(
    key: string,
    data: SharedDocument,
    options: { onlyIfNew?: boolean; onlyIfMatch?: string },
  ) {
    const old = this.entries.get(key);
    if (
      (options.onlyIfNew && old) ||
      (options.onlyIfMatch && options.onlyIfMatch !== old?.etag)
    )
      return { modified: false };
    const etag = `"${++this.revision}"`;
    this.entries.set(key, { data, etag });
    return { modified: true, etag };
  }
}
function decode(pngBytes: Buffer) {
  const image = PNG.sync.read(pngBytes);
  return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
    ?.data;
}

test("explicit server sharing prints and downloads the same decodable permanent QR; read gate survives reload", async ({
  page,
}) => {
  const store = new MemoryStore();
  const handler = sharedAssetsHandler(store);
  let creates = 0;
  await page.route("**/api/shared-assets**", async (route) => {
    const input = route.request();
    if (input.method() === "POST" && input.url().endsWith("/shared-assets"))
      creates++;
    const response = await handler(
      new Request(input.url(), {
        method: input.method(),
        headers: input.headers(),
        body: input.postData() ?? undefined,
      }),
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  });
  await page.goto("/");
  await page.evaluate(async (data) => {
    const opening = indexedDB.open("phasekit", 1);
    await new Promise<void>((resolve, reject) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const transaction = db.transaction("user", "readwrite");
        transaction.objectStore("user").put(data, "state");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      opening.onerror = () => reject(opening.error);
    });
  }, fixture());
  await page.reload();
  await page.goto("/#/assets/equipment/equipment-qr");
  await expect(
    page.getByRole("heading", { name: "Lämpöpumppu", exact: true }),
  ).toBeVisible();
  await expect(page.getByAltText("QR-tarra: Lämpöpumppu")).toHaveCount(0);
  expect(creates).toBe(0);
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await expect(page.getByText("Mukana tulevat", { exact: false })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Jaa palvelimelle ja luo QR" })
    .click();
  const qr = page.getByAltText("QR-tarra: Lämpöpumppu");
  await expect(qr).toBeVisible();
  expect(creates).toBe(1);
  const state = await page.evaluate(async () => {
    const opening = indexedDB.open("phasekit", 1);
    return await new Promise<{
      sharedLinks: { id: string; readCode: string; writeSecret: string }[];
    }>((resolve) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const read = db.transaction("user").objectStore("user").get("state");
        read.onsuccess = () => {
          resolve(read.result);
          db.close();
        };
      };
    });
  });
  const link = state.sharedLinks[0];
  const expected = `${new URL(page.url()).origin}/#/shared/${link.id}`;
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Tallenna kuvana" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const downloadBytes = await readFile(path!);
  expect(decode(downloadBytes)).toBe(expected);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta", exact: true }).click();
  const popup = await popupPromise;
  const printImage = popup.locator("img");
  await expect(printImage).toHaveAttribute("src", /^data:image\/png;base64,/);
  const source = await printImage.getAttribute("src");
  expect(decode(Buffer.from(source!.split(",")[1], "base64"))).toBe(expected);
  expect(source).toBe(
    `data:image/png;base64,${downloadBytes.toString("base64")}`,
  );
  await popup.close();
  await page.goto(expected);
  await expect(
    page.getByRole("heading", { name: "Avaa jaettu kohde" }),
  ).toBeVisible();
  await expect(page.getByText("Huoltohuomio")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Lukukoodi", exact: true })
    .fill("0000-0000-0000-0000");
  await page.getByRole("button", { name: "Avaa tiedot", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Tietoja ei voitu avata");
  await page
    .getByRole("textbox", { name: "Lukukoodi", exact: true })
    .fill(link.readCode);
  await page.getByRole("button", { name: "Avaa tiedot", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lämpöpumppu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Jaettu palvelinkopio · vain luku"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Avaa jaettu kohde" }),
  ).toBeVisible();
  expect(page.url()).not.toContain(link.readCode);
  expect(page.url()).not.toContain(link.writeSecret);
});

test("failed first response keeps local sharing credentials and retries the same share ID", async ({
  page,
}) => {
  const store = new MemoryStore();
  const handler = sharedAssetsHandler(store);
  const ids: string[] = [];
  await page.route("**/api/shared-assets**", async (route) => {
    const input = route.request();
    const body = JSON.parse(input.postData()!);
    ids.push(body.id);
    const response = await handler(
      new Request(input.url(), {
        method: input.method(),
        headers: input.headers(),
        body: input.postData()!,
      }),
    );
    if (ids.length === 1) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  });
  await page.goto("/");
  await page.evaluate(async (data) => {
    const opening = indexedDB.open("phasekit", 1);
    await new Promise<void>((resolve) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("user", "readwrite");
        tx.objectStore("user").put(data, "state");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, fixture());
  await page.reload();
  await page.goto("/#/assets/site/site-qr");
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await page
    .getByRole("button", { name: "Jaa palvelimelle ja luo QR" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Palvelinjako ei onnistunut",
  );
  await expect(page.getByAltText("QR-tarra: Testikohde")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Jaa palvelimelle ja luo QR" })
    .click();
  await expect(page.getByAltText("QR-tarra: Testikohde")).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  expect(store.entries.size).toBe(1);
});

test("a restored foreign-origin share retains the original QR and cannot write to this origin", async ({
  page,
}) => {
  const link = {
    ...createSharedAssetLink(
      "equipment",
      "equipment-qr",
      "https://original.phasekit.example",
    ),
    etag: '"stored-revision"',
    publishedAt: now,
    publishedFingerprint: "0".repeat(64),
  };
  const data = { ...fixture(), sharedLinks: [link] };
  let requests = 0;
  await page.route("**/api/shared-assets**", async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto("/");
  await page.evaluate(async (value) => {
    const opening = indexedDB.open("phasekit", 1);
    await new Promise<void>((resolve) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("user", "readwrite");
        tx.objectStore("user").put(value, "state");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, data);
  await page.reload();
  await page.goto("/#/assets/equipment/equipment-qr");
  await expect(
    page.getByText("Jako kuuluu toiselle sivustolle.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await expect(
    page.getByRole("button", { name: "Päivitä palvelinkopio" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sulje jaettu linkki" }),
  ).toBeDisabled();
  const image = page.getByAltText("QR-tarra: Lämpöpumppu");
  await expect(image).toBeVisible();
  const source = await image.getAttribute("src");
  expect(decode(Buffer.from(source!.split(",")[1], "base64"))).toBe(
    `https://original.phasekit.example/#/shared/${link.id}`,
  );
  expect(requests).toBe(0);
});

test("a lost successful PUT can recover its owner receipt and revoke without re-publishing", async ({
  page,
}) => {
  const store = new MemoryStore();
  const handler = sharedAssetsHandler(store);
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  const link = createSharedAssetLink("site", "site-qr", origin);
  const original = buildAssetSnapshot(fixture(), "site", "site-qr", now);
  const created = await handler(
    new Request(`${origin}/api/shared-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...link, snapshot: original }),
    }),
  );
  const oldReceipt = await created.json();
  const data = { ...fixture(), sharedLinks: [{ ...link, ...oldReceipt }] };
  data.sites[0].address = "Local update whose successful response is lost";
  let putCount = 0;
  await page.route("**/api/shared-assets**", async (route) => {
    const input = route.request();
    const response = await handler(
      new Request(input.url(), {
        method: input.method(),
        headers: input.headers(),
        body: input.postData() ?? undefined,
      }),
    );
    if (input.method() === "PUT") {
      putCount++;
      if (putCount === 1) {
        await route.abort();
        return;
      }
    }
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  });
  await page.evaluate(async (value) => {
    const opening = indexedDB.open("phasekit", 1);
    await new Promise<void>((resolve) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("user", "readwrite");
        tx.objectStore("user").put(value, "state");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, data);
  await page.reload();
  await page.goto("/#/assets/site/site-qr");
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await page
    .getByRole("button", { name: "Päivitä palvelinkopio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Palauta jaon hallintatiedot",
  );
  await expect(
    page.getByRole("button", { name: "Päivitä palvelinkopio", exact: true }),
  ).toBeDisabled();
  expect(store.entries.get(link.id)!.data.snapshot.data.sites[0].address).toBe(
    data.sites[0].address,
  );
  await page
    .getByRole("button", { name: "Palauta jaon hallintatiedot", exact: true })
    .click();
  await expect(
    page.getByText(
      "Jaon hallintatiedot palautettu. Palvelinkopio vastaa paikallisia tietoja.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(putCount).toBe(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Sulje jaettu linkki", exact: true })
    .click();
  await expect(page.getByAltText("QR-tarra: Testikohde")).toHaveCount(0);
  expect(store.entries.get(link.id)!.data.revoked).toBe(true);
  expect(putCount).toBe(1);
});

test("recovering a stale receipt preserves the newer server snapshot until explicitly reviewed replacement", async ({
  page,
}) => {
  const store = new MemoryStore();
  const handler = sharedAssetsHandler(store);
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  const link = createSharedAssetLink("site", "site-qr", origin);
  const original = buildAssetSnapshot(fixture(), "site", "site-qr", now);
  const created = await handler(
    new Request(`${origin}/api/shared-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...link, snapshot: original }),
    }),
  );
  const oldReceipt = await created.json();
  const newer = structuredClone(original);
  newer.data.sites[0].address =
    "Newer server snapshot from another owner device";
  const remoteUpdate = await handler(
    new Request(`${origin}/api/shared-assets/${link.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${link.writeSecret}`,
      },
      body: JSON.stringify({ expectedEtag: oldReceipt.etag, snapshot: newer }),
    }),
  );
  expect(remoteUpdate.status).toBe(200);
  const data = { ...fixture(), sharedLinks: [{ ...link, ...oldReceipt }] };
  data.sites[0].address = "Different local records";
  let putCount = 0;
  await page.route("**/api/shared-assets**", async (route) => {
    const input = route.request();
    if (input.method() === "PUT") putCount++;
    const response = await handler(
      new Request(input.url(), {
        method: input.method(),
        headers: input.headers(),
        body: input.postData() ?? undefined,
      }),
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  });
  await page.evaluate(async (value) => {
    const opening = indexedDB.open("phasekit", 1);
    await new Promise<void>((resolve) => {
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("user", "readwrite");
        tx.objectStore("user").put(value, "state");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, data);
  await page.reload();
  await page.goto("/#/assets/site/site-qr");
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await page
    .getByRole("button", { name: "Päivitä palvelinkopio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Palauta jaon hallintatiedot",
  );
  await page
    .getByRole("button", { name: "Palauta jaon hallintatiedot", exact: true })
    .click();
  await expect(
    page.getByText("Palvelinkopio eroaa paikallisista tiedoista.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(store.entries.get(link.id)!.data.snapshot.data.sites[0].address).toBe(
    newer.data.sites[0].address,
  );
  expect(putCount).toBe(1);
  await expect(
    page.getByRole("button", {
      name: "Korvaa palvelinkopio paikallisilla tiedoilla",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Esikatsele jaettava sisältö" })
    .click();
  await page
    .getByRole("button", {
      name: "Korvaa palvelinkopio paikallisilla tiedoilla",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Vastaa paikallisia tietoja", { exact: false }),
  ).toBeVisible();
  expect(store.entries.get(link.id)!.data.snapshot.data.sites[0].address).toBe(
    data.sites[0].address,
  );
  expect(putCount).toBe(2);
});
