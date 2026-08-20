import { describe, expect, it } from "vitest";
import {
  validateInfectiousRuleSetForEditor,
  type RoutingRuleSetV1,
} from "../../src/routing";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";

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
});
