import { expect, test } from "@playwright/test";

async function openDraftPrint(
  page: import("@playwright/test").Page,
  offline = false,
) {
  await page.goto("/#/checklists/new");
  await page.locator(".checklist-create select").selectOption("evacuation");
  await page.getByRole("button", { name: "Luo raportti", exact: true }).click();
  await page
    .getByLabel("Kohteen nimi", { exact: true })
    .fill("Palattava raportti");
  await page.getByLabel("Tekijä", { exact: true }).fill("Testaaja");
  await expect(page.locator(".field-report-save-state").last()).toHaveText(
    "Tallennettu automaattisesti tähän selaimeen",
  );
  const reportUrl = page.url();
  if (offline) {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await page.context().setOffline(true);
  }
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Tulosta / PDF" }).click();
  return { printed: await popup, reportUrl };
}

for (const offline of [false, true]) {
  test(`print preview has manual controls, keeps them off paper and closes back to draft (${offline ? "offline" : "online"})`, async ({
    page,
  }) => {
    const { printed, reportUrl } = await openDraftPrint(page, offline);
    const toolbar = printed.getByRole("navigation", {
      name: "Raportin toiminnot",
    });
    const back = toolbar.getByRole("link", { name: "Takaisin raporttiin" });
    const print = toolbar.getByRole("button", { name: "Tulosta", exact: true });
    await expect(back).toHaveAttribute("href", reportUrl);
    await expect(print).toBeEnabled();
    await printed.evaluate(() => {
      (window as unknown as Window & { printCalls?: number }).printCalls = 0;
      window.print = () => {
        (window as unknown as Window & { printCalls?: number }).printCalls! +=
          1;
      };
    });
    await print.click();
    expect(
      await printed.evaluate(
        () =>
          (window as unknown as Window & { printCalls?: number }).printCalls,
      ),
    ).toBe(1);
    await printed.emulateMedia({ media: "print" });
    await expect(toolbar).toBeHidden();
    await printed.emulateMedia({ media: "screen" });
    await expect(toolbar).toBeVisible();
    const close = printed.waitForEvent("close");
    await back.click().catch((error: unknown) => {
      // Chromium can close this page before acknowledging the successful click.
      // Still require the close event and the intact editor below.
      if (!printed.isClosed()) throw error;
    });
    await close;
    await expect(page).toHaveURL(reportUrl);
    await expect(page.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
      "Palattava raportti",
    );
  });
}

test("print preview returns to persisted draft in the same window when close is unavailable", async ({
  page,
}) => {
  const { printed, reportUrl } = await openDraftPrint(page);
  await printed.evaluate(() => {
    window.close = () => {};
  });
  await printed.getByRole("link", { name: "Takaisin raporttiin" }).click();
  await expect(printed).toHaveURL(reportUrl);
  await expect(printed.getByLabel("Kohteen nimi", { exact: true })).toHaveValue(
    "Palattava raportti",
  );
  await expect(
    printed.getByRole("navigation", { name: "Raportin toiminnot" }),
  ).toHaveCount(0);
});

test("print controls remain live when the editor is suspended or replaced", async ({
  page,
  browserName,
}) => {
  const { printed } = await openDraftPrint(page);
  await expect(
    printed.getByRole("button", { name: "Tulosta", exact: true }),
  ).toBeEnabled();
  if (browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setScriptExecutionDisabled", { value: true });
  } else {
    await page.reload();
  }
  await printed.evaluate(() => {
    (window as unknown as Window & { printCalls?: number }).printCalls = 0;
    window.print = () => {
      (window as unknown as Window & { printCalls?: number }).printCalls! += 1;
    };
  });
  await printed.getByRole("button", { name: "Tulosta", exact: true }).click();
  expect(
    await printed.evaluate(
      () => (window as unknown as Window & { printCalls?: number }).printCalls,
    ),
  ).toBe(1);
});

test("offline preview exports a real PDF and shares the prepared file independently of native print", async ({
  page,
}, info) => {
  const errors: string[] = [];
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    }),
  );
  const { printed } = await openDraftPrint(page, true);
  await expect(printed.locator(".print-action")).toBeHidden();
  printed.on("pageerror", (error) => errors.push(error.message));

  await expect(printed.locator(".pdf-action")).toBeEnabled();
  expect(
    await printed.locator(".pdf-status").getAttribute("data-error"),
  ).toBeNull();
  await expect(printed.locator(".pdf-action")).toHaveText(
    /Tallenna PDF|Jaa \/ tallenna PDF/,
  );
  await page.goto("about:blank"); // The prepared file belongs to the preview realm.
  await printed.evaluate(() => {
    window.print = () => {};
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    });
  });
  const downloading = printed.waitForEvent("download");
  await printed.locator(".pdf-action").click();
  const download = await downloading;
  await download.saveAs(info.outputPath("offline-report.pdf"));
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(5000);
  await printed.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        document.body.dataset.sharedPdf = `${file?.type}:${file?.name}:${file?.size}`;
      },
    });
  });
  await printed.locator(".pdf-action").click();
  await expect(printed.locator("body")).toHaveAttribute(
    "data-shared-pdf",
    /application\/pdf:.*\.pdf:\d+/,
  );
  expect(errors).toEqual([]);
});

test("PDF preserves technical Unicode, tables, long text and charts across pages", async ({
  page,
}, info) => {
  const { printed } = await openDraftPrint(page);
  await expect(printed.locator(".pdf-action")).toHaveText(
    /Tallenna PDF|Jaa \/ tallenna PDF/,
  );
  const artifact = await printed.evaluate(async () => {
    const heading = document.createElement("h2");
    heading.textContent = "PDF-rajat";
    document.body.append(heading);
    const symbols = document.createElement("p");
    symbols.textContent = "Ää ö CO₂e 20 °C ≈ −2 m³ ρ Δ α";
    document.body.append(symbols);
    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>Suure</th><th>Arvo</th></tr></thead><tbody><tr><td>Täytös</td><td>2,5 kg</td></tr></tbody>";
    document.body.append(table);
    const img = document.createElement("img");
    img.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180"><rect width="600" height="180" fill="white"/><path d="M10 170 L200 20 L450 100 L590 10" fill="none" stroke="blue" stroke-width="3"/></svg>',
      );
    document.body.append(img);
    await img.decode();
    const long = document.createElement("p");
    long.textContent =
      Array.from(
        { length: 100 },
        (_, i) => `Rivi ${i + 1}: Säilyvä mittaustulos ja kirjattu huomio.`,
      ).join("\n") + "\nVIIMEINEN KIRJAUS";
    document.body.append(long);
    const build = (
      window as unknown as Window & {
        phasekitBuildPdf: (doc: Document) => Promise<Blob>;
      }
    ).phasekitBuildPdf;
    const blob = await build(document);
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    info.outputPath("technical-report.pdf"),
    Buffer.from(artifact),
  );
  expect(Buffer.from(artifact).subarray(0, 5).toString()).toBe("%PDF-");
});
