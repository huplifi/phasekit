import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

async function printChart(page: Page) {
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Tulosta / tallenna PDF", exact: true })
    .click();
  const printed = await popup;
  await expect(
    printed.getByRole("button", { name: "Tulosta / PDF", exact: true }),
  ).toBeEnabled();
  const src = await printed.locator("img.chart").getAttribute("src");
  return {
    printed,
    svg: decodeURIComponent(src!.slice(src!.indexOf(",") + 1)),
  };
}

test("print and saved cycle retain selected guides and view without losing report notes", async ({
  page,
}, info) => {
  await page.goto("/#/ph/r134a");
  for (const [id, value] of [
    ["lp", "2.5"],
    ["hp", "10"],
    ["suction", "10"],
    ["hot-gas", "70"],
    ["liquid", "25"],
  ])
    await page.locator(`#shsc-${id}`).fill(value);
  await page.getByRole("button", { name: "Laske", exact: true }).click();
  await page
    .getByRole("switch", { name: "Sovita kiertoon", exact: true })
    .check();
  await page.getByRole("button", { name: /Entropia s/ }).click();
  await page.getByRole("button", { name: /Ominaistilavuus v/ }).click();
  await page.locator(".report-save > summary").click();
  await page
    .getByRole("textbox", { name: "Muistiinpanot", exact: true })
    .fill("Kaavion valinnat säilyvät");
  const original = await printChart(page);
  for (const kind of ["temperature", "entropy", "volume"])
    expect(original.svg).toContain(`ph-guide-${kind}`);
  expect(original.svg).toContain("ph-grid-minor");
  if (info.project.name === "desktop-chromium")
    await writeFile(
      info.outputPath("cycle-all-guides.pdf"),
      await original.printed.pdf({ format: "A4" }),
    );
  await original.printed.close();
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallennettu", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Entropia s/ }).click();
  await page.getByRole("button", { name: /Ominaistilavuus v/ }).click();
  await page
    .getByRole("switch", { name: "Sovita kiertoon", exact: true })
    .uncheck();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "Muistiinpanot", exact: true }),
  ).toHaveValue("Kaavion valinnat säilyvät");
  const changed = await printChart(page);
  expect(changed.svg).not.toContain("ph-guide-entropy");
  expect(changed.svg).not.toContain("ph-guide-volume");
  expect(changed.svg).not.toBe(original.svg);
  await changed.printed.close();
  await page.goto("/#/reports");
  await page.reload();
  await page.locator(".report-entry").click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Vie JSON", exact: true }).click();
  const file = await download;
  const record = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(record.chartSnapshot.view).toEqual({
    fitCycle: true,
    visibleKinds: { temperature: true, entropy: true, volume: true },
  });
  expect(record.chartSnapshot.isolineDataVersion).toBeTruthy();
  expect(record.notes).toBe("Kaavion valinnat säilyvät");
  const stored = await printChart(page);
  expect(stored.svg).toBe(original.svg);
});
