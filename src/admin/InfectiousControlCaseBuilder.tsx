import { useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "../DynamicRoutingQuestionnaire.js";
import {
  captureRoutingControlCaseExpectation,
  checkRoutingControlCase,
  describeRoutingControlState,
  normalizeRoutingQuestionnaireState,
  suggestRoutingControlCases,
  unansweredRequiredRoutingQuestions,
  type RoutingControlCase,
  type RoutingProfileContentDocument,
  type RoutingQuestionnaireState,
  type RoutingRuleSetV1,
} from "../routing/index.js";

function uniqueCaseId(cases: readonly RoutingControlCase[]): string {
  const ids = new Set(cases.map((controlCase) => controlCase.id));
  let suffix = cases.length + 1;
  while (ids.has(`control_case_${suffix}`)) suffix += 1;
  return `control_case_${suffix}`;
}

export default function InfectiousControlCaseBuilder(props: {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
  onChange: (controlCases: readonly RoutingControlCase[]) => void;
}) {
  const cases = props.document.controlCases ?? [];
  const [state, setState] = useState<RoutingQuestionnaireState>({});
  const [label, setLabel] = useState("");
  const [notice, setNotice] = useState("");
  const missing = unansweredRequiredRoutingQuestions(
    props.document.questions,
    state,
  );
  const expectation = useMemo(
    () =>
      captureRoutingControlCaseExpectation(
        props.document.questions,
        props.ruleSet,
        state,
      ),
    [props.document.questions, props.ruleSet, state],
  );
  const coveredRules = new Set(
    cases
      .filter(
        (controlCase) =>
          checkRoutingControlCase(
            props.document.questions,
            props.ruleSet,
            controlCase,
          ).ok,
      )
      .map((controlCase) => controlCase.expected.ruleId),
  );

  function generateMissingCases() {
    const suggestions = suggestRoutingControlCases(
      props.document.questions,
      props.ruleSet,
      cases,
    );
    if (suggestions.length === 0) {
      setNotice("Новых достижимых веток для автопримеров не найдено.");
      return;
    }
    props.onChange([...cases, ...suggestions]);
    setNotice(`Добавлено контрольных примеров: ${suggestions.length}.`);
  }

  function addCurrentCase() {
    if (!expectation) return;
    const normalized = normalizeRoutingQuestionnaireState(
      props.document.questions,
      state,
    );
    props.onChange([
      ...cases,
      {
        id: uniqueCaseId(cases),
        label: label.trim() || `Контроль ветки ${expectation.ruleId}`,
        state: normalized as RoutingControlCase["state"],
        expected: expectation,
      },
    ]);
    setLabel("");
    setNotice(`Сохранён пример для ветки ${expectation.ruleId}.`);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
            Контрольные примеры
          </div>
          <h3 className="mt-1 text-lg font-bold">
            Зафиксированное ожидаемое поведение
          </h3>
          <p className="mt-1 max-w-3xl text-xs text-neutral-600">
            Пример хранит ответы, ожидаемую ветку и пункт назначения. Если после
            изменения логики результат расходится с ожидаемым, публикация блокируется.
          </p>
        </div>
        <button
          type="button"
          onClick={generateMissingCases}
          className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-medium text-cyan-900"
        >
          Создать недостающие примеры автоматически
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3 text-sm">
          <div className="text-xs text-neutral-500">Веток</div>
          <div className="mt-1 text-lg font-bold">{props.ruleSet.rules.length}</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-sm">
          <div className="text-xs text-neutral-500">Покрыто примерами</div>
          <div className="mt-1 text-lg font-bold">{coveredRules.size}</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-sm">
          <div className="text-xs text-neutral-500">Всего примеров</div>
          <div className="mt-1 text-lg font-bold">{cases.length}</div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-cyan-200 bg-white p-3 text-xs text-cyan-900">
          {notice}
        </div>
      ) : null}

      <details className="rounded-xl border border-cyan-200 bg-white p-3">
        <summary className="cursor-pointer font-semibold">
          Добавить пример вручную через опросник
        </summary>
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
          <DynamicRoutingQuestionnaire
            questions={props.document.questions}
            state={state}
            onChange={setState}
            compact
          />
          <div className="space-y-3 xl:sticky xl:top-4">
            <label className="block text-xs text-neutral-600">
              Название примера
              <input
                value={label}
                onChange={(event) => setLabel(event.currentTarget.value)}
                placeholder="Например: Батецкий район — амбулаторное наблюдение"
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
              {expectation ? (
                <>
                  <div className="font-semibold">Ветка: {expectation.ruleId}</div>
                  <div className="mt-1">{expectation.title}</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {expectation.targetName} · {expectation.targetAddress}
                  </div>
                </>
              ) : (
                <div className="text-amber-800">
                  {missing.length > 0
                    ? `Заполните: ${missing.map((question) => question.label).join(", ")}.`
                    : "Для выбранных ответов маршрут не найден."}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!expectation}
              onClick={addCurrentCase}
              className="rounded-xl bg-cyan-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Сохранить как контрольный пример
            </button>
          </div>
        </div>
      </details>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Контрольных примеров пока нет. Перед публикацией нужна хотя бы одна
          проходящая проверка для каждой ветки.
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((controlCase, index) => {
            const check = checkRoutingControlCase(
              props.document.questions,
              props.ruleSet,
              controlCase,
            );
            return (
              <details
                key={controlCase.id}
                className={`rounded-xl border bg-white p-3 ${
                  check.ok ? "border-emerald-200" : "border-red-200"
                }`}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{controlCase.label}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {controlCase.expected.ruleId} · {controlCase.expected.targetName}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        check.ok
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {check.ok ? "Совпадает" : "Изменился"}
                    </span>
                  </div>
                </summary>
                <div className="mt-3 space-y-3 text-xs">
                  <label className="block text-neutral-600">
                    Название
                    <input
                      value={controlCase.label}
                      onChange={(event) =>
                        props.onChange(
                          cases.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, label: event.currentTarget.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900"
                    />
                  </label>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    {describeRoutingControlState(
                      props.document.questions,
                      controlCase.state,
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      check.ok
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-red-50 text-red-900"
                    }`}
                  >
                    {check.message}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setState({ ...controlCase.state });
                        setLabel(controlCase.label);
                      }}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5"
                    >
                      Открыть ответы в тестере
                    </button>
                    {!check.ok && check.actual ? (
                      <button
                        type="button"
                        onClick={() =>
                          props.onChange(
                            cases.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, expected: check.actual! }
                                : item,
                            ),
                          )
                        }
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900"
                      >
                        Принять новый результат как ожидаемый
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        props.onChange(
                          cases.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-red-700"
                    >
                      Удалить пример
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

