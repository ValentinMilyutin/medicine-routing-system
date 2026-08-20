import type {
  RoutingQuestionDescriptor,
  RoutingQuestionOption,
} from "./content-schema.js";
import { matchesRoutingConditionV1 } from "./rules-v1.js";

export type RoutingQuestionnaireState = Record<string, unknown>;

export function routingQuestionOptions(
  question: RoutingQuestionDescriptor,
  state: RoutingQuestionnaireState,
): readonly RoutingQuestionOption[] {
  return (question.options ?? []).filter(
    (option) =>
      option.visibility === undefined ||
      matchesRoutingConditionV1(option.visibility, state),
  );
}

export function isRoutingQuestionVisible(
  question: RoutingQuestionDescriptor,
  state: RoutingQuestionnaireState,
): boolean {
  return (
    question.visibility === undefined ||
    matchesRoutingConditionV1(question.visibility, state)
  );
}

export function visibleRoutingQuestions(
  questions: readonly RoutingQuestionDescriptor[],
  state: RoutingQuestionnaireState,
): readonly RoutingQuestionDescriptor[] {
  return questions.filter((question) =>
    isRoutingQuestionVisible(question, state),
  );
}

function sameValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right);
}

export function normalizeRoutingQuestionnaireState(
  questions: readonly RoutingQuestionDescriptor[],
  input: RoutingQuestionnaireState,
): RoutingQuestionnaireState {
  let state = { ...input };
  let changed = true;
  let pass = 0;

  while (changed && pass < questions.length + 2) {
    changed = false;
    pass += 1;
    for (const question of questions) {
      if (!isRoutingQuestionVisible(question, state)) {
        if (question.id in state) {
          const next = { ...state };
          delete next[question.id];
          state = next;
          changed = true;
        }
        continue;
      }

      const options = routingQuestionOptions(question, state);
      if (options.length === 0 || !(question.id in state)) continue;
      const allowed = options.map((option) => option.value);
      const current = state[question.id];
      if (question.kind === "multiple_choice") {
        const selected = Array.isArray(current)
          ? current.filter((value) =>
              allowed.some((candidate) => sameValue(candidate, value)),
            )
          : [];
        if (!Array.isArray(current) || selected.length !== current.length) {
          state = { ...state, [question.id]: selected };
          changed = true;
        }
      } else if (!allowed.some((candidate) => sameValue(candidate, current))) {
        const next = { ...state };
        delete next[question.id];
        state = next;
        changed = true;
      }
    }
  }

  return state;
}

export function setRoutingQuestionAnswer(
  questions: readonly RoutingQuestionDescriptor[],
  input: RoutingQuestionnaireState,
  questionId: string,
  value: unknown,
): RoutingQuestionnaireState {
  const question = questions.find((item) => item.id === questionId);
  if (!question) return input;
  let next: RoutingQuestionnaireState;

  if (question.kind !== "multiple_choice") {
    next = { ...input, [questionId]: value };
  } else {
    const current = Array.isArray(input[questionId])
      ? (input[questionId] as unknown[])
      : [];
    const options = routingQuestionOptions(question, input);
    const selectedOption = options.find((option) =>
      sameValue(option.value, value),
    );
    const alreadySelected = current.some((item) => sameValue(item, value));
    let selected: unknown[];

    if (alreadySelected) {
      selected = current.filter((item) => !sameValue(item, value));
    } else if (selectedOption?.exclusive) {
      selected = [value];
    } else {
      const exclusiveValues = options
        .filter((option) => option.exclusive)
        .map((option) => option.value);
      selected = [
        ...current.filter(
          (item) =>
            !exclusiveValues.some((exclusive) => sameValue(exclusive, item)),
        ),
        value,
      ];
    }
    next = { ...input, [questionId]: selected };
  }

  return normalizeRoutingQuestionnaireState(questions, next);
}

export function isRoutingQuestionAnswered(
  question: RoutingQuestionDescriptor,
  state: RoutingQuestionnaireState,
): boolean {
  const value = state[question.id];
  if (question.kind === "multiple_choice") {
    return Array.isArray(value) && value.length > 0;
  }
  if (question.kind === "text") {
    return typeof value === "string" && value.trim().length > 0;
  }
  if (question.kind === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return value !== undefined && value !== null && value !== "";
}

export function unansweredRequiredRoutingQuestions(
  questions: readonly RoutingQuestionDescriptor[],
  state: RoutingQuestionnaireState,
): readonly RoutingQuestionDescriptor[] {
  return visibleRoutingQuestions(questions, state).filter(
    (question) =>
      question.requirement !== "optional" &&
      !isRoutingQuestionAnswered(question, state),
  );
}
