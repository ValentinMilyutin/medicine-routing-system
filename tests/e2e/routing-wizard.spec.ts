import { expect, test } from "@playwright/test";

test("главная страница показывает шесть профилей без горизонтального переполнения", async ({
  page,
}) => {
  await page.goto("/");

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
  await page.goto("/");
  await page.getByRole("button", { name: /БСК \/ ССЗ/ }).click();
  await page.locator("select").first().selectOption("Боровичский");

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
  await page.goto("/");
  await page.getByRole("button", { name: /Дерматовенерология/ }).click();
  await page
    .getByLabel("Муниципальный район или округ")
    .selectOption("Боровичский район");
  await page.locator("section").nth(1).locator("button").first().click();

  await expect(
    page.getByText("Отёк Квинке: экстренная госпитализация"),
  ).toBeVisible();
  await expect(
    page.getByText(/Ближайшая медицинская организация с ОАРИТ/),
  ).toBeVisible();
});
