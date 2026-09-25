import { expect, test } from "@playwright/test";

test('the supplied R134a paper example plots with gauge pressures', async ({page}, info) => {
  await page.goto('/#/ph/r134a');
  await page.getByRole('switch', {name:'Absoluuttinen paine'}).uncheck();
  await page.locator('#shsc-lp').fill('1,91');
  await page.locator('#shsc-hp').fill('9,15');
  await page.locator('#shsc-suction').fill('10');
  await page.locator('#shsc-liquid').fill('35');
  await page.locator('#shsc-hot-gas').fill('60');
  await page.getByRole('button', {name:'Laske', exact:true}).click();
  await expect(page.locator('.calculator-number')).toHaveText(['10 K', '5 K']);
  await expect(page.locator('.calculator-result')).toContainText('10,02 K');
  await expect(page.locator('.calculator-result')).toContainText('5,01 K');
  await expect(page.locator('.ph-cycle')).toHaveCount(4);
  await expect(page.locator('.ph-diagram-message')).toHaveCount(0);
  await expect(page.locator('.ph-point-table')).toContainText('2,92');
  await expect(page.locator('.ph-point-table')).toContainText('10,16');
  await page.locator('.ph-diagram-section').screenshot({path:`/private/tmp/phasekit-paper-example-${info.project.name}.png`});
});

test('negative differences and near-boundary values remain visible when the diagram is blocked', async ({page}) => {
  await page.goto('/#/ph/r134a');
  await expect(page.getByRole('heading', {level:1})).toHaveText('Kylmäkierto');
  await page.locator('#shsc-lp').fill('2.5');
  await page.locator('#shsc-hp').fill('10');
  await page.locator('#shsc-suction').fill('-14.26');
  await page.locator('#shsc-hot-gas').fill('60');
  await page.locator('#shsc-liquid').fill('25');
  const calculate = page.getByRole('button', {name:'Laske', exact:true});
  await calculate.click();
  await expect(page.locator('.calculator-number').first()).toHaveText('−10 K');
  await expect(page.locator('.calculator-number').last()).toHaveText('14,4 K');
  await expect(page.locator('.calculator-result')).toContainText('ei positiivinen tulistus');
  await expect(page.locator('.ph-diagram-message')).toContainText('T1 · Imu');
  await expect(page.locator('.ph-cycle')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.locator('#shsc-suction').fill('0');
  await page.locator('#shsc-hp').fill('9');
  await page.locator('#shsc-liquid').fill('35');
  await calculate.click();
  await expect(page.locator('.calculator-number')).toHaveCount(2);
  await expect(page.locator('.calculator-number').last()).toContainText('0,');
  await expect(page.locator('.ph-diagram-message')).toContainText('T3 · Neste');
  await expect(page.locator('.ph-diagram-message')).toContainText('1 K');
  await page.locator('#shsc-hot-gas').fill('--');
  await calculate.click();
  await expect(page.locator('.calculator-number')).toHaveCount(2);
  await expect(page.locator('.ph-diagram-message')).toBeVisible();
});

test("SH and SC use their own pressures and temperatures together", async ({
  page,
}, info) => {
  await page.goto("/#/shsc/r134a");
  await expect(page.getByLabel("Laskenta", { exact: true })).toHaveCount(0);
  await page.locator("#shsc-lp").fill("2.5");
  await page.locator("#shsc-hp").fill("10");
  await page.locator("#shsc-suction").fill("10");
  await page.locator("#shsc-liquid").fill("25");
  const calculate = page.getByRole("button", { name: "Laske", exact: true });
  await calculate.click();
  await expect(page.locator(".calculator-number")).toHaveText([
    "14,3 K",
    "14,4 K",
  ]);
  await expect(page.locator('.ph-diagram-message')).toContainText('Lisää Kuumakaasu');
  await expect(page.locator('.ph-cycle')).toHaveCount(0);
  await expect(page.locator(".result-card").first()).toContainText(
    "Kastepiste",
  );
  await expect(page.locator(".result-card").last()).toContainText("Kuplapiste");
  await page.locator("#shsc-hot-gas").fill("60");
  await expect(page.locator(".calculator-number")).toHaveCount(0);
  await calculate.click();
  await expect(page.locator('.ph-cycle')).toHaveCount(4);
  await expect(page.locator(".calculator-number")).toHaveText([
    "14,3 K",
    "14,4 K",
  ]);
  await page.screenshot({
    path: `/private/tmp/phasekit-${info.project.name}-shsc-pair.png`,
    fullPage: true,
  });
  await page.getByLabel("Lämpötilayksikkö").selectOption("F");
  await expect(page.locator("#shsc-suction")).toHaveValue("50");
  await expect(page.locator("#shsc-hot-gas")).toHaveValue("140");
  await expect(page.locator("#shsc-liquid")).toHaveValue("77");
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).uncheck();
  await expect
    .poll(async () => Number(await page.locator("#shsc-lp").inputValue()))
    .toBeCloseTo(1.48675, 5);
  await expect
    .poll(async () => Number(await page.locator("#shsc-hp").inputValue()))
    .toBeCloseTo(8.98675, 5);
  await calculate.click();
  await expect(page.locator(".calculator-number")).toHaveText([
    "25,7 °F Δ",
    "25,9 °F Δ",
  ]);
  await page.getByLabel("Lämpötilayksikkö").selectOption("C");
  await page.locator("#shsc-suction").fill("-1,5");
  await calculate.click();
  await expect(page.locator(".calculator-number")).toHaveText([
    "2,8 K",
    "14,4 K",
  ]);
  await page.locator("#shsc-hp").fill("1");
  await expect(page.locator(".calculator-number")).toHaveCount(0);
  await calculate.click();
  await expect(page.getByRole("alert")).toContainText(
    "HP-paineen on oltava LP-painetta suurempi",
  );
});
