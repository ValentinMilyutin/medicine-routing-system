import { describe, expect, it } from "vitest";
import { oncologyRoutingContent } from "../../src/routing/content-manifests";
import { ONCOLOGY_RULE_SET_V1 } from "../../src/routing/oncology-rules-v1";
import {
  analyzeRoutingRuleSetAgainstQuestionnaire,
  suggestRoutingControlCases,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
  prepareRoutingEvaluationState,
  evaluateRoutingRuleSetV1,
} from "../../src/routing";

describe("редактор онкологического профиля", () => {
  it("рассчитывает маршрут, медицинскую организацию и контрольные примеры", () => {
    expect(evaluateRoutingRuleSetV1(ONCOLOGY_RULE_SET_V1, prepareRoutingEvaluationState("oncology", {
      territory: "Великий Новгород",
      oncologyStatus: "confirmed_known",
      leadingSigns: [],
      medicalTransportNeeded: false,
      palliativeProfileKnown: true,
      palliativeFormat: "inpatient",
      docsAvailable: true,
    }))?.ruleId).toBe("palliative_with_trigger");
    expect(
      validateRoutingRuleSetForEditor(
        ONCOLOGY_RULE_SET_V1,
        oncologyRoutingContent.questions,
        "oncology",
      ),
    ).toEqual([]);
    const analysis = analyzeRoutingRuleSetAgainstQuestionnaire(
      oncologyRoutingContent.questions,
      ONCOLOGY_RULE_SET_V1,
    );
    expect(analysis.issues.filter((issue) => issue.kind !== "limit")).toEqual([]);
    const cases = suggestRoutingControlCases(
      oncologyRoutingContent.questions,
      ONCOLOGY_RULE_SET_V1,
    );
    expect(cases).toHaveLength(ONCOLOGY_RULE_SET_V1.rules.length);
    expect(
      validateRoutingPublicationReadiness(
        oncologyRoutingContent.questions,
        ONCOLOGY_RULE_SET_V1,
        cases,
      ).filter((issue) => !issue.path.startsWith("behavior")),
    ).toEqual([]);
  }, 15_000);
});
