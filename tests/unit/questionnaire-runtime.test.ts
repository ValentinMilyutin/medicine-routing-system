import { describe, expect, it } from "vitest";
import { infectiousRoutingContent } from "../../src/routing/content-manifests";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import {
  analyzeRoutingRuleSetAgainstQuestionnaire,
  normalizeRoutingQuestionnaireState,
  setRoutingQuestionAnswer,
  visibleRoutingQuestions,
} from "../../src/routing";

const questions = infectiousRoutingContent.questions;

describe("динамический инфекционный опросник", () => {
  it("показывает условные вопросы только после нужных ответов", () => {
    let state = {
      territory: "Батецкий район",
      infectionGroup: "general",
      lifeThreats: [] as string[],
    };
    expect(visibleRoutingQuestions(questions, state).map((item) => item.id)).toEqual([
      "territory",
      "infectionGroup",
      "lifeThreats",
    ]);

    state = setRoutingQuestionAnswer(
      questions,
      state,
      "lifeThreats",
      "none",
    ) as typeof state;
    expect(visibleRoutingQuestions(questions, state).map((item) => item.id)).toContain(
      "admissionCriteria",
    );

    const severe = setRoutingQuestionAnswer(
      questions,
      state,
      "admissionCriteria",
      "severe",
    );
    expect(visibleRoutingQuestions(questions, severe).map((item) => item.id)).toContain(
      "transportable",
    );
  });

  it("снимает взаимоисключающие и скрытые ответы", () => {
    let state = setRoutingQuestionAnswer(
      questions,
      { lifeThreats: ["respiratory_failure"] },
      "lifeThreats",
      "none",
    );
    expect(state.lifeThreats).toEqual(["none"]);

    state = normalizeRoutingQuestionnaireState(questions, {
      infectionGroup: "covid",
      lifeThreats: ["none"],
      admissionCriteria: ["moderate", "resp_pneumonia"],
    });
    expect(state.admissionCriteria).toEqual(["resp_pneumonia"]);
  });

  it("строит контрольную матрицу и находит итог для всех базовых сочетаний", () => {
    const analysis = analyzeRoutingRuleSetAgainstQuestionnaire(
      questions,
      INFECTIOUS_RULE_SET_V1,
    );
    expect(analysis.scenarioCount).toBeGreaterThan(1_000);
    expect(analysis.issues.filter((issue) => issue.kind === "gap")).toEqual([]);
    expect(Object.values(analysis.winnerCounts).every((count) => count > 0)).toBe(true);
  });
});
