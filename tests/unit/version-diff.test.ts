import { describe, expect, it } from "vitest";
import {
  compareRoutingVersions,
  routingContentDocuments,
  routingRuleSetRegistry,
} from "../../src/routing";

function infectiousBundle() {
  const document = routingContentDocuments.find(
    (item) => item.profileId === "infectious",
  );
  if (!document) throw new Error("Не найден инфекционный профиль.");
  return {
    document,
    ruleSet: routingRuleSetRegistry["infectious.v1"],
  };
}

describe("сравнение кандидата с текущей версией", () => {
  it("не показывает отличий для одинакового содержимого", () => {
    const { document, ruleSet } = infectiousBundle();
    expect(compareRoutingVersions(document, ruleSet, document, ruleSet)).toMatchObject({
      total: 0,
      highImpactCount: 0,
    });
  });

  it("разделяет изменения вопросов, логики и источников", () => {
    const { document, ruleSet } = infectiousBundle();
    const nextDocument = {
      ...document,
      questions: document.questions.map((question, index) =>
        index === 0 ? { ...question, label: `${question.label} — уточнение` } : question,
      ),
      sources: document.sources.map((source, index) =>
        index === 0 ? { ...source, verificationStatus: "verified" as const } : source,
      ),
    };
    const nextRuleSet = {
      ...ruleSet,
      rules: ruleSet.rules.map((rule, index) =>
        index === 0 ? { ...rule, priority: rule.priority + 1 } : rule,
      ),
    };
    const diff = compareRoutingVersions(
      document,
      ruleSet,
      nextDocument,
      nextRuleSet,
    );

    expect(diff.counts.questions).toBe(1);
    expect(diff.counts.routing).toBe(1);
    expect(diff.counts.sources).toBe(1);
    expect(diff.highImpactCount).toBe(1);
  });
});
