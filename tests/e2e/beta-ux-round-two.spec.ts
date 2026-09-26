import packageInfo from "../../package.json" with { type: "json" };
import { test, expect } from "@playwright/test";

test("checklist editing keeps scroll and focus stable during automatic saves", async ({
  page,
}) => {
  await page.goto("/#/checklists");
  await page.getByRole("button", { name: "Luo lista", exact: true }).click();
  const notes = page.getByRole("textbox", {
    name: "Muistiinpanot",
    exact: true,
  });
  await notes.scrollIntoViewIfNeeded();
  await notes.click();
  await page.evaluate(() => {
    const samples: number[] = [];
    const started = performance.now();
    (window as unknown as { scrollSamples: number[] }).scrollSamples = samples;
    function sample() {
      samples.push(window.scrollY);
      if (performance.now() - started < 1300) requestAnimationFrame(sample);
    }
    sample();
  });
  await notes.pressSequentially("Mittaus", { delay: 140 });
  await expect(
    page.getByRole("status").filter({ hasText: "Tallennettu" }),
  ).toBeVisible();
  await expect(notes).toBeFocused();
  const positions = await page.evaluate(
    () => (window as unknown as { scrollSamples: number[] }).scrollSamples,
  );
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(
    2,
  );
  await expect(notes).toHaveValue("Mittaus");
  await page.reload();
  await page
    .getByRole("combobox", { name: "Omat listat", exact: true })
    .selectOption({ index: 1 });
  await expect(
    page.getByRole("textbox", { name: "Muistiinpanot", exact: true }),
  ).toHaveValue("Mittaus");
});

test("picker keeps its bounds with all, one and no matching refrigerants", async ({
  page,
}) => {
  await page.goto("/#/pt");
  await page
    .getByRole("button", { name: "Valitse kylmäaine", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const initial = await dialog.boundingBox();
  const search = dialog.getByRole("searchbox");
  for (const query of ["134a", "not-a-refrigerant", ""]) {
    await search.fill(query);
    const current = await dialog.boundingBox();
    expect(Math.abs(initial!.height - current!.height)).toBeLessThan(2);
    expect(Math.abs(initial!.y - current!.y)).toBeLessThan(2);
  }
  await expect(dialog.locator(".picker-result")).toHaveCount(249);
  await dialog.screenshot({
    path: test.info().outputPath("picker-stable.png"),
  });
});

test("checklist control pairs and footer actions align", async ({
  page,
}, info) => {
  await page.goto("/#/checklists");
  const select = page.getByRole("combobox", {
    name: "Uusi lista",
    exact: true,
  });
  const create = page.getByRole("button", { name: "Luo lista", exact: true });
  if (!info.project.name.startsWith("mobile")) {
    const a = await select.boundingBox(),
      b = await create.boundingBox();
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);
  }
  await create.click();
  const actions = page.locator(".field-actions");
  const print = await actions
    .getByRole("button", { name: "Tulosta / PDF" })
    .boundingBox();
  const download = await actions
    .getByRole("button", { name: "Vie tekstinä" })
    .boundingBox();
  expect(Math.abs(print!.y - download!.y)).toBeLessThan(2);
  expect(Math.abs(print!.height - download!.height)).toBeLessThan(2);
});

test("beta version and shared choices expose their state", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.locator(".about-details")).toContainText(
    packageInfo.version,
  );
  await expect(page.locator(".about-details")).toContainText("Beta");
  await page.goto("/#/pipe");
  const group = page.getByRole("group", { name: "Putkilaskurin tila" });
  const geometry = group.getByRole("button", { name: "Tilavuus ja virtaus" });
  await geometry.focus();
  await geometry.press("ArrowRight");
  await expect(
    group.getByRole("button", { name: "Lämpölaajeneminen" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", {
      name: "Putken lämpölaajeneminen",
      exact: true,
    }),
  ).toBeVisible();
});

test("failed initial storage never labels a checklist as saved", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  await page.goto("/#/checklists");
  await page.getByRole("button", { name: "Luo lista", exact: true }).click();
  await expect(
    page.locator(".field-checklist-save-state > [role=status]"),
  ).toContainText("epäonnistui");
});
