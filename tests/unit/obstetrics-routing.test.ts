import { describe, expect, it } from "vitest";
import {
  evalRouting,
  warnings,
  type FormState,
} from "../../src/routing/obstetrics";
import { expectRoute } from "./test-helpers";

type Scenario = {
  name: string;
  state: FormState;
  target: string;
  alternative?: string;
};

const scenarios: Scenario[] = [
  {
    name: "гинекология: Великий Новгород",
    state: { scenario: "gyne_lt37", territory: "Великий Новгород" },
    target: "cgkb",
  },
  {
    name: "гинекология: Валдайская зона",
    state: { scenario: "gyne_lt37", territory: "Валдайский" },
    target: "valdai",
  },
  {
    name: "гинекология: Боровичская зона",
    state: { scenario: "gyne_lt37", territory: "Боровичский район" },
    target: "bor",
  },
  {
    name: "гинекология: Пестовский маршрут",
    state: { scenario: "gyne_lt37", territory: "Пестовский" },
    target: "pesto",
  },
  {
    name: "гинекология: Старорусская зона",
    state: { scenario: "gyne_lt37", territory: "Старорусский" },
    target: "star",
  },
  {
    name: "гинекология: тяжёлая экстрагенитальная патология",
    state: {
      scenario: "gyne_lt37",
      territory: "Великий Новгород",
      extragenitalInpatient: true,
    },
    target: "nokb",
  },
  {
    name: "акушерская критика: АРКЦ",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      critical: true,
      criticalRoute: "kas_arkc",
    },
    target: "nokpc",
  },
  {
    name: "общесоматическая критика: НОКБ",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      critical: true,
      criticalRoute: "profile_nokb",
    },
    target: "nokb",
  },
  {
    name: "преждевременные роды: возможна доставка в НОКПЦ",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      pretermLabor: true,
      canDeliverToNokpc: true,
    },
    target: "nokpc",
  },
  {
    name: "преждевременные роды: запасной территориальный маршрут",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      pretermLabor: true,
      canDeliverToNokpc: false,
    },
    target: "bor",
    alternative: "nokpc",
  },
  {
    name: "средний риск родов",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      riskDelivery: "mid",
    },
    target: "nokpc",
  },
  {
    name: "высокий риск родов",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Старорусский",
      riskDelivery: "high",
    },
    target: "nokpc",
  },
  {
    name: "низкий риск: Боровичская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      riskDelivery: "low",
    },
    target: "bor",
  },
  {
    name: "низкий риск: Старорусская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Старорусский",
      riskDelivery: "low",
    },
    target: "star",
  },
  {
    name: "низкий риск: Валдайская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Валдайский",
      riskDelivery: "low",
    },
    target: "valdai",
    alternative: "nokpc",
  },
  {
    name: "низкий риск: Новгородская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      riskDelivery: "low",
    },
    target: "nokpc",
  },
  {
    name: "послеродовое критическое осложнение",
    state: {
      scenario: "postpartum_le42",
      territory: "Старорусский",
      postpartumIssue: "bleeding",
    },
    target: "nokpc",
  },
  {
    name: "послеродовое прочее: Боровичская зона",
    state: {
      scenario: "postpartum_le42",
      territory: "Боровичский район",
      postpartumIssue: "postop_pain_other",
    },
    target: "bor",
  },
  {
    name: "послеродовое прочее: Валдайская зона",
    state: {
      scenario: "postpartum_le42",
      territory: "Валдайский",
      postpartumIssue: "postop_pain_other",
    },
    target: "valdai",
    alternative: "nokpc",
  },
  {
    name: "послеродовое прочее: остальные территории",
    state: {
      scenario: "postpartum_le42",
      territory: "Старорусский",
      postpartumIssue: "postop_pain_other",
    },
    target: "nokpc",
  },
  {
    name: "грипп или COVID",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      infectionType: "flu_covid",
    },
    target: "noib",
  },
  {
    name: "тяжёлая ОРВИ до 7 дней",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      infectionType: "arvi_pneumo",
      infectionSevere: true,
      infectionOver7Days: false,
    },
    target: "nokb",
  },
  {
    name: "тяжёлая ОРВИ более 7 дней",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      infectionType: "arvi_pneumo",
      infectionSevere: true,
      infectionOver7Days: true,
    },
    target: "nokpc",
  },
  {
    name: "нетяжёлая ОРВИ: Боровичская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      infectionType: "arvi_pneumo",
      infectionSevere: false,
    },
    target: "bor",
  },
  {
    name: "нетяжёлая ОРВИ: Старорусская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Старорусский",
      infectionType: "arvi_pneumo",
      infectionSevere: false,
    },
    target: "star",
  },
  {
    name: "нетяжёлая ОРВИ: остальные территории",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Валдайский",
      infectionType: "arvi_pneumo",
      infectionSevere: false,
    },
    target: "cgkb",
  },
  {
    name: "тяжёлая травма: Пестовский маршрут",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Пестовский",
      trauma: true,
      traumaSevere: true,
    },
    target: "pesto",
    alternative: "nokb",
  },
  {
    name: "нетяжёлая травма: Валдайская зона",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Валдайский",
      trauma: true,
      traumaSevere: false,
    },
    target: "valdai",
    alternative: "nokb",
  },
  {
    name: "угрожающая жизни хирургия в гинекологии: городской профиль",
    state: {
      scenario: "gyne_lt37",
      territory: "Великий Новгород",
      surgery: true,
      surgeryLifeThreat: true,
      surgeryProfile: "city",
    },
    target: "cgkb",
  },
  {
    name: "угрожающая жизни хирургия в гинекологии: областной профиль",
    state: {
      scenario: "gyne_lt37",
      territory: "Великий Новгород",
      surgery: true,
      surgeryLifeThreat: true,
      surgeryProfile: "regional",
    },
    target: "nokb",
  },
  {
    name: "угрожающая жизни хирургия в акушерстве",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Боровичский район",
      surgery: true,
      surgeryLifeThreat: true,
    },
    target: "nokb",
  },
  {
    name: "неугрожающая хирургия: территориальный маршрут",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Старорусский",
      surgery: true,
      surgeryLifeThreat: false,
    },
    target: "star",
  },
  {
    name: "тяжёлая экстрагенитальная патология",
    state: {
      scenario: "obstetrics_ge37",
      territory: "Старорусский",
      extragenitalInpatient: true,
    },
    target: "nokb",
  },
];

