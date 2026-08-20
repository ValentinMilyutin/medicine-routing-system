import { describe, expect, it } from "vitest";
import {
  validateInfectiousRuleSetForEditor,
  type RoutingRuleSetV1,
} from "../../src/routing";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import { infectiousRoutingContent } from "../../src/routing/content-manifests";

function cloneRuleSet(): RoutingRuleSetV1 {
  return structuredClone(INFECTIOUS_RULE_SET_V1) as RoutingRuleSetV1;
}

describe("контроль инфекционного конструктора", () => {
  it("принимает исходную матрицу маршрутизации", () => {
    expect(validateInfectiousRuleSetForEditor(cloneRuleSet())).toEqual([]);
  });

  it("не позволяет удалить обязательную территориальную ветку", () => {
    const ruleSet = cloneRuleSet();
    const changed: RoutingRuleSetV1 = {
      ...ruleSet,
      rules: ruleSet.rules.filter((rule) => rule.id !== "territorial_staged"),
    };

    expect(validateInfectiousRuleSetForEditor(changed)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringContaining("Боровичский район:inpatient:general"),
          message: "Ни одна ветка не определяет маршрут.",
        }),
      ]),
    );
  });

  it("не принимает неизвестное поле пациента", () => {
    const ruleSet = cloneRuleSet();
    const changed: RoutingRuleSetV1 = {
      ...ruleSet,
      rules: ruleSet.rules.map((rule, index) =>
        index === 0
          ? {
              ...rule,
              when: { op: "eq", field: "secretField", value: true },
            }
          : rule,
      ),
    };

    expect(validateInfectiousRuleSetForEditor(changed)).toContainEqual(
      expect.objectContaining({
        path: "rules[0].when.field",
        message: expect.stringContaining("не существует"),
      }),
    );
  });

  it("разрешает использовать новый вопрос, объявленный в конструкторе", () => {
    const ruleSet = cloneRuleSet();
    const questions = [
      ...infectiousRoutingContent.questions,
      {
        id: "specialRisk",
        label: "Особый риск",
        kind: "boolean" as const,
        requirement: "optional" as const,
        options: [
          { value: true, label: "Да" },
          { value: false, label: "Нет" },
        ],
      },
    ];
    const changed: RoutingRuleSetV1 = {
      ...ruleSet,
      rules: ruleSet.rules.map((rule, index) =>
        index === ruleSet.rules.length - 1
          ? {
              ...rule,
              when: {
                op: "any",
                conditions: [
                  rule.when,
                  { op: "eq", field: "specialRisk", value: true },
                ],
              },
            }
          : rule,
      ),
    };

    expect(validateInfectiousRuleSetForEditor(changed, questions)).toEqual([]);
  });

  it("не принимает ссылку результата на удалённый вопрос", () => {
    const ruleSet = cloneRuleSet();
    const changed: RoutingRuleSetV1 = {
      ...ruleSet,
      rules: ruleSet.rules.map((rule, index) =>
        index === 0
          ? {
              ...rule,
              result: { title: { $field: "deletedQuestion" } },
            }
          : rule,
      ),
    };

    expect(
      validateInfectiousRuleSetForEditor(
        changed,
        infectiousRoutingContent.questions,
      ),
    ).toContainEqual(
      expect.objectContaining({
        path: "rules[0].result.title.$field",
        message: expect.stringContaining("отсутствует"),
      }),
    );
  });
});
