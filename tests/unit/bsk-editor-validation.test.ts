import { describe, expect, it } from "vitest";
import { bskRoutingContent } from "../../src/routing/content-manifests";
import { BSK_RULE_SET_V1 } from "../../src/routing/bsk-rules-v1";
import {
  analyzeRoutingRuleSetAgainstQuestionnaire,
  suggestRoutingControlCases,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
} from "../../src/routing";

describe("редактор профиля БСК", () => {
  it("не оставляет пробелов и пересечений в контрольной матрице", () => {
    expect(
      validateRoutingRuleSetForEditor(
        BSK_RULE_SET_V1,
        bskRoutingContent.questions,
        "bsk",
      ),
    ).toEqual([]);
    const analysis = analyzeRoutingRuleSetAgainstQuestionnaire(
      bskRoutingContent.questions,
      BSK_RULE_SET_V1,
    );
    expect(
      analysis.issues.filter((issue) => issue.kind !== "limit"),
    ).toEqual([]);
    const cases = suggestRoutingControlCases(
      bskRoutingContent.questions,
      BSK_RULE_SET_V1,
    );
    expect(cases).toHaveLength(BSK_RULE_SET_V1.rules.length);
    expect(
      validateRoutingPublicationReadiness(
        bskRoutingContent.questions,
        BSK_RULE_SET_V1,
        cases,
      ).filter((issue) => !issue.path.startsWith("behavior")),
    ).toEqual([]);
  }, 15_000);
});
