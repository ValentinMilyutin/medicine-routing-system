import type { RoutingQuestionDescriptor } from "./content-schema.js";
import {
  normalizeRoutingQuestionnaireState,
  routingQuestionOptions,
  type RoutingQuestionnaireState,
} from "./questionnaire-runtime.js";
import {
  evaluateRoutingRuleSetV1,
  matchesRoutingConditionV1,
  type RoutingRuleSetV1,
} from "./rules-v1.js";

export type RoutingLogicAnalysisIssue = {
  kind:
    | "gap"
    | "overlap"
    | "unreachable"
    | "shadowed"
    | "duplicate"
    | "limit";
  ruleId?: string;
  message: string;
};

export type RoutingLogicAnalysis = {
  scenarioCount: number;
  complete: boolean;
  winnerCounts: Readonly<Record<string, number>>;
  overlapScenarioCount: number;
  issues: readonly RoutingLogicAnalysisIssue[];
};

function candidateAnswers(
  question: RoutingQuestionDescriptor,
  state: RoutingQuestionnaireState,
): unknown[] {
  if (question.kind === "text") {
    return question.requirement === "optional" ? [undefined, "тест"] : ["тест"];
  }
  if (question.kind === "number") {
    return question.requirement === "optional" ? [undefined, 1] : [1];
  }
  const options = routingQuestionOptions(question, state);
  if (question.kind === "multiple_choice") {
    const singles = options.map((option) => [option.value]);
    const selectable = options
      .filter((option) => !option.exclusive)
      .map((option) => option.value);
    const pairs = selectable.flatMap((left, leftIndex) =>
      selectable
        .slice(leftIndex + 1)
        .map((right) => [left, right]),
    );
    const answers: unknown[] = [...singles, ...pairs];
    if (selectable.length > 2) answers.push(selectable);
    if (question.requirement === "optional") answers.unshift([]);
    return answers.length > 0 ? answers : [[]];
  }
  const answers: unknown[] = options.map((option) => option.value);
  if (question.requirement === "optional") answers.unshift(undefined);
  return answers.length > 0 ? answers : [undefined];
}

export function buildRoutingQuestionnaireScenarioMatrix(
  questions: readonly RoutingQuestionDescriptor[],
  maximum = 20_000,
): { states: RoutingQuestionnaireState[]; complete: boolean } {
  let states: RoutingQuestionnaireState[] = [{}];
  let complete = true;
  for (const question of questions) {
    if (question.kind === "number" || question.kind === "text") {
      complete = false;
    }
    if (
      question.kind === "multiple_choice" &&
      (question.options?.filter((option) => !option.exclusive).length ?? 0) > 2
    ) {
      complete = false;
    }
    const expanded: RoutingQuestionnaireState[] = [];
    for (const state of states) {
      const normalized = normalizeRoutingQuestionnaireState(questions, state);
      const visible =
        question.visibility === undefined ||
        matchesRoutingConditionV1(question.visibility, normalized);
      if (!visible) {
        expanded.push(normalized);
        continue;
      }
      for (const answer of candidateAnswers(question, normalized)) {
        const next = { ...normalized };
        if (answer === undefined) delete next[question.id];
        else next[question.id] = answer;
        expanded.push(normalizeRoutingQuestionnaireState(questions, next));
      }
    }
    if (expanded.length > maximum) {
      complete = false;
      const step = expanded.length / maximum;
      states = Array.from(
        { length: maximum },
        (_, index) => expanded[Math.floor(index * step)]!,
      );
    } else {
      states = expanded;
    }
  }
  const unique = new Map(
    states.map((state) => [JSON.stringify(state), state] as const),
  );
  return { states: [...unique.values()], complete };
}

export function analyzeRoutingRuleSetAgainstQuestionnaire(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  maximum = 20_000,
): RoutingLogicAnalysis {
  const matrix = buildRoutingQuestionnaireScenarioMatrix(questions, maximum);
  const sortedRules = [...ruleSet.rules].sort(
    (left, right) => left.priority - right.priority,
  );
  const winnerCounts: Record<string, number> = Object.fromEntries(
    sortedRules.map((rule) => [rule.id, 0]),
  );
  const matchCounts: Record<string, number> = Object.fromEntries(
    sortedRules.map((rule) => [rule.id, 0]),
  );
  let overlapScenarioCount = 0;
  let gapCount = 0;
  let renderErrorCount = 0;
  const renderErrors = new Set<string>();

  for (const state of matrix.states) {
    const matching = sortedRules.filter((rule) =>
      matchesRoutingConditionV1(rule.when, state),
    );
    if (matching.length === 0) gapCount += 1;
    if (matching.length > 1) overlapScenarioCount += 1;
    matching.forEach((rule) => {
      matchCounts[rule.id] = (matchCounts[rule.id] ?? 0) + 1;
    });
    const winner = matching[0];
    if (winner) {
      winnerCounts[winner.id] = (winnerCounts[winner.id] ?? 0) + 1;
      try {
        evaluateRoutingRuleSetV1(ruleSet, state);
      } catch (reason) {
        renderErrorCount += 1;
        renderErrors.add(
          reason instanceof Error ? reason.message : "Ошибка формирования результата.",
        );
      }
    }
  }

  const issues: RoutingLogicAnalysisIssue[] = [];
  if (gapCount > 0) {
    issues.push({
      kind: "gap",
      message: `${gapCount} из ${matrix.states.length} контрольных сочетаний не дают результата маршрутизации.`,
    });
  }
  if (overlapScenarioCount > 0) {
    issues.push({
      kind: "overlap",
      message: `${overlapScenarioCount} контрольных сочетаний одновременно подходят нескольким веткам. Уточните условия так, чтобы итоговая ветка была однозначной.`,
    });
  }
  if (renderErrorCount > 0) {
    issues.push({
      kind: "gap",
      message: `${renderErrorCount} контрольных сочетаний выбирают ветку, но не могут сформировать результат: ${[...renderErrors][0]}`,
    });
  }
  sortedRules.forEach((rule) => {
    if ((matchCounts[rule.id] ?? 0) === 0) {
      issues.push({
        kind: "unreachable",
        ruleId: rule.id,
        message: `Ветка ${rule.id} не достигается ни в одном контрольном сочетании.`,
      });
    } else if ((winnerCounts[rule.id] ?? 0) === 0) {
      issues.push({
        kind: "shadowed",
        ruleId: rule.id,
        message: `Ветка ${rule.id} совпадает с ответами, но всегда перекрывается более приоритетной веткой.`,
      });
    }
  });

  const conditionOwners = new Map<string, string>();
  sortedRules.forEach((rule) => {
    const serialized = JSON.stringify(rule.when);
    const previous = conditionOwners.get(serialized);
    if (previous) {
      issues.push({
        kind: "duplicate",
        ruleId: rule.id,
        message: `Ветки ${previous} и ${rule.id} имеют одинаковое условие; вторая не сможет сработать.`,
      });
    } else {
      conditionOwners.set(serialized, rule.id);
    }
  });
  if (!matrix.complete) {
    issues.push({
      kind: "limit",
      message: `Проверена контрольная матрица из ${matrix.states.length} сочетаний. Для множественных, текстовых или числовых полей она является покрытием характерных случаев, а не полным перебором всех возможных ответов.`,
    });
  }

  return {
    scenarioCount: matrix.states.length,
    complete: matrix.complete,
    winnerCounts,
    overlapScenarioCount,
    issues,
  };
}
