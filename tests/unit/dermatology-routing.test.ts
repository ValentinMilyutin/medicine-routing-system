import { describe, expect, it } from "vitest";
import { evaluateRouting } from "../../src/routing/dermatology";
import { expectRoute } from "./test-helpers";

describe("дерматовенерология: обязательные поля", () => {
  it("не рассчитывает маршрут без территории", () => {
    expect(evaluateRouting({ condition: "angioedema" })).toBeNull();
  });

  it("не рассчитывает маршрут без состояния", () => {
    expect(evaluateRouting({ territory: "Великий Новгород" })).toBeNull();
  });

  it("после выбора отсутствия опасных состояний требует решение о стационаре", () => {
    expect(
      evaluateRouting({ territory: "Великий Новгород", condition: "none" }),
    ).toBeNull();
  });
});

describe("дерматовенерология: конечные маршруты", () => {
  it.each([
    "angioedema",
    "toxicoderma",
    "lyell",
    "stevens_johnson",
  ] as const)("опасное состояние %s имеет приоритет ОАРИТ", (condition) => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Боровичский район",
        condition,
        inpatientCare: false,
      }),
    );
    expect(result.target.name).toContain("ОАРИТ");
    expect(result.afterStabilization?.name).toContain(
      "кожно-венерологический диспансер",
    );
    expect(result.sources.some((source) => source.url?.includes("minzdrav"))).toBe(
      true,
    );
  });

  it("стационарная помощь направляет в НОКВД", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Пестовский район",
        condition: "none",
        inpatientCare: true,
      }),
    );
    expect(result.target.address).toContain("Большая Московская");
  });

  it.each([
    ["Великий Новгород", "Дворцовая"],
    ["Боровичский район", "1 Мая"],
    ["Старорусский район", "Гостинодворская"],
    ["Валдайский район", "Песчаная"],
    ["Крестецкий район", "Гагарина"],
    ["Маловишерский район", "Набережный"],
    ["Окуловский район", "Калинина"],
    ["Пестовский район", "Курганная"],
    ["Солецкий округ", "Новгородская"],
    ["Чудовский район", "Косинова"],
  ])("амбулаторный маршрут %s", (territory, addressPart) => {
    const result = expectRoute(
      evaluateRouting({
        territory,
        condition: "none",
        inpatientCare: false,
      }),
    );
    expect(result.title).toBe("Амбулаторный маршрут по территории");
    expect(result.target.address).toContain(addressPart);
  });
});
