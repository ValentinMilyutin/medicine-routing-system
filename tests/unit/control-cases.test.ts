import { describe, expect, it } from "vitest";
import {
  compareRoutingBehavior,
  routingContentDocuments,
  routingRuleSetRegistry,
  suggestRoutingControlCases,
  validateRoutingContentDocument,
  validateInfectiousControlCases,
  validateInfectiousPublicationReadiness,
  type RoutingProfileContentDocument,
  type RoutingRuleSetV1,
} from "../../src/routing";

function bundle(): {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
} {
  const document = routingContentDocuments.find(
    (item) => item.profileId === "infectious",
  );
  if (!document) throw new Error("Не найден инфекционный профиль.");
  return { document, ruleSet: routingRuleSetRegistry["infectious.v1"] };
}

describe("контроль поведения инфекционного конструктора", () => {
  it("создаёт проходящий пример для каждой достижимой ветки", () => {
    const { document, ruleSet } = bundle();
    const controlCases = suggestRoutingControlCases(
      document.questions,
      ruleSet,
    );

    expect(controlCases.map((item) => item.expected.ruleId).sort()).toEqual(
      ruleSet.rules.map((rule) => rule.id).sort(),
    );
    expect(
      validateInfectiousControlCases(
        document.questions,
        ruleSet,
        controlCases,
      ),
    ).toEqual([]);
    expect(
      validateRoutingContentDocument({ ...document, controlCases }),
    ).toEqual([]);
    expect(
      validateInfectiousPublicationReadiness(
        document.questions,
        ruleSet,
        controlCases,
      ),
    ).toEqual([]);
  });

  it("блокирует публикацию неподдерживаемого числового вопроса", () => {
    const { document, ruleSet } = bundle();
    const questions = [
      ...document.questions,
      {
        id: "numeric_test",
        label: "Числовой тест",
        kind: "number" as const,
        requirement: "optional" as const,
      },
    ];
    const issues = validateInfectiousPublicationReadiness(
      questions,
      ruleSet,
      suggestRoutingControlCases(document.questions, ruleSet),
    );

    expect(issues.some((issue) => issue.path.endsWith(".kind"))).toBe(true);
  });

  it("показывает фактическое изменение пункта назначения", () => {
    const { document, ruleSet } = bundle();
    const facilities = ruleSet.catalogs.facilities;
    const noib = facilities?.noib;
    if (!facilities || !noib || typeof noib !== "object" || Array.isArray(noib)) {
      throw new Error("Не найден тестовый стационар.");
    }
    const changedRuleSet: RoutingRuleSetV1 = {
      ...ruleSet,
      catalogs: {
        ...ruleSet.catalogs,
        facilities: {
          ...facilities,
          noib: { ...noib, address: "Изменённый адрес" },
        },
      },
    };
    const diff = compareRoutingBehavior(
      document.questions,
      ruleSet,
      document.questions,
      changedRuleSet,
    );

    expect(diff.changedCount).toBeGreaterThan(0);
    expect(
      diff.changes.some(
        (change) =>
          change.after.kind === "route" &&
          change.after.targetAddress === "Изменённый адрес",
      ),
    ).toBe(true);
  });
});
