import type {
  RoutingControlCase,
  RoutingControlCaseExpectation,
  RoutingQuestionDescriptor,
} from "./content-schema.js";
import {
  buildRoutingQuestionnaireScenarioMatrix,
  analyzeRoutingRuleSetAgainstQuestionnaire,
} from "./questionnaire-analysis.js";
import {
  normalizeRoutingQuestionnaireState,
  unansweredRequiredRoutingQuestions,
  type RoutingQuestionnaireState,
} from "./questionnaire-runtime.js";
import {
  evaluateRoutingRuleSetV1,
  type RoutingRuleEvaluationV1,
  type RoutingRuleSetV1,
  type RoutingRuleSetValidationIssue,
} from "./rules-v1.js";
import { prepareRoutingEvaluationState } from "./evaluation-state.js";

export type RoutingControlCaseCheck = {
  ok: boolean;
  message: string;
  actual?: RoutingControlCaseExpectation;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, field: string): string {
  return typeof value[field] === "string" ? value[field] : "";
}

function expectationFromEvaluation(
  evaluation: RoutingRuleEvaluationV1,
  profileId: RoutingRuleSetV1["profileId"],
): RoutingControlCaseExpectation | null {
  if (!isRecord(evaluation.result)) {
    return null;
  }
  const result = evaluation.result as Record<string, unknown>;
  const targetValue = profileId === "oncology"
    ? result.locationPrimaryHospital
    : result.target;
  if (!isRecord(targetValue)) return null;
  const target = targetValue as Record<string, unknown>;
  const nextTarget = isRecord(result.nextTarget)
    ? result.nextTarget
    : undefined;
  const expectation: RoutingControlCaseExpectation = {
    ruleId: evaluation.ruleId,
    title: stringField(result, profileId === "oncology" ? "routeTitle" : "title"),
    targetName: stringField(target, "name"),
    targetAddress: stringField(target, "address"),
  };
  const nextTargetName = nextTarget ? stringField(nextTarget, "name") : "";
  if (nextTargetName) expectation.nextTargetName = nextTargetName;
  return expectation;
}

function sameExpectation(
  expected: RoutingControlCaseExpectation,
  actual: RoutingControlCaseExpectation,
): boolean {
  return (
    expected.ruleId === actual.ruleId &&
    expected.title === actual.title &&
    expected.targetName === actual.targetName &&
    expected.targetAddress === actual.targetAddress &&
    (expected.nextTargetName ?? "") === (actual.nextTargetName ?? "")
  );
}

function projectedState(
  questions: readonly RoutingQuestionDescriptor[],
  input: RoutingQuestionnaireState,
): RoutingQuestionnaireState {
  const known = new Set(questions.map((question) => question.id));
  return Object.fromEntries(
    Object.entries(input).filter(([field]) => known.has(field)),
  );
}

export function captureRoutingControlCaseExpectation(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  input: RoutingQuestionnaireState,
): RoutingControlCaseExpectation | null {
  const state = normalizeRoutingQuestionnaireState(
    questions,
    projectedState(questions, input),
  );
  if (unansweredRequiredRoutingQuestions(questions, state).length > 0) {
    return null;
  }
  const evaluation = evaluateRoutingRuleSetV1(
    ruleSet,
    prepareRoutingEvaluationState(ruleSet.profileId, state),
  );
  return evaluation ? expectationFromEvaluation(evaluation, ruleSet.profileId) : null;
}

