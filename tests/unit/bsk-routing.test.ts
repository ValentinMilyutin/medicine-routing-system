import { describe, expect, it } from "vitest";
import {
  evaluateRouting,
  type BSKFormState,
} from "../../src/routing/bsk";
import { expectRoute } from "./test-helpers";

describe("БСК: обязательные поля и приоритет нестабильности", () => {
  it("не рассчитывает маршрут без территории", () => {
    expect(evaluateRouting({ branch: "stroke" })).toBeNull();
  });

  it("не рассчитывает маршрут для неизвестной территории", () => {
    expect(
      evaluateRouting({ branch: "stroke", territory: "Неизвестная территория" }),
    ).toBeNull();
  });

  it.each(["stroke", "acs", "other_cvd", "kink"] as const)(
    "нестабильные витальные функции перекрывают ветку %s",
    (branch) => {
      const result = expectRoute(
        evaluateRouting({
          branch,
          territory: "Боровичский",
          unstableVitals: true,
          onsetWithin5h: true,
          stElevation: true,
          pciWithin120: true,
          restPain: true,
        }),
      );
      expect(result.target.id).toBe("nearest_reanimation");
      expect(result.alternative?.id).toBe("borovichi_crb");
    },
  );
});

describe("БСК: ОНМК", () => {
  it.each([
    ["Великий Новгород", "cgkb1"],
    ["Боровичский", "borovichi_crb"],
    ["Старорусский", "staraya_russa_crb"],
    ["Валдайский", "cgkb1"],
    ["Демянский", "staraya_russa_crb"],
    ["Марёвский", "staraya_russa_crb"],
  ])("территориальный маршрут %s → %s", (territory, target) => {
    const result = expectRoute(
      evaluateRouting({ branch: "stroke", territory }),
    );
    expect(result.target.id).toBe(target);
  });

  it("терапевтическое окно направляет в НОКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "stroke",
        territory: "Боровичский",
        onsetWithin5h: true,
      }),
    );
    expect(result.target.id).toBe("nokb");
    expect(result.alternative?.id).toBe("borovichi_crb");
  });

  it("выраженный двигательный дефицит направляет в НОКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "stroke",
        territory: "Старорусский",
        fastFace: true,
        fastArm: true,
        armMovement: "falls",
        gripStrength: "absent",
      }),
    );
    expect(result.target.id).toBe("nokb");
    expect(result.notify.join(" ")).toContain("Выраженный двигательный дефицит");
  });

  it("балл ниже текущего порога сохраняет территориальный маршрут", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "stroke",
        territory: "Боровичский",
        fastFace: true,
        fastArm: true,
        armMovement: "drifts",
        gripStrength: "weak",
      }),
    );
    expect(result.target.id).toBe("borovichi_crb");
  });
});

describe("БСК: ОКС и другие острые ССЗ", () => {
  it.each([
    ["Великий Новгород", "nokb"],
    ["Боровичский", "borovichi_crb"],
    ["Старорусский", "staraya_russa_crb"],
    ["Валдайский", "valdai_mmc"],
  ])("базовый маршрут ОКС %s → %s", (territory, target) => {
    expect(
      expectRoute(evaluateRouting({ branch: "acs", territory })).target.id,
    ).toBe(target);
  });

  it("подъём ST и доступность ЧКВ направляют в НОКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "acs",
        territory: "Валдайский",
        stElevation: true,
        pciWithin120: true,
      }),
    );
    expect(result.target.id).toBe("nokb");
    expect(result.alternative?.id).toBe("valdai_mmc");
  });

  it("ОКС без подъёма ST высокого риска направляет в НОКБ", () => {
    expect(
      expectRoute(
        evaluateRouting({
          branch: "acs",
          territory: "Боровичский",
          nsteHighRisk: true,
        }),
      ).target.id,
    ).toBe("nokb");
  });

  it.each([
    ["Великий Новгород", "cgkb1"],
    ["Боровичский", "borovichi_crb"],
    ["Старорусский", "staraya_russa_crb"],
    ["Валдайский", "valdai_mmc"],
  ])("другие острые ССЗ %s → %s", (territory, target) => {
    const state: BSKFormState = {
      branch: "other_cvd",
      territory,
      acuteHeartFailure: true,
    };
    expect(expectRoute(evaluateRouting(state)).target.id).toBe(target);
  });
});

describe("БСК: КИНК", () => {
  it("боль покоя направляет в сосудистый центр НОКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "kink",
        territory: "Великий Новгород",
        restPain: true,
      }),
    );
    expect(result.target.id).toBe("nokb");
    expect(result.alternative?.id).toBe("cgkb1");
  });

  it("гангрена в Новгородской зоне направляет в хирургический маршрут ЦГКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "kink",
        territory: "Великий Новгород",
        necrosisGangrene: true,
      }),
    );
    expect(result.target.id).toBe("cgkb1");
    expect(result.alternative?.id).toBe("nokb");
  });

  it("гангрена вне Новгородской зоны направляет в НОКБ", () => {
    expect(
      expectRoute(
        evaluateRouting({
          branch: "kink",
          territory: "Боровичский",
          necrosisGangrene: true,
        }),
      ).target.id,
    ).toBe("nokb");
  });

  it("только трофические изменения сохраняют территориальный маршрут", () => {
    const result = expectRoute(
      evaluateRouting({
        branch: "kink",
        territory: "Валдайский",
        trophicChanges: true,
      }),
    );
    expect(result.target.id).toBe("valdai_mmc");
    expect(result.urgency).toContain("оценка вероятности КИНК");
  });

  it("пустой набор критериев фиксирует текущий маршрут клинической оценки", () => {
    const result = expectRoute(
      evaluateRouting({ branch: "kink", territory: "Старорусский" }),
    );
    expect(result.target.id).toBe("staraya_russa_crb");
    expect(result.urgency).toContain("КИНК не подтверждена");
  });
});