describe("акушерство и гинекология: контрольные маршруты", () => {
  it.each(scenarios)("$name", ({ state, target, alternative }) => {
    const result = expectRoute(evalRouting(state));
    expect(result.target.id).toBe(target);
    expect(result.alternative?.id).toBe(alternative);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("не рассчитывает маршрут без сценария", () => {
    expect(evalRouting({ territory: "Великий Новгород" })).toBeNull();
  });

  it("не рассчитывает обычный маршрут без территории", () => {
    expect(evalRouting({ scenario: "gyne_lt37" })).toBeNull();
  });

  it("не рассчитывает родоразрешение без группы риска", () => {
    expect(
      evalRouting({
        scenario: "obstetrics_ge37",
        territory: "Великий Новгород",
      }),
    ).toBeNull();
  });

  it("фиксирует текущий запасной выбор: преждевременные роды без ответа считаются доставляемыми в НОКПЦ", () => {
    const result = expectRoute(
      evalRouting({
        scenario: "obstetrics_ge37",
        territory: "Боровичский район",
        pretermLabor: true,
      }),
    );
    expect(result.target.id).toBe("nokpc");
    expect(
      warnings({
        scenario: "obstetrics_ge37",
        territory: "Боровичский район",
        pretermLabor: true,
      }),
    ).toContain(
      "Преждевременные роды отмечены — укажите, возможна ли доставка в НОКПЦ.",
    );
  });
});

describe("акушерство: приоритеты пересекающихся веток", () => {
  it("инфекция имеет приоритет над травмой, хирургией и критическим состоянием", () => {
    const state: FormState = {
      scenario: "obstetrics_ge37",
      territory: "Великий Новгород",
      infectionType: "flu_covid",
      trauma: true,
      traumaSevere: true,
      surgery: true,
      surgeryLifeThreat: true,
      critical: true,
      criticalRoute: "kas_arkc",
    };
    expect(expectRoute(evalRouting(state)).target.id).toBe("noib");
    expect(warnings(state)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("приоритет инфекции"),
      ]),
    );
  });

  it("травма имеет приоритет над хирургией и критическим состоянием", () => {
    const result = expectRoute(
      evalRouting({
        scenario: "obstetrics_ge37",
        territory: "Боровичский район",
        trauma: true,
        traumaSevere: false,
        surgery: true,
        surgeryLifeThreat: true,
        critical: true,
        criticalRoute: "kas_arkc",
      }),
    );
    expect(result.target.id).toBe("bor");
  });

  it("хирургия имеет приоритет над критическим акушерским маршрутом", () => {
    const result = expectRoute(
      evalRouting({
        scenario: "obstetrics_ge37",
        territory: "Великий Новгород",
        surgery: true,
        surgeryLifeThreat: true,
        critical: true,
        criticalRoute: "kas_arkc",
      }),
    );
    expect(result.target.id).toBe("nokb");
  });
});
