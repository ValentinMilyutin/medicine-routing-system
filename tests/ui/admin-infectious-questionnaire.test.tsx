import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InfectiousQuestionnaireBuilder from "../../src/admin/InfectiousQuestionnaireBuilder";
import { infectiousRoutingContent } from "../../src/routing/content-manifests";
import { INFECTIOUS_RULE_SET_V1 } from "../../src/routing/infectious-rules-v1";
import type {
  RoutingQuestionDescriptor,
  RoutingRuleSetV1,
} from "../../src/routing";

function Harness() {
  const [questions, setQuestions] = useState<readonly RoutingQuestionDescriptor[]>(
    structuredClone(infectiousRoutingContent.questions),
  );
  const [ruleSet, setRuleSet] = useState(
    structuredClone(INFECTIOUS_RULE_SET_V1) as RoutingRuleSetV1,
  );
  return (
    <InfectiousQuestionnaireBuilder
      questions={questions}
      ruleSet={ruleSet}
      onChange={(nextQuestions, nextRuleSet) => {
        setQuestions(nextQuestions);
        setRuleSet(nextRuleSet);
      }}
    />
  );
}

describe("конструктор инфекционного опросника", () => {
  it("добавляет новый вопрос с вариантами и включает его в тестовый опросник", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "+ Добавить вопрос" }));
    expect(screen.getByText("Вопросы, ответы и переходы (6)")).toBeInTheDocument();

    await user.click(screen.getByText(/6\. Новый вопрос/));
    expect(screen.getByDisplayValue("new_question")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Новый вариант")).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Да").length).toBeGreaterThan(0);
  });

  it("показывает автоматическую проверку контрольной матрицы", () => {
    render(<Harness />);
    expect(
      screen.getByText(/Автоматическая проверка логики ·/),
    ).toBeInTheDocument();
  });
});
