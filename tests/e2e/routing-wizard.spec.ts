import { expect, test } from "@playwright/test";

test("страница проекта открывает систему маршрутизации", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Маршрут пациента/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Начать маршрутизацию/ }).click();
  await expect(
    page.getByRole("region", { name: "Профили маршрутизации" }),
  ).toBeVisible();
});

test("выбор профиля показывает шесть направлений без горизонтального переполнения", async ({
  page,
}) => {
  await page.goto("/?routing=1");

  await expect(
    page
      .getByRole("region", { name: "Профили маршрутизации" })
      .getByRole("button"),
  ).toHaveCount(6);
  await expect(page.getByRole("button", { name: /ДТП \/ травма/ })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("полный маршрут БСК отображает принимающую организацию", async ({ page }) => {
  await page.goto("/?routing=1");
  await page.getByRole("button", { name: /БСК \/ ССЗ/ }).click();
  await expect(
    page.getByRole("heading", { name: "БСК / ССЗ: маршрутизация пациентов для СМП" }),
  ).toBeVisible();
  await page.getByLabel("Территория вызова").selectOption("Боровичский");
  await page
    .locator('[data-question-id="branch"]')
    .getByRole("button", { name: "ОНМК / подозрение на инсульт" })
    .click();
  for (const questionId of [
    "unstableVitals",
    "fastFace",
    "fastArm",
    "fastSpeech",
  ]) {
    await page
      .locator(`[data-question-id="${questionId}"]`)
      .getByRole("button", { name: "Нет" })
      .click();
  }
  await page
    .locator('[data-question-id="strokeOnset"]')
    .getByRole("button", { name: "Время начала неизвестно" })
    .click();
  await page
    .locator('[data-question-id="armMovement"]')
    .getByRole("button", { name: "Удерживает руку" })
    .click();
  await page
    .locator('[data-question-id="gripStrength"]')
    .getByRole("button", { name: "Сила сохранена" })
    .click();

  await expect(
    page.getByText("Маршрутизация СМП при подозрении на ОНМК"),
  ).toBeVisible();
  await expect(
    page.getByText("ГОБУЗ «Боровичская центральная районная больница»"),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("полный экстренный дерматологический маршрут работает", async ({ page }) => {
  await page.goto("/?routing=1");
  await page.getByRole("button", { name: /Дерматовенерология/ }).click();
  await page.getByLabel("Территория вызова").selectOption("Боровичский район");
  await page
    .locator('[data-question-id="condition"]')
    .getByRole("button", { name: "Отёк Квинке" })
    .click();

  await expect(
    page.getByText("Отёк Квинке: экстренная госпитализация"),
  ).toBeVisible();
  await expect(
    page.getByText(/Ближайшая медицинская организация с ОАРИТ/),
  ).toBeVisible();
});
