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
  await expect(page.getByRole("img", { name: /Jäähdytys/ })).toBeVisible();
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
  await page.locator(".assessment-system > summary").click();
  await page.getByRole("button", { name: "Lämmitys", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Kuumakaasu", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("#assessment-pressure").fill("18");
  await page.locator("#assessment-pipe").fill("70");
  await expect(page.locator(".assessment-result")).toContainText(
    "Tämä ei ole imutulistus",
  );
  await expect(page.locator(".result-label")).not.toHaveText("Tulistus");
  await page.getByRole("button", { name: "Ei varma", exact: true }).click();
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
  await page.getByRole("switch", { name: "Absoluuttinen paine" }).check();
  await page.locator("#assessment-pressure").fill("6");
  await expect(page.locator(".assessment-result")).toContainText("liukuma");

  await page.goto("/#/assessment/r744");

  await page.getByRole("switch", { name: "Absoluuttinen paine" }).check();
  await page.getByRole("button", { name: "Kuumakaasu", exact: true }).click();
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

  await page.getByRole("button", { name: "Imu", exact: true }).click();
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
  await expect(page.getByRole("img", { name: /Jäähdytys/ })).toBeVisible();
});

test("example provenance survives edits and result precedes a legible circuit", async ({
  page,
}) => {
  await page.goto("/#/assessment/r134a");
  await page
    .getByRole("button", { name: "Näytä esimerkki", exact: true })
    .click();
  await page.getByRole("button", { name: "Neste", exact: true }).click();
  await page.locator("#assessment-pressure").fill("4");
  await expect(page.getByText(/Esimerkkipohja\./)).toBeVisible();
  const result = await page.locator(".assessment-result").boundingBox();
  const circuit = await page.locator(".circuit-svg").boundingBox();
  expect(result!.y).toBeLessThan(circuit!.y);
  expect(await page.locator(".circuit-port").getAttribute("cx")).toBe("270");
  expect(
    await page
      .locator(".circuit-fn")
      .first()
      .evaluate(
        (el) =>
          (parseFloat(getComputedStyle(el).fontSize) *
            el.getBoundingClientRect().width) /
          (el as SVGGraphicsElement).getBBox().width,
      ),
  ).toBeGreaterThan(11);
  await page
    .getByRole("button", { name: "Tyhjennä luvut", exact: true })
    .click();
  await expect(page.getByText(/Esimerkkipohja\./)).toHaveCount(0);
});
