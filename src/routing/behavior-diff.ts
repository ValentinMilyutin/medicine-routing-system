import type { RoutingQuestionDescriptor } from "./content-schema.js";
import { describeRoutingControlState } from "./control-cases.js";
import { buildRoutingQuestionnaireScenarioMatrix } from "./questionnaire-analysis.js";
import {
  normalizeRoutingQuestionnaireState,
  unansweredRequiredRoutingQuestions,
  type RoutingQuestionnaireState,
} from "./questionnaire-runtime.js";
import {
  evaluateRoutingRuleSetV1,
  type RoutingRuleSetV1,
} from "./rules-v1.js";
import { prepareRoutingEvaluationState } from "./evaluation-state.js";

export type RoutingBehaviorOutcome =
  | { kind: "incomplete"; label: string }
  | { kind: "gap"; label: string }
  | {
      kind: "route";
      label: string;
      ruleId: string;
      title: string;
      targetName: string;
      targetAddress: string;
      nextTargetName: string;
      resultSignature: string;
    };

export type RoutingBehaviorChange = {
  id: string;
  kind: "route_changed" | "branch_changed" | "new_gap" | "resolved_gap";
  state: RoutingQuestionnaireState;
  stateSummary: string;
  before: RoutingBehaviorOutcome;
  after: RoutingBehaviorOutcome;
};

export type RoutingBehaviorDiff = {
  scenarioCount: number;
  complete: boolean;
  changedCount: number;
  routeChangedCount: number;
  branchChangedCount: number;
  newGapCount: number;
  resolvedGapCount: number;
  changes: readonly RoutingBehaviorChange[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectAndNormalize(
  questions: readonly RoutingQuestionDescriptor[],
  state: RoutingQuestionnaireState,
): RoutingQuestionnaireState {
  const ids = new Set(questions.map((question) => question.id));
  return normalizeRoutingQuestionnaireState(
    questions,
    Object.fromEntries(
      Object.entries(state).filter(([field]) => ids.has(field)),
    ),
  );
}

function outcome(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  state: RoutingQuestionnaireState,
): RoutingBehaviorOutcome {
  const missing = unansweredRequiredRoutingQuestions(questions, state);
  if (missing.length > 0) {
    return {
      kind: "incomplete",
      label: `Нужно заполнить: ${missing.map((item) => item.label).join(", ")}`,
    };
  }
  const evaluation = evaluateRoutingRuleSetV1(
    ruleSet,
    prepareRoutingEvaluationState(ruleSet.profileId, state),
  );
  if (!evaluation) return { kind: "gap", label: "Маршрут не найден" };
  const result: Record<string, unknown> = isRecord(evaluation.result)
    ? (evaluation.result as Record<string, unknown>)
    : {};
  const targetValue = ruleSet.profileId === "oncology"
    ? result.locationPrimaryHospital
    : result.target;
  const target = isRecord(targetValue) ? targetValue : {};
  const nextTarget = isRecord(result.nextTarget) ? result.nextTarget : {};
  const title = typeof result.title === "string"
    ? result.title
    : typeof result.routeTitle === "string"
      ? result.routeTitle
      : "Без названия";
  const targetName =
    typeof target.name === "string" ? target.name : "Пункт не определён";
  const targetAddress =
    typeof target.address === "string" ? target.address : "Адрес не определён";
  const nextTargetName =
    typeof nextTarget.name === "string" ? nextTarget.name : "";
  return {
    kind: "route",
    label: `${title} → ${targetName}`,
    ruleId: evaluation.ruleId,
    title,
    targetName,
    targetAddress,
    nextTargetName,
    resultSignature: canonical(evaluation.result),
  };
}

function samePublicOutcome(
  left: RoutingBehaviorOutcome,
  right: RoutingBehaviorOutcome,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind !== "route" || right.kind !== "route") {
    return left.label === right.label;
  }
  return (
    left.title === right.title &&
    left.targetName === right.targetName &&
    left.targetAddress === right.targetAddress &&
    left.nextTargetName === right.nextTargetName &&
    left.resultSignature === right.resultSignature
  );
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function compareRoutingBehavior(
  currentQuestions: readonly RoutingQuestionDescriptor[],
  currentRuleSet: RoutingRuleSetV1,
  candidateQuestions: readonly RoutingQuestionDescriptor[],
  candidateRuleSet: RoutingRuleSetV1,
  maximum = 20_000,
): RoutingBehaviorDiff {
  const currentMatrix = buildRoutingQuestionnaireScenarioMatrix(
    currentQuestions,
    Math.ceil(maximum / 2),
  );
  const candidateMatrix = buildRoutingQuestionnaireScenarioMatrix(
    candidateQuestions,
    Math.ceil(maximum / 2),
  );
  const pairs = new Map<
    string,
    { current: RoutingQuestionnaireState; candidate: RoutingQuestionnaireState }
  >();
  for (const source of [...currentMatrix.states, ...candidateMatrix.states]) {
    const current = projectAndNormalize(currentQuestions, source);
    const candidate = projectAndNormalize(candidateQuestions, source);
    const key = canonical({ current, candidate });
    if (!pairs.has(key)) pairs.set(key, { current, candidate });
  }

  const mergedQuestions = [
    ...candidateQuestions,
    ...currentQuestions.filter(
      (question) =>
        !candidateQuestions.some((candidate) => candidate.id === question.id),
    ),
  ];
  const changes: RoutingBehaviorChange[] = [];
  let routeChangedCount = 0;
  let branchChangedCount = 0;
  let newGapCount = 0;
  let resolvedGapCount = 0;

  [...pairs.values()].forEach((pair, index) => {
    const before = outcome(currentQuestions, currentRuleSet, pair.current);
    const after = outcome(candidateQuestions, candidateRuleSet, pair.candidate);
    const publicSame = samePublicOutcome(before, after);
    const branchSame =
      before.kind !== "route" ||
      after.kind !== "route" ||
      before.ruleId === after.ruleId;
    if (publicSame && branchSame) return;

    let kind: RoutingBehaviorChange["kind"] = "route_changed";
    if (
      (after.kind === "gap" || after.kind === "incomplete") &&
      before.kind === "route"
    ) {
      kind = "new_gap";
      newGapCount += 1;
    } else if (
      (before.kind === "gap" || before.kind === "incomplete") &&
      after.kind === "route"
    ) {
      kind = "resolved_gap";
      resolvedGapCount += 1;
    } else if (publicSame && !branchSame) {
      kind = "branch_changed";
      branchChangedCount += 1;
    } else {
      routeChangedCount += 1;
    }
    const state =
      Object.keys(pair.candidate).length > 0 ? pair.candidate : pair.current;
    changes.push({
      id: `behavior:${index}`,
      kind,
      state,
      stateSummary:
        describeRoutingControlState(mergedQuestions, state) ||
        "Начальное состояние опросника",
      before,
      after,
    });
  });

  return {
    scenarioCount: pairs.size,
    complete: currentMatrix.complete && candidateMatrix.complete,
    changedCount: changes.length,
    routeChangedCount,
    branchChangedCount,
    newGapCount,
    resolvedGapCount,
    changes,
  };
}
