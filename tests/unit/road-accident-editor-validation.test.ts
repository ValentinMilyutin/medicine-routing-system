import { describe, expect, it } from "vitest";
import { roadAccidentRoutingContent } from "../../src/routing/content-manifests";
import { ROAD_ACCIDENT_RULE_SET_V1 } from "../../src/routing/road-accident-rules-v1";
import {
  suggestRoutingControlCases,
  validateRoutingPublicationReadiness,
  validateRoutingRuleSetForEditor,
} from "../../src/routing";

describe("редактор профиля ДТП", () => {
  it("принимает встроенную анкету и исполняемые правила", () => {
    expect(
      validateRoutingRuleSetForEditor(
        ROAD_ACCIDENT_RULE_SET_V1,
        roadAccidentRoutingContent.questions,
        "road_accident",
      ),
    ).toEqual([]);
  });

  it("создаёт контрольный пример для каждой достижимой ветки", () => {
    const controlCases = suggestRoutingControlCases(
      roadAccidentRoutingContent.questions,
      ROAD_ACCIDENT_RULE_SET_V1,
    );
    expect(controlCases.map((item) => item.expected.ruleId).sort()).toEqual(
      ROAD_ACCIDENT_RULE_SET_V1.rules.map((rule) => rule.id).sort(),
    );
    expect(
      validateRoutingPublicationReadiness(
        roadAccidentRoutingContent.questions,
        ROAD_ACCIDENT_RULE_SET_V1,
        controlCases,
      ),
    ).toEqual([]);
  });
});
