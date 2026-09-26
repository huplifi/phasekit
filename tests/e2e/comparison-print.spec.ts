import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function addFirstPair(page: Page) {
  await page.goto("/#/compare");
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "Valitse kylmäaine",
    exact: true,
  });
  await search.fill("R134a");
  await page
    .getByRole("button", { name: "Lisää vertailuun R134a", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tulosta vertailu / PDF", exact: true }),
  ).toHaveCount(0);
  await search.fill("R32");
  await page
    .getByRole("button", { name: "Lisää vertailuun R32", exact: true })
    .click();
}

test("comparison print preserves two refrigerants, oil limits, GWP basis and source details", async ({
  page,
}, info) => {
  await page.goto("/#/compare");
  await expect(
    page.getByRole("button", { name: "Tulosta vertailu / PDF", exact: true }),
  ).toHaveCount(0);
  await addFirstPair(page);
  const table = page.locator(".compare-table");
  const typical = table.getByRole("row", { name: /Tyypillinen öljytyyppi/ });
  await expect(typical).toContainText("POE");
  await expect(
    table.getByRole("row", { name: /Muut mahdolliset öljytyypit/ }),
  ).toContainText("PVE");
  const basis = await table.locator(".gwp-summary").first().textContent();
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta vertailu / PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(
    printed.getByRole("heading", { name: "Kylmäainevertailu", exact: true }),
  ).toBeVisible();
  await expect(printed.locator(".compare-table thead th")).toHaveCount(3);
  await expect(printed.locator(".brand")).toHaveCount(1);
  await expect(printed.locator(".compare-table")).toContainText("R134a");
  await expect(printed.locator(".compare-table")).toContainText("R32");
  await expect(printed.locator(".gwp-summary").first()).toHaveText(basis!);
  await expect(
    printed.getByRole("row", { name: /Tyypillinen öljytyyppi/ }),
  ).toContainText("POE");
  await expect(printed.locator(".notice")).toContainText(
    "Tarkista kompressorimallin vaatima öljy",
  );
  await expect(printed.locator(".notice")).toContainText(
    await page.locator("h1 + p.secondary").innerText(),
  );
  await expect(printed.locator(".comparison-sources")).toContainText("BITZER");
  await expect(printed.locator(".comparison-sources")).toContainText(
    "bitzer-refreport-table",
  );
  await expect(
    printed.locator(".comparison-sources a").first(),
  ).toHaveAttribute("href", /^https?:/);
  await expect(printed.locator(".document-footer")).toContainText(
    "Aineistoversio",
  );
  await expect(printed.locator(".document-footer")).toContainText("PhaseKit");
  await expect(
    printed.locator(".compare-table button, .compare-table details"),
  ).toHaveCount(0);
  await expect(
    printed.getByRole("button", { name: "Tulosta / PDF", exact: true }),
  ).toBeEnabled();
  await printed.emulateMedia({ media: "print" });
  await expect(printed.locator(".print-toolbar")).toBeHidden();
  if (info.project.name === "desktop-chromium") {
    await writeFile(
      info.outputPath("comparison-two.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
  }
});

test("three-refrigerant print retains explicitly unavailable oil guidance", async ({
  page,
}, info) => {
  await addFirstPair(page);
  await page
    .getByRole("button", { name: "Muokkaa vertailuaineita", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Valitse kylmäaine", exact: true })
    .fill("R13I1");
  await page
    .getByRole("button", { name: "Lisää vertailuun R13I1", exact: true })
    .click();
  await expect(page.locator(".compare-table thead th")).toHaveCount(4);
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta vertailu / PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(printed.locator(".compare-table thead th")).toHaveCount(4);
  await expect(
    printed.getByRole("row", { name: /Öljyohje ja rajaukset/ }),
  ).toContainText("Varmennettua öljytietoa ei ole tietoaineistossa.");
  await expect(printed.locator(".compare-table")).toContainText("R13I1");
  await expect(printed.locator(".comparison-sources")).toContainText("R13I1");
  if (info.project.name === "desktop-chromium") {
    await writeFile(
      info.outputPath("comparison-three.pdf"),
      await printed.pdf({ format: "A4", printBackground: false }),
    );
  }
});

test("comparison reports a blocked print window without changing selections", async ({
  page,
}) => {
  await addFirstPair(page);
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page
    .getByRole("button", { name: "Tulosta vertailu / PDF", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Tulostusikkuna estettiin",
  );
  await expect(page.locator(".compare-table thead th")).toHaveCount(3);
});
