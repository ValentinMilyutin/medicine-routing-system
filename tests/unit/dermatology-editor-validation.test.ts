import { describe, expect, it } from "vitest";
import { dermatologyRoutingContent } from "../../src/routing/content-manifests";
import { DERMATOLOGY_RULE_SET_V1 } from "../../src/routing/dermatology-rules-v1";
import {
  suggestRoutingControlCases,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
} from "../../src/routing";

describe("редактор дерматовенерологического профиля", () => {
  it("покрывает все ветки и допускает публикационный контроль", () => {
    expect(
      validateRoutingRuleSetForEditor(
        DERMATOLOGY_RULE_SET_V1,
        dermatologyRoutingContent.questions,
        "dermatology",
      ),
    ).toEqual([]);
    const cases = suggestRoutingControlCases(
      dermatologyRoutingContent.questions,
      DERMATOLOGY_RULE_SET_V1,
    );
    expect(cases).toHaveLength(DERMATOLOGY_RULE_SET_V1.rules.length);
    expect(
      validateRoutingPublicationReadiness(
        dermatologyRoutingContent.questions,
        DERMATOLOGY_RULE_SET_V1,
        cases,
      ),
    ).toEqual([]);
  });
});
