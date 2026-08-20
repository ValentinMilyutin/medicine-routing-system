import { describe, expect, it } from "vitest";
import { evaluateRouting } from "../../src/routing/road-accident";
import { expectRoute } from "./test-helpers";

describe("ДТП: обязательные поля", () => {
  it("требует тип места ДТП", () => {
    expect(
      evaluateRouting({
        ageGroup: "adult_18_plus",
        injuryCriterion: "other_without_shock",
      }),
    ).toBeNull();
  });

  it.each(["territory", "m10", "m11"] as const)(
    "не рассчитывает неполный маршрут %s",
    (locationKind) => {
      expect(evaluateRouting({ locationKind })).toBeNull();
    },
  );
});

describe("ДТП: трасса М-11", () => {
  it.each([
    ["nokb_cmk", "570_389", "adult_18_plus", "other_without_shock", "nokb"],
    ["nokb_cmk", "570_389", "child_0_15", "other_without_shock", "odkb"],
    ["novgorod_smp", "570_474", "adult_18_plus", "other_without_shock", "nokb"],
    ["novgorod_smp", "474_389", "adult_18_plus", "other_without_shock", "borovichi"],
    ["novgorod_smp", "474_389", "child_0_15", "severe_tbi_or_shock", "odkb"],
    ["novgorod_smp", "474_389", "child_0_15", "other_without_shock", "borovichi"],
    ["valdai_mmc", "389_444", "adult_18_plus", "severe_tbi_or_shock", "valdai"],
    ["valdai_mmc", "389_444", "child_0_15", "severe_tbi_or_shock", "odkb"],
    ["valdai_mmc", "389_444", "child_0_15", "other_without_shock", "borovichi"],
  ] as const)(
    "%s, %s, %s, %s → %s",
    (m11Responder, m11Zone, ageGroup, injuryCriterion, target) => {
      const result = expectRoute(
        evaluateRouting({
          locationKind: "m11",
          m11Responder,
          m11Zone,
          ageGroup,
          injuryCriterion,
        }),
      );
      expect(result.target.id).toBe(target);
    },
  );

  it("показывает конфликт приказа для подростка в Валдайской зоне", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "m11",
        m11Responder: "valdai_mmc",
        m11Zone: "389_444",
        ageGroup: "age_16_17",
        injuryCriterion: "other_without_shock",
      }),
    );
    expect(result.target.id).toBe("valdai");
    expect(result.warnings.join(" ")).toContain("верификация Минздрава");
  });
});

describe("ДТП: трасса М-10", () => {
  it.each([
    ["valdai_kresttsy", "child_0_15", "other_without_shock", "odkb"],
    ["valdai_kresttsy", "age_16_17", "other_without_shock", "nokb"],
    ["valdai_kresttsy", "adult_18_plus", "other_without_shock", "valdai"],
    ["zaytsevo_novgorod_chudovo", "adult_18_plus", "other_without_shock", "cgkb1"],
    ["zaytsevo_novgorod_chudovo", "adult_18_plus", "severe_tbi_or_shock", "nokb"],
    ["zaytsevo_novgorod_chudovo", "age_16_17", "specialized_injury", "nokb"],
  ] as const)("%s, %s, %s → %s", (m10Zone, ageGroup, injuryCriterion, target) => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "m10",
        m10Zone,
        ageGroup,
        injuryCriterion,
      }),
    );
    expect(result.target.id).toBe(target);
  });

  it("указывает особое предупреждение для жизнеспасающей операции", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "m10",
        m10Zone: "zaytsevo_novgorod_chudovo",
        ageGroup: "adult_18_plus",
        injuryCriterion: "life_saving_10_20",
      }),
    );
    expect(result.warnings.join(" ")).toContain("травмоцентр III уровня");
  });
});

describe("ДТП: муниципальная территория", () => {
  it("использует травмоцентр III уровня для жизнеспасающей операции", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory: "Пестовский район",
        ageGroup: "adult_18_plus",
        injuryCriterion: "life_saving_10_20",
      }),
    );
    expect(result.target.id).toBe("pestovo");
    expect(result.nextTarget?.id).toBe("borovichi");
  });

  it("использует травмоцентр III уровня для стабильной изолированной травмы", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory: "Крестецкий район",
        ageGroup: "adult_18_plus",
        injuryCriterion: "stable_isolated_limb",
      }),
    );
    expect(result.target.id).toBe("kresttsy");
    expect(result.nextTarget?.id).toBe("valdai");
  });

  it("без травмоцентра III уровня направляет в закреплённый центр II уровня", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory: "Мошенской район",
        ageGroup: "adult_18_plus",
        injuryCriterion: "life_saving_10_20",
      }),
    );
    expect(result.target.id).toBe("borovichi");
    expect(result.nextTarget?.id).toBe("nokb");
    expect(result.warnings.join(" ")).toContain("Нормативный пробел");
  });

  it("ребёнка с тяжёлой травмой направляет прямо в ОДКБ", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory: "Боровичский район",
        ageGroup: "child_0_15",
        injuryCriterion: "severe_tbi_or_shock",
      }),
    );
    expect(result.target.id).toBe("odkb");
    expect(result.nextTarget).toBeUndefined();
  });

  it("взрослого с тяжёлой травмой сначала направляет в центр II уровня зоны", () => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory: "Старорусский район",
        ageGroup: "adult_18_plus",
        injuryCriterion: "specialized_injury",
      }),
    );
    expect(result.target.id).toBe("staraya_russa");
    expect(result.nextTarget?.id).toBe("nokb");
  });

  it.each([
    ["Великий Новгород", "adult_18_plus", "cgkb1"],
    ["Боровичский район", "adult_18_plus", "borovichi"],
    ["Старорусский район", "adult_18_plus", "staraya_russa"],
    ["Валдайский район", "adult_18_plus", "valdai"],
    ["Валдайский район", "age_16_17", "nokb"],
    ["Валдайский район", "child_0_15", "odkb"],
  ] as const)("обычная травма: %s, %s → %s", (territory, ageGroup, target) => {
    const result = expectRoute(
      evaluateRouting({
        locationKind: "territory",
        territory,
        ageGroup,
        injuryCriterion: "other_without_shock",
      }),
    );
    expect(result.target.id).toBe(target);
  });
});
