import { useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "../DynamicRoutingQuestionnaire";
import {
  unansweredRequiredRoutingQuestions,
  type RoutingProfileContentDocument,
  type RoutingQuestionnaireState,
  type RoutingRuleSetV1,
} from "../routing";
import { evaluateInfectiousRoutingRuleSet } from "../routing/infectious";

export default function InfectiousVersionPreview(props: {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
  initialState?: RoutingQuestionnaireState;
}) {
  const [state, setState] = useState<RoutingQuestionnaireState>(
    props.initialState ?? {},
  );
  const missing = unansweredRequiredRoutingQuestions(
    props.document.questions,
    state,
  );
  const result = useMemo(
    () =>
      missing.length === 0
        ? evaluateInfectiousRoutingRuleSet(props.ruleSet, state)
        : null,
    [missing.length, props.ruleSet, state],
  );

  return (
    <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Предпросмотр выбранной версии
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Ответы существуют только в браузере и никуда не сохраняются.
        </p>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <DynamicRoutingQuestionnaire
          questions={props.document.questions}
          state={state}
          onChange={setState}
        />
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h4 className="font-semibold">Результат</h4>
          {!result ? (
            <p className="mt-2 text-sm text-amber-800">
              {missing.length > 0
                ? `Заполните: ${missing.map((question) => question.label).join(", ")}.`
                : "Для выбранных ответов не найдено подходящей ветки."}
            </p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="font-semibold">{result.title}</div>
                <div className="mt-1 text-neutral-600">{result.urgency}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="font-semibold">{result.target.name}</div>
                <div className="mt-1 text-xs text-neutral-700">{result.target.role}</div>
                <div className="mt-2 text-xs font-medium">{result.target.address}</div>
              </div>
              {result.warning ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {result.warning}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
