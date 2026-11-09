import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("Käyttöarvio is available from tools and reads a partial gauge pressure", async ({
  page,
}) => {
  await page.goto("/#/tools");
  await page.getByRole("button", { name: "Käyttöarvio", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Käyttöarvio",
  );
  await page.locator(".assessment-circuit > summary").click();
  await expect(page.getByRole("figure", { name: /Jäähdytys/ })).toBeVisible();
  await page.goto("/#/assessment/r134a");
  await page.locator("#assessment-pressure").fill("3");
  await expect(page.locator(".assessment-result")).toContainText(
    "Imun kastepiste",
  );
  await expect(page.locator(".assessment-result")).toContainText("bar(a)");
  await expect(page.locator(".assessment-result")).toContainText(
    "Yksi paine ei ole syy lisätä kylmäainetta",
  );
  await expect(page.locator(".assessment-result")).not.toContainText(
    "Tulistus,",
  );
  const shell = page.locator(".app-shell");
  const overflow = await shell.evaluate(
    (node) => node.scrollWidth <= node.clientWidth + 1,
  );
  expect(overflow).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("heating hot gas is not suction superheat, and an open role withholds it", async ({
  page,
}) => {
  await page.goto("/#/assessment/r32");
  await page.getByLabel("Käyttö", { exact: true }).selectOption("heating");
  await expect(page.getByLabel("Mittauskohta", { exact: true })).toHaveValue(
    "hot_gas",
  );
  await page.locator("#assessment-pressure").fill("18");
  await page.locator("#assessment-pipe").fill("70");
  await expect(page.locator(".assessment-result")).toContainText(
    "Tämä ei ole imutulistus",
  );
  await expect(page.locator(".result-label")).not.toHaveText("Tulistus");
  await page
    .getByLabel("Mittauskohta", { exact: true })
    .selectOption("unknown");
  await expect(page.locator(".result-label")).toHaveText(
    "Kastepiste tässä paineessa",
  );
  await expect(page.locator(".assessment-result")).not.toContainText(
    "Tämä ei ole imutulistus",
  );
});

test("R449A shows glide, R744 critical behaviour, and ammonia wording", async ({
  page,
}) => {
  await page.goto("/#/assessment/r449a");
  await page.locator(".assessment-pressure-settings > summary").click();
  await page.getByLabel("Paineviite", { exact: true }).selectOption("a");
  await page.locator("#assessment-pressure").fill("6");
  await expect(page.locator(".assessment-result")).toContainText("liukuma");

  await page.goto("/#/assessment/r744");

  await page.locator(".assessment-pressure-settings > summary").click();
  await page.getByLabel("Paineviite", { exact: true }).selectOption("a");
  await page
    .getByLabel("Mittauskohta", { exact: true })
    .selectOption("hot_gas");
  await page.locator("#assessment-pressure").fill("90");
  await expect(page.locator(".assessment-result")).toContainText(
    "kaasujäähdytin",
  );
  await expect(page.locator(".assessment-result")).toContainText(
    "Kyllästyslämpötilaa ei ole",
  );
  await page.locator("#assessment-pressure").fill("70");
  await expect(page.locator(".assessment-result")).toContainText(
    "nimetä ylikriittiseksi",
  );
  await expect(page.locator(".assessment-result")).not.toContainText(
    "kaasujäähdytin",
  );

  await page.goto("/#/assessment/r717");

  await page
    .getByLabel("Mittauskohta", { exact: true })
    .selectOption("suction");
  await page.locator("#assessment-pressure").fill("2");
  await page.getByText("Tekniset perusteet", { exact: true }).click();
  await expect(page.locator("main")).toContainText("myrkyllinen");
  await page
    .getByRole("button", { name: "Näytä esimerkki", exact: true })
    .click();
  await expect(page.getByText(/Esimerkkipohja\./)).toBeVisible();
});

test("invalid pressure is reported and does not remove the circuit", async ({
  page,
}) => {
  await page.goto("/#/assessment/r32");
  await page.locator("#assessment-pressure").fill("abc");
  await expect(page.getByRole("alert")).toContainText("Tarkista luku");
  await page.locator(".assessment-circuit > summary").click();
  await expect(page.getByRole("figure", { name: /Jäähdytys/ })).toBeVisible();
});

test("example provenance survives edits and the liquid point precedes expansion", async ({
  page,
}) => {
  await page.goto("/#/assessment/r134a");
  await page
    .getByRole("button", { name: "Näytä esimerkki", exact: true })
    .click();
  await page.getByLabel("Mittauskohta", { exact: true }).selectOption("liquid");
  await page.locator("#assessment-pressure").fill("4");
  await expect(page.getByText(/Esimerkkipohja\./)).toBeVisible();
  await page.locator(".assessment-circuit > summary").click();
  await expect(page.locator(".circuit-measurement")).toHaveText(
    "Mittaus 1: Neste",
  );
  await expect(page.locator(".circuit-flow-list li").nth(1)).toContainText(
    "Mittaus 1: Neste",
  );
  await expect(page.locator(".circuit-flow-list li").nth(2)).toContainText(
    "Paisunta",
  );
  await page
    .getByRole("button", { name: "Tyhjennä luvut", exact: true })
    .click();
  await expect(page.getByText(/Esimerkkipohja\./)).toHaveCount(0);
});

test("narrow measurement form exposes complete controls and keeps both readings together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/assessment/r134a");
  await page.locator("#assessment-pressure").fill("3");
  await page.locator("#assessment-pipe").fill("15");
  await page.locator(".assessment-second-measurement > summary").click();
  await page
    .getByLabel("Toinen mittauskohta", { exact: true })
    .selectOption("liquid");
  await page.locator("#assessment-second").fill("10");
  await page.locator("#assessment-second-pipe").fill("30");
  await page.getByText("Olosuhteet ja käynti", { exact: true }).click();
  await page
    .getByLabel("Käynnin vaihe", { exact: true })
    .selectOption("oem_stable");
  await page.getByText("Laitteen ohjearvot", { exact: true }).click();
  await page.locator(".assessment-pressure-settings > summary").click();
  await page.getByLabel("Paineviite", { exact: true }).selectOption("a");
  await expect(page.locator("#assessment-pressure")).toHaveValue("4.01325");
  await expect(page.locator("#assessment-second")).toHaveValue("11.01325");
  await expect(page.locator("#assessment-pipe")).toHaveValue("15");
  const clipped = await page
    .locator(
      ".assessment-inputs input, .assessment-inputs select, .assessment-inputs summary",
    )
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < 0 || r.right > innerWidth);
        })
        .map((el) => el.outerHTML),
    );
  expect(clipped).toEqual([]);
  await page.getByRole("button", { name: "Näytä arvio", exact: true }).click();
  await expect(page.locator(".assessment-result")).toBeFocused();
  expect(
    await page
      .locator(".assessment-result")
      .evaluate((el) => el.getBoundingClientRect().top),
  ).toBeLessThan(80);
  await expect(page.locator(".result-label")).toHaveText("Tulistus");
  await expect(page.locator(".assessment-result")).toContainText("6,0");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
