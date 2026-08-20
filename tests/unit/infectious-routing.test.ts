import { describe, expect, it } from "vitest";
import { evaluateRouting } from "../../src/routing/infectious";
import { expectRoute } from "./test-helpers";

describe("инфекционный профиль: обязательные поля", () => {
  it.each([
    { infectionGroup: "general", lifeThreats: [] },
    { territory: "Великий Новгород", lifeThreats: [] },
    {
      territory: "Великий Новгород",
      infectionGroup: "general",
      lifeThreats: [],
      admissionCriteria: [],
    },
  ] as const)("не рассчитывает неполное состояние %#", (state) => {
    expect(
      evaluateRouting({ admissionCriteria: [], ...state }),
    ).toBeNull();
  });

  it("после исключения угроз требует критерий госпитализации", () => {
    expect(
      evaluateRouting({
        territory: "Великий Новгород",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: [],
      }),
    ).toBeNull();
  });

  it("при тяжёлом общем течении требует оценку транспортабельности", () => {
    expect(
      evaluateRouting({
        territory: "Великий Новгород",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["severe"],
      }),
    ).toBeNull();
  });
});

describe("инфекционный профиль: жизнеугрожающие состояния", () => {
  it("жизнеугроза перекрывает критерий амбулаторного наблюдения", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Боровичский район",
        infectionGroup: "general",
        lifeThreats: ["respiratory_failure"],
        admissionCriteria: ["none"],
      }),
    );
    expect(result.title).toBe("Жизнеугрожающее инфекционное состояние");
    expect(result.target.name).toContain("Реанимационное отделение");
    expect(result.nextTarget?.name).toContain("инфекционная больница");
    expect(result.warning).toContain("не содержит таблицы");
  });

  it("для сезонной инфекции показывает стационар только справочно", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Старорусский район",
        infectionGroup: "flu_orvi_vp",
        lifeThreats: ["infectious_toxic_shock"],
        admissionCriteria: [],
      }),
    );
    expect(result.target.name).toContain("Реанимационное отделение");
    expect(result.referenceTargets?.[0].name).toContain("Старорусская");
    expect(result.nextTarget).toBeUndefined();
  });
});

describe("инфекционный профиль: отсутствие показаний", () => {
  it("оставляет пациента под территориальным наблюдением", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Великий Новгород",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["none"],
      }),
    );
    expect(result.title).toBe("Стационарная маршрутизация не требуется");
  });

  it("фиксирует взаимоисключающий вариант none как приоритетный", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Великий Новгород",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["severe", "none"],
        transportable: true,
      }),
    );
    expect(result.title).toBe("Стационарная маршрутизация не требуется");
  });
});

describe("инфекционный профиль: сезонная респираторная схема", () => {
  it.each([
    ["Боровичский район", "flu_orvi_vp", "Боровичская"],
    ["Старорусский район", "flu_orvi_vp", "Старорусская"],
    ["Валдайский район", "flu_orvi_vp", "Валдайский"],
    ["Великий Новгород", "flu_orvi_vp", "областная инфекционная"],
    ["Великий Новгород", "covid", "областная инфекционная"],
  ] as const)("%s, %s → %s", (territory, infectionGroup, targetPart) => {
    const result = expectRoute(
      evaluateRouting({
        territory,
        infectionGroup,
        lifeThreats: ["none"],
        admissionCriteria: ["resp_pneumonia"],
      }),
    );
    expect(result.target.name).toContain(targetPart);
    expect(result.warning).toContain("сезону 2025–2026");
  });

  it("для Новгородской зоны сохраняет второй указанный стационар", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Великий Новгород",
        infectionGroup: "flu_orvi_vp",
        lifeThreats: ["none"],
        admissionCriteria: ["resp_pneumonia"],
      }),
    );
    expect(result.referenceTargets?.[0].name).toContain("Центральная городская");
  });

  it("фиксирует текущий маршрут COVID для Боровичской зоны", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Боровичский район",
        infectionGroup: "covid",
        lifeThreats: ["none"],
        admissionCriteria: ["resp_medical_risk"],
      }),
    );
    expect(result.target.name).toContain("Боровичская");
  });
});

describe("инфекционный профиль: общий маршрут взрослых", () => {
  it("транспортабельного тяжёлого пациента направляет в НОИБ", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Боровичский район",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["severe"],
        transportable: true,
      }),
    );
    expect(result.title).toContain("прямой профильный маршрут");
    expect(result.target.name).toContain("областная инфекционная");
  });

  it("нетранспортабельного тяжёлого пациента сначала направляет на стабилизацию", () => {
    const result = expectRoute(
      evaluateRouting({
        territory: "Пестовский район",
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["severe"],
        transportable: false,
      }),
    );
    expect(result.target.name).toContain("Реанимационное отделение");
    expect(result.nextTarget?.name).toContain("инфекционная больница");
  });

  it.each([
    ["Великий Новгород", "областная инфекционная", undefined],
    ["Боровичский район", "Боровичская", "областная инфекционная"],
    ["Старорусский район", "Старорусская", "областная инфекционная"],
    ["Пестовский район", "Пестовская", "областная инфекционная"],
  ])("территориальный маршрут %s", (territory, targetPart, nextPart) => {
    const result = expectRoute(
      evaluateRouting({
        territory,
        infectionGroup: "general",
        lifeThreats: ["none"],
        admissionCriteria: ["moderate"],
      }),
    );
    expect(result.target.name).toContain(targetPart);
    if (nextPart) expect(result.nextTarget?.name).toContain(nextPart);
    else expect(result.nextTarget).toBeUndefined();
  });
});
