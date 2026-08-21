import { useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "../DynamicRoutingQuestionnaire.js";
import {
  evaluateRoutingRuleSetV1,
  prepareRoutingEvaluationState,
  unansweredRequiredRoutingQuestions,
  type RoutingProfileContentDocument,
  type RoutingQuestionnaireState,
  type RoutingRuleSetV1,
} from "../routing/index.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function RoutingVersionPreview(props: {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
  initialState?: RoutingQuestionnaireState;
}) {
  const [state, setState] = useState<RoutingQuestionnaireState>(
    props.initialState ?? {},
  );
  const missing = unansweredRequiredRoutingQuestions(props.document.questions, state);
  const evaluation = useMemo(() => {
    if (missing.length > 0) return null;
    try {
      return evaluateRoutingRuleSetV1(
        props.ruleSet,
        prepareRoutingEvaluationState(props.ruleSet.profileId, state),
      );
    } catch (reason) {
      return { error: reason instanceof Error ? reason.message : "Не удалось рассчитать маршрут." };
    }
  }, [missing.length, props.ruleSet, state]);
  const result: Record<string, unknown> | null = evaluation && !("error" in evaluation) && isRecord(evaluation.result)
    ? evaluation.result as Record<string, unknown>
    : null;
  const targetValue = props.ruleSet.profileId === "oncology"
    ? result?.locationPrimaryHospital
    : result?.target;
  const target = isRecord(targetValue) ? targetValue : null;
  const nextTarget = result && isRecord(result.nextTarget) ? result.nextTarget : null;

  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Предпросмотр версии
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <DynamicRoutingQuestionnaire
          questions={props.document.questions}
          state={state}
          onChange={setState}
          compact
        />
        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          {missing.length > 0 ? (
            <div className="text-sm text-amber-800">
              Заполните: {missing.map((question) => question.label).join(", ")}.
            </div>
          ) : evaluation && "error" in evaluation ? (
            <div className="text-sm text-red-800">{evaluation.error}</div>
          ) : !evaluation || !result ? (
            <div className="text-sm text-amber-800">Ни одна ветка не определяет маршрут.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-xs font-semibold text-emerald-700">
                Сработала ветка {evaluation.ruleId}
              </div>
              <div className="text-lg font-bold">{text(result.title) || text(result.routeTitle) || "Результат без названия"}</div>
              {target ? (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs font-semibold uppercase text-emerald-700">
                    {text(result.targetLabel) || (props.ruleSet.profileId === "oncology" ? "Опорная медицинская организация" : "Куда везти")}
                  </div>
                  <div className="mt-1 font-semibold">{text(target.name)}</div>
                  <div className="mt-1">{text(target.address)}</div>
                </div>
              ) : null}
              {nextTarget ? (
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="text-xs font-semibold uppercase text-blue-700">
                    {text(result.nextTargetLabel) || "Следующий этап"}
                  </div>
                  <div className="mt-1 font-semibold">{text(nextTarget.name)}</div>
                  <div className="mt-1">{text(nextTarget.address)}</div>
                </div>
              ) : null}
              {text(result.urgency) ? <div><b>Срочность:</b> {text(result.urgency)}</div> : null}
              {text(result.transport) ? <div><b>Транспорт:</b> {text(result.transport)}</div> : null}
              {typeof result.target === "string" ? <div><b>Решение:</b> {result.target}</div> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
