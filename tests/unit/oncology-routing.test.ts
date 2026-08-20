import { describe, expect, it } from "vitest";
import {
  evalRouting,
  type FormState,
} from "../../src/routing/oncology";

function baseState(patch: Partial<FormState> = {}): FormState {
  return {
    territory: "Великий Новгород",
    oncologyStatus: "confirmed_known",
    leadingSigns: [],
    ...patch,
  };
}

describe("онкология: конечные ветки", () => {
  it.each([
    {
      name: "плановое направление при подозрении",
      patch: { oncologyStatus: "suspected_only" as const },
      route: "plan_onco_referral",
    },
    {
      name: "сосудистый или кардиальный приоритет",
      patch: { leadingSigns: ["mi_or_stroke_suspected"] as FormState["leadingSigns"] },
      route: "vascular_cardiac",
    },
    {
      name: "известное ЗНО и хирургический синдром",
      patch: {
        leadingSigns: ["intestinal_obstruction_suspected"] as FormState["leadingSigns"],
      },
      route: "urgent_oncosurgery_known_cancer",
    },
    {
      name: "хирургический синдром при неподтверждённом статусе",
      patch: {
        oncologyStatus: "suspected_only" as const,
        leadingSigns: ["intestinal_obstruction_suspected"] as FormState["leadingSigns"],
      },
      route: "urgent_surgical_syndrome_unclear",
    },
    {
      name: "общая неотложная госпитализация",
      patch: { leadingSigns: ["respiratory_failure"] as FormState["leadingSigns"] },
      route: "urgent_general_hospital",
    },
    {
      name: "паллиативный маршрут",
      patch: {
        palliativeProfileKnown: true,
        palliativeFormat: "outpatient" as const,
        leadingSigns: ["uncontrolled_cancer_pain"] as FormState["leadingSigns"],
      },
      route: "palliative",
    },
    {
      name: "медицинская транспортировка",
      patch: { medicalTransportNeeded: true },
      route: "medical_transport_non_emergency",
    },
    {
      name: "без госпитализации",
      patch: {},
      route: "no_hospitalization",
    },
  ])("$name", ({ patch, route }) => {
    const result = evalRouting(baseState(patch));
    expect(result.route).toBe(route);
    expect(result.target.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
  });
});

describe("онкология: приоритеты", () => {
  it("подозрение на инфаркт/ОНМК перекрывает хирургические и общие признаки", () => {
    const result = evalRouting(
      baseState({
        leadingSigns: [
          "mi_or_stroke_suspected",
          "intestinal_obstruction_suspected",
          "respiratory_failure",
        ],
      }),
    );
    expect(result.route).toBe("vascular_cardiac");
  });

  it("хирургический синдром перекрывает общую неотложность", () => {
    const result = evalRouting(
      baseState({
        leadingSigns: [
          "intestinal_obstruction_suspected",
          "respiratory_failure",
        ],
      }),
    );
    expect(result.route).toBe("urgent_oncosurgery_known_cancer");
  });

  it("общая неотложность перекрывает паллиативную ветку", () => {
    const result = evalRouting(
      baseState({
        palliativeProfileKnown: true,
        palliativeFormat: "inpatient",
        leadingSigns: ["respiratory_failure", "uncontrolled_cancer_pain"],
      }),
    );
    expect(result.route).toBe("urgent_general_hospital");
  });

  it("паллиативная ветка перекрывает обычную медицинскую транспортировку", () => {
    const result = evalRouting(
      baseState({
        palliativeProfileKnown: true,
        medicalTransportNeeded: true,
      }),
    );
    expect(result.route).toBe("palliative");
  });
});

describe("онкология: территориальные предупреждения", () => {
  it("показывает неопределённость на территории с пересечением", () => {
    const result = evalRouting(
      baseState({ territory: "Крестецкий", oncologyStatus: "suspected_only" }),
    );
    expect(result.uncertainties?.join(" ")).toContain("пересечение");
  });

  it("фиксирует неизвестную территорию как требующую ручной проверки", () => {
    const result = evalRouting(
      baseState({ territory: "Неизвестная территория" }),
    );
    expect(result.locationPrimaryHospital.name).toContain("Не определён");
    expect(result.ems.id).toBe("unknown");
  });
});