export function checkRoutingControlCase(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  controlCase: RoutingControlCase,
): RoutingControlCaseCheck {
  const known = new Set(questions.map((question) => question.id));
  const unknownFields = Object.keys(controlCase.state).filter(
    (field) => !known.has(field),
  );
  if (unknownFields.length > 0) {
    return {
      ok: false,
      message: `Неизвестные поля: ${unknownFields.join(", ")}.`,
    };
  }

  const input = projectedState(questions, controlCase.state);
  const state = normalizeRoutingQuestionnaireState(questions, input);
  const removedFields = Object.keys(input).filter((field) => !(field in state));
  if (removedFields.length > 0) {
    return {
      ok: false,
      message: `Ответы больше не допустимы или скрыты: ${removedFields.join(", ")}.`,
    };
  }
  const missing = unansweredRequiredRoutingQuestions(questions, state);
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Не заполнены обязательные вопросы: ${missing
        .map((question) => question.label)
        .join(", ")}.`,
    };
  }

  try {
    const evaluation = evaluateRoutingRuleSetV1(
      ruleSet,
      prepareRoutingEvaluationState(ruleSet.profileId, state),
    );
    if (!evaluation) {
      return { ok: false, message: "Ни одна ветка не определяет маршрут." };
    }
    const actual = expectationFromEvaluation(evaluation, ruleSet.profileId);
    if (!actual) {
      return {
        ok: false,
        message: "Результат ветки не содержит заполненный пункт назначения.",
      };
    }
    if (!sameExpectation(controlCase.expected, actual)) {
      return {
        ok: false,
        actual,
        message: `Ожидалась ветка ${controlCase.expected.ruleId}, сейчас срабатывает ${actual.ruleId}.`,
      };
    }
    return { ok: true, actual, message: "Маршрут совпадает с ожидаемым." };
  } catch (reason) {
    return {
      ok: false,
      message:
        reason instanceof Error
          ? reason.message
          : "Не удалось проверить контрольный пример.",
    };
  }
}

export function validateInfectiousControlCases(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  controlCases: readonly RoutingControlCase[] | undefined,
): RoutingRuleSetValidationIssue[] {
  const cases = controlCases ?? [];
  const issues: RoutingRuleSetValidationIssue[] = [];
  if (cases.length === 0) {
    return [
      {
        path: "controlCases",
        message:
          "Нужны контрольные примеры: хотя бы один подтверждённый пример для каждой ветки.",
      },
    ];
  }

  const coveredRules = new Set<string>();
  cases.forEach((controlCase, index) => {
    const check = checkRoutingControlCase(questions, ruleSet, controlCase);
    if (!check.ok) {
      issues.push({
        path: `controlCases[${index}]`,
        message: `${controlCase.label}: ${check.message}`,
      });
      return;
    }
    if (check.actual) coveredRules.add(check.actual.ruleId);
  });
  ruleSet.rules.forEach((rule) => {
    if (!coveredRules.has(rule.id)) {
      issues.push({
        path: `controlCases.${rule.id}`,
        message: `Для ветки ${rule.id} нет проходящего контрольного примера.`,
      });
    }
  });
  return issues;
}

export const validateRoutingControlCases = validateInfectiousControlCases;

export function validateInfectiousPublicationReadiness(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  controlCases: readonly RoutingControlCase[] | undefined,
): RoutingRuleSetValidationIssue[] {
  const issues: RoutingRuleSetValidationIssue[] = [];
  questions.forEach((question, index) => {
    if (question.kind === "number" || question.kind === "text") {
      issues.push({
        path: `questions[${index}].kind`,
        message: `Вопрос «${question.label}»: тип «${
          question.kind === "number" ? "Число" : "Текст"
        }» пока нельзя использовать в публикуемой маршрутизации.`,
      });
    }
  });
  const analysis = analyzeRoutingRuleSetAgainstQuestionnaire(questions, ruleSet);
  analysis.issues
    .filter((issue) => issue.kind !== "limit")
    .forEach((issue, index) => {
      issues.push({
        path: `behavior.${issue.ruleId ?? index}`,
        message: issue.message,
      });
    });
  issues.push(
    ...validateInfectiousControlCases(questions, ruleSet, controlCases),
  );
  return issues;
}

export const validateRoutingPublicationReadiness =
  validateInfectiousPublicationReadiness;

function uniqueCaseId(existing: ReadonlySet<string>, ruleId: string): string {
  const base = `case_${ruleId}`.replace(/[^A-Za-z0-9_]/g, "_");
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export function suggestRoutingControlCases(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  existing: readonly RoutingControlCase[] = [],
): RoutingControlCase[] {
  const existingRuleIds = new Set(
    existing.map((controlCase) => controlCase.expected.ruleId),
  );
  const ids = new Set(existing.map((controlCase) => controlCase.id));
  const suggestions: RoutingControlCase[] = [];
  const matrix = buildRoutingQuestionnaireScenarioMatrix(
    questions,
    ruleSet.profileId === "oncology" || ruleSet.profileId === "obgyn" ? 50_000 : 20_000,
  );
  for (const candidate of matrix.states) {
    if (unansweredRequiredRoutingQuestions(questions, candidate).length > 0) {
      continue;
    }
    const evaluation = evaluateRoutingRuleSetV1(
      ruleSet,
      prepareRoutingEvaluationState(ruleSet.profileId, candidate),
    );
    if (!evaluation || existingRuleIds.has(evaluation.ruleId)) continue;
    const expected = expectationFromEvaluation(evaluation, ruleSet.profileId);
    if (!expected) continue;
    const id = uniqueCaseId(ids, evaluation.ruleId);
    ids.add(id);
    existingRuleIds.add(evaluation.ruleId);
    suggestions.push({
      id,
      label: `Контроль ветки ${evaluation.ruleId}`,
      state: projectedState(questions, candidate) as RoutingControlCase["state"],
      expected,
    });
    if (existingRuleIds.size >= ruleSet.rules.length) break;
  }
  return suggestions;
}

export function describeRoutingControlState(
  questions: readonly RoutingQuestionDescriptor[],
  state: RoutingQuestionnaireState,
): string {
  return questions
    .filter((question) => question.id in state)
    .map((question) => {
      const answer = state[question.id];
      const values = Array.isArray(answer) ? answer : [answer];
      const labels = values.map(
        (value) =>
          question.options?.find((option) => Object.is(option.value, value))
            ?.label ?? String(value),
      );
      return `${question.label}: ${labels.join(", ")}`;
    })
    .join(" · ");
}
