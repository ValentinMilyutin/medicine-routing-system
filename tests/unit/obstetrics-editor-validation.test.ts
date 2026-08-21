import { describe, expect, it } from "vitest";
import { obstetricsRoutingContent } from "../../src/routing/content-manifests";
import { OBSTETRICS_RULE_SET_V1 } from "../../src/routing/obstetrics-rules-v1";
import {
  analyzeRoutingRuleSetAgainstQuestionnaire,
  suggestRoutingControlCases,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
} from "../../src/routing";

describe("редактор акушерско-гинекологического профиля", () => {
  it("покрывает перебивающий триаж, территориальные назначения и адреса", () => {
    expect(validateRoutingRuleSetForEditor(
      OBSTETRICS_RULE_SET_V1,
      obstetricsRoutingContent.questions,
      "obgyn",
    )).toEqual([]);
    const analysis = analyzeRoutingRuleSetAgainstQuestionnaire(
      obstetricsRoutingContent.questions,
      OBSTETRICS_RULE_SET_V1,
      50_000,
    );
    expect(analysis.issues.filter((issue) => issue.kind !== "limit")).toEqual([]);
    const cases = suggestRoutingControlCases(
      obstetricsRoutingContent.questions,
      OBSTETRICS_RULE_SET_V1,
    );
    expect(cases).toHaveLength(OBSTETRICS_RULE_SET_V1.rules.length);
    expect(validateRoutingPublicationReadiness(
      obstetricsRoutingContent.questions,
      OBSTETRICS_RULE_SET_V1,
      cases,
    ).filter((issue) => !issue.path.startsWith("behavior"))).toEqual([]);
  }, 30_000);
});
