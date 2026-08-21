import { useMemo, useState } from "react";
import DynamicRoutingQuestionnaire from "../DynamicRoutingQuestionnaire.js";
import {
  analyzeRoutingRuleSetAgainstQuestionnaire,
  evaluateRoutingRuleSetV1,
  prepareRoutingEvaluationState,
  unansweredRequiredRoutingQuestions,
  type RoutingConditionV1,
  type RoutingProfileContentDocument,
  type RoutingQuestionDescriptor,
  type RoutingQuestionKind,
  type RoutingQuestionOption,
  type RoutingQuestionRequirement,
  type RoutingQuestionnaireState,
  type RoutingRuleSetV1,
  type RoutingTemplateV1,
} from "../routing/index.js";
import { InfectiousConditionEditor } from "./InfectiousRuleBuilder.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function conditionUsesField(
  condition: RoutingConditionV1,
  field: string,
): boolean {
  if (condition.op === "all" || condition.op === "any") {
    return condition.conditions.some((child) =>
      conditionUsesField(child, field),
    );
  }
  if (condition.op === "not") {
    return conditionUsesField(condition.condition, field);
  }
  return condition.field === field;
}

function renameConditionField(
  condition: RoutingConditionV1,
  previous: string,
  next: string,
): RoutingConditionV1 {
  if (condition.op === "all" || condition.op === "any") {
    return {
      ...condition,
      conditions: condition.conditions.map((child) =>
        renameConditionField(child, previous, next),
      ),
    };
  }
  if (condition.op === "not") {
    return {
      ...condition,
      condition: renameConditionField(condition.condition, previous, next),
    };
  }
  return condition.field === previous
    ? { ...condition, field: next }
    : condition;
}

function renameConditionValue(
  condition: RoutingConditionV1,
  field: string,
  previous: unknown,
  next: string,
): RoutingConditionV1 {
  if (condition.op === "all" || condition.op === "any") {
    return {
      ...condition,
      conditions: condition.conditions.map((child) =>
        renameConditionValue(child, field, previous, next),
      ),
    };
  }
  if (condition.op === "not") {
    return {
      ...condition,
      condition: renameConditionValue(
        condition.condition,
        field,
        previous,
        next,
      ),
    };
  }
  if (condition.field !== field) return condition;
  if (condition.op === "in") {
    return {
      ...condition,
      values: condition.values.map((value) =>
        Object.is(value, previous) ? next : value,
      ),
    };
  }
  if (
    condition.op === "eq" ||
    condition.op === "neq" ||
    condition.op === "includes"
  ) {
    return Object.is(condition.value, previous)
      ? { ...condition, value: next }
      : condition;
  }
  return condition;
}

function renameTemplateField(
  template: RoutingTemplateV1,
  previous: string,
  next: string,
): RoutingTemplateV1 {
  if (
    template === null ||
    typeof template === "string" ||
    typeof template === "number" ||
    typeof template === "boolean"
  ) {
    return template;
  }
  if (Array.isArray(template)) {
    return template.map((item) => renameTemplateField(item, previous, next));
  }
  const record = template as Record<string, unknown>;
  if (typeof record.$field === "string") {
    return record.$field === previous
      ? ({ ...record, $field: next } as RoutingTemplateV1)
      : template;
  }
  if (isRecord(record.$joinCatalog) && typeof record.$joinCatalog.field === "string") {
    return {
      ...record,
      $joinCatalog: {
        ...record.$joinCatalog,
        field:
          record.$joinCatalog.field === previous
            ? next
            : record.$joinCatalog.field,
      },
    } as RoutingTemplateV1;
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      renameTemplateField(value as RoutingTemplateV1, previous, next),
    ]),
  );
}

function renameTemplateOptionValue(
  template: RoutingTemplateV1,
  field: string,
  previous: unknown,
  next: string,
): RoutingTemplateV1 {
  if (
    template === null ||
    typeof template === "string" ||
    typeof template === "number" ||
    typeof template === "boolean"
  ) {
    return template;
  }
  if (Array.isArray(template)) {
    return template.map((item) =>
      renameTemplateOptionValue(item, field, previous, next),
    );
  }
  const record = template as Record<string, unknown>;
  if (isRecord(record.$joinCatalog) && typeof record.$joinCatalog.field === "string") {
    const directive = record.$joinCatalog;
    return directive.field === field
      ? {
          ...record,
          $joinCatalog: {
            ...directive,
            exclude: Array.isArray(directive.exclude)
              ? directive.exclude.map((value) =>
                  Object.is(value, previous) ? next : value,
                )
              : undefined,
          },
        } as RoutingTemplateV1
      : template;
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      renameTemplateOptionValue(
        value as RoutingTemplateV1,
        field,
        previous,
        next,
      ),
    ]),
  );
}

function templateUsesField(
  template: RoutingTemplateV1,
  field: string,
): boolean {
  if (
    template === null ||
    typeof template === "string" ||
    typeof template === "number" ||
    typeof template === "boolean"
  ) {
    return false;
  }
  if (Array.isArray(template)) {
    return template.some((item) => templateUsesField(item, field));
  }
  const record = template as Record<string, unknown>;
  if (typeof record.$field === "string") return record.$field === field;
  if (isRecord(record.$joinCatalog)) {
    return record.$joinCatalog.field === field;
  }
  return Object.values(record).some((value) =>
    templateUsesField(value as RoutingTemplateV1, field),
  );
}

function renameQuestionEverywhere(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  previous: string,
  next: string,
): {
  questions: readonly RoutingQuestionDescriptor[];
  ruleSet: RoutingRuleSetV1;
} {
  return {
    questions: questions.map((question) => ({
      ...question,
      id: question.id === previous ? next : question.id,
      visibility: question.visibility
        ? renameConditionField(question.visibility, previous, next)
        : undefined,
      options: question.options?.map((option) => ({
        ...option,
        visibility: option.visibility
          ? renameConditionField(option.visibility, previous, next)
          : undefined,
      })),
    })),
    ruleSet: {
      ...ruleSet,
      catalogs: Object.fromEntries(
        Object.entries(ruleSet.catalogs).map(([catalogId, catalog]) => [
          catalogId,
          Object.fromEntries(
            Object.entries(catalog).map(([key, value]) => [
              key,
              renameTemplateField(value, previous, next),
            ]),
          ),
        ]),
      ),
      rules: ruleSet.rules.map((rule) => ({
        ...rule,
        when: renameConditionField(rule.when, previous, next),
        result: renameTemplateField(rule.result, previous, next),
      })),
    },
  };
}

function renameOptionEverywhere(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  questionId: string,
  previous: unknown,
  next: string,
): {
  questions: readonly RoutingQuestionDescriptor[];
  ruleSet: RoutingRuleSetV1;
} {
  const catalogs = Object.fromEntries(
    Object.entries(ruleSet.catalogs).map(([catalogId, catalog]) => {
      const directCatalogs: Record<string, string[]> = {
        infectionGroup: ["groupLabels"],
        lifeThreats: ["lifeThreatLabels"],
        admissionCriteria: ["admissionGeneral", "admissionRespiratory"],
      };
      const direct = directCatalogs[questionId]?.includes(catalogId);
      const territoryCatalog =
        questionId === "territory" && catalogId === "territorialTargets";
      const seasonalCatalog = [
        "seasonalPrimary",
        "seasonalReferences",
        "seasonalTransport",
      ].includes(catalogId);
      return [
        catalogId,
        Object.fromEntries(
          Object.entries(catalog).map(([key, value]) => {
            let nextKey = key;
            if ((direct || territoryCatalog) && key === String(previous)) {
              nextKey = next;
            } else if (seasonalCatalog) {
              const [group, territory] = key.split("|");
              if (questionId === "infectionGroup" && group === String(previous)) {
                nextKey = `${next}|${territory}`;
              }
              if (questionId === "territory" && territory === String(previous)) {
                nextKey = `${group}|${next}`;
              }
            }
            return [
              nextKey,
              renameTemplateOptionValue(
                value,
                questionId,
                previous,
                next,
              ),
            ];
          }),
        ),
      ];
    }),
  );
  return {
    questions: questions.map((question) => ({
      ...question,
      visibility: question.visibility
        ? renameConditionValue(
            question.visibility,
            questionId,
            previous,
            next,
          )
        : undefined,
      options: question.options?.map((option) => ({
        ...option,
        value:
          question.id === questionId && Object.is(option.value, previous)
            ? next
            : option.value,
        visibility: option.visibility
          ? renameConditionValue(
              option.visibility,
              questionId,
              previous,
              next,
            )
          : undefined,
      })),
    })),
    ruleSet: {
      ...ruleSet,
      catalogs,
      rules: ruleSet.rules.map((rule) => ({
        ...rule,
        when: renameConditionValue(
          rule.when,
          questionId,
          previous,
          next,
        ),
        result: renameTemplateOptionValue(
          rule.result,
          questionId,
          previous,
          next,
        ),
      })),
    },
  };
}

function updateOptionLabelCatalogs(
  ruleSet: RoutingRuleSetV1,
  questionId: string,
  value: unknown,
  label: string,
): RoutingRuleSetV1 {
  const catalogIds: Record<string, string[]> = {
    infectionGroup: ["groupLabels"],
    lifeThreats: ["lifeThreatLabels"],
    admissionCriteria: ["admissionGeneral", "admissionRespiratory"],
  };
  const targetCatalogs = new Set(catalogIds[questionId] ?? []);
  if (targetCatalogs.size === 0) return ruleSet;
  return {
    ...ruleSet,
    catalogs: Object.fromEntries(
      Object.entries(ruleSet.catalogs).map(([catalogId, catalog]) => [
        catalogId,
        targetCatalogs.has(catalogId) && String(value) in catalog
          ? { ...catalog, [String(value)]: label }
          : catalog,
      ]),
    ),
  };
}

function addOptionToLabelCatalogs(
  ruleSet: RoutingRuleSetV1,
  questionId: string,
  value: string,
  label: string,
): RoutingRuleSetV1 {
  const catalogIds: Record<string, string[]> = {
    infectionGroup: ["groupLabels"],
    lifeThreats: ["lifeThreatLabels"],
    admissionCriteria: ["admissionGeneral", "admissionRespiratory"],
  };
  const targetCatalogs = new Set(catalogIds[questionId] ?? []);
  if (targetCatalogs.size === 0) return ruleSet;
  return {
    ...ruleSet,
    catalogs: Object.fromEntries(
      Object.entries(ruleSet.catalogs).map(([catalogId, catalog]) => [
        catalogId,
        targetCatalogs.has(catalogId)
          ? { ...catalog, [value]: label }
          : catalog,
      ]),
    ),
  };
}

function uniqueQuestionId(
  questions: readonly RoutingQuestionDescriptor[],
  base: string,
): string {
  const ids = new Set(questions.map((question) => question.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function uniqueOptionValue(
  options: readonly RoutingQuestionOption[],
  base: string,
): string {
  const values = new Set(options.map((option) => String(option.value)));
  if (!values.has(base)) return base;
  let suffix = 2;
  while (values.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function initialCondition(
  previousQuestions: readonly RoutingQuestionDescriptor[],
): RoutingConditionV1 | undefined {
  const question = previousQuestions.at(-1);
  if (!question) return undefined;
  const option = question.options?.[0];
  if (question.kind === "multiple_choice") {
    return option
      ? { op: "includes", field: question.id, value: option.value }
      : { op: "non_empty", field: question.id };
  }
  return option
    ? { op: "eq", field: question.id, value: option.value }
    : { op: "present", field: question.id };
}

function questionsWithReferenceTo(
  questions: readonly RoutingQuestionDescriptor[],
  ruleSet: RoutingRuleSetV1,
  questionId: string,
): string[] {
  const references: string[] = [];
  questions.forEach((question) => {
    if (
      question.id !== questionId &&
      question.visibility &&
      conditionUsesField(question.visibility, questionId)
    ) {
      references.push(`показ вопроса «${question.label}»`);
    }
    question.options?.forEach((option) => {
      if (
        option.visibility &&
        conditionUsesField(option.visibility, questionId)
      ) {
        references.push(`вариант «${option.label}»`);
      }
    });
  });
  ruleSet.rules.forEach((rule) => {
    if (conditionUsesField(rule.when, questionId)) {
      references.push(`ветка ${rule.id}`);
    }
    if (templateUsesField(rule.result, questionId)) {
      references.push(`результат ветки ${rule.id}`);
    }
  });
  Object.entries(ruleSet.catalogs).forEach(([catalogId, catalog]) => {
    if (Object.values(catalog).some((value) => templateUsesField(value, questionId))) {
      references.push(`каталог ${catalogId}`);
    }
  });
  return references;
}

const KIND_LABELS: Record<RoutingQuestionKind, string> = {
  boolean: "Да / нет",
  single_choice: "Один вариант",
  multiple_choice: "Несколько вариантов",
  number: "Число",
  text: "Текст",
};

const EDITABLE_KINDS: readonly RoutingQuestionKind[] = [
  "boolean",
  "single_choice",
  "multiple_choice",
];

const REQUIREMENT_LABELS: Record<RoutingQuestionRequirement, string> = {
  always: "Обязателен",
  conditional: "Обязателен при показе",
  optional: "Необязателен",
};

function ResultSummary(props: {
  ruleSet: RoutingRuleSetV1;
  state: RoutingQuestionnaireState;
  missing: readonly RoutingQuestionDescriptor[];
}) {
  const evaluation = useMemo(() => {
    if (props.missing.length > 0) return null;
    try {
      return evaluateRoutingRuleSetV1(
        props.ruleSet,
        prepareRoutingEvaluationState(props.ruleSet.profileId, props.state),
      );
    } catch (reason) {
      return {
        error:
          reason instanceof Error
            ? reason.message
            : "Не удалось рассчитать маршрут.",
      };
    }
  }, [props.missing.length, props.ruleSet, props.state]);

  if (props.missing.length > 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Для расчёта заполните: {props.missing.map((item) => item.label).join(", ")}.
      </div>
    );
  }
  if (evaluation && "error" in evaluation) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {evaluation.error}
      </div>
    );
  }
  if (!evaluation) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Ни одна маршрутная ветка не подошла к выбранным ответам.
      </div>
    );
  }
  const result =
    typeof evaluation.result === "object" &&
    evaluation.result !== null &&
    !Array.isArray(evaluation.result)
      ? (evaluation.result as Record<string, unknown>)
      : {};
  const target =
    typeof result.target === "object" && result.target !== null
      ? (result.target as Record<string, unknown>)
      : {};
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Сработала ветка {evaluation.ruleId}
      </div>
      <div className="mt-1 font-bold">
        {typeof result.title === "string" ? result.title : "Результат без названия"}
      </div>
      {typeof target.name === "string" ? (
        <div className="mt-2">
          {target.name}
          {typeof target.address === "string" ? ` — ${target.address}` : ""}
        </div>
      ) : null}
    </div>
  );
}

export default function InfectiousQuestionnaireBuilder(props: {
  questions: RoutingProfileContentDocument["questions"];
  ruleSet: RoutingRuleSetV1;
  onChange: (
    questions: RoutingProfileContentDocument["questions"],
    ruleSet: RoutingRuleSetV1,
  ) => void;
}) {
  const [previewState, setPreviewState] = useState<RoutingQuestionnaireState>({});
  const questions = props.questions;

  function replaceQuestion(index: number, next: RoutingQuestionDescriptor) {
    props.onChange(
      questions.map((question, questionIndex) =>
        questionIndex === index ? next : question,
      ),
      props.ruleSet,
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex]!,
      reordered[index]!,
    ];
    props.onChange(reordered, props.ruleSet);
  }

  function addQuestion() {
    props.onChange(
      [
        ...questions,
        {
          id: uniqueQuestionId(questions, "new_question"),
          label: "Новый вопрос",
          kind: "single_choice",
          requirement: "optional",
          options: [
            { value: "yes", label: "Да" },
            { value: "no", label: "Нет" },
          ],
        },
      ],
      props.ruleSet,
    );
  }

  const missing = unansweredRequiredRoutingQuestions(questions, previewState);
  const analysis = useMemo(
    () => analyzeRoutingRuleSetAgainstQuestionnaire(
      questions,
      props.ruleSet,
      props.ruleSet.profileId === "bsk" || props.ruleSet.profileId === "oncology" || props.ruleSet.profileId === "obgyn"
        ? 2_000
        : 20_000,
    ),
    [props.ruleSet, questions],
  );

  return (
    <section className="rounded-2xl border-2 border-violet-200 bg-violet-50/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Конструктор опросника
          </div>
          <h3 className="mt-1 text-lg font-bold">
            Вопросы, ответы и переходы ({questions.length})
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Порядок карточек задаёт порядок опроса. Условие показа реализует переход:
            например, вопрос появляется только после конкретного ответа. Идентификатор
            вопроса используется в маршрутных правилах.
          </p>
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-medium text-white"
        >
          + Добавить вопрос
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {questions.map((question, index) => {
          const previousQuestions = questions.slice(0, index);
          const references = questionsWithReferenceTo(
            questions,
            props.ruleSet,
            question.id,
          );
          const choiceQuestion =
            question.kind === "boolean" ||
            question.kind === "single_choice" ||
            question.kind === "multiple_choice";
          return (
            <details
              key={`${question.id}-${index}`}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <summary className="cursor-pointer">
                <span className="font-semibold">
                  {index + 1}. {question.label}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {question.id} · {KIND_LABELS[question.kind]} · {REQUIREMENT_LABELS[question.requirement]}
                  {question.visibility ? " · показывается по условию" : ""}
                </span>
              </summary>

              <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-neutral-600">
                    Идентификатор поля
                    <input
                      value={question.id}
                      onChange={(event) => {
                        const renamed = renameQuestionEverywhere(
                          questions,
                          props.ruleSet,
                          question.id,
                          event.currentTarget.value,
                        );
                        props.onChange(renamed.questions, renamed.ruleSet);
                      }}
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                    />
                  </label>
                  <label className="text-xs text-neutral-600">
                    Тип ответа
                    <select
                      value={question.kind}
                      onChange={(event) => {
                        const kind = event.currentTarget.value as RoutingQuestionKind;
                        replaceQuestion(index, {
                          ...question,
                          kind,
                          options:
                            kind === "text" || kind === "number"
                              ? undefined
                              : kind === "boolean"
                                ? [
                                    { value: true, label: "Да" },
                                    { value: false, label: "Нет" },
                                  ]
                                : question.options?.length
                                  ? question.options
                                  : [
                                      { value: "yes", label: "Да" },
                                      { value: "no", label: "Нет" },
                                    ],
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      {!EDITABLE_KINDS.includes(question.kind) ? (
                        <option value={question.kind}>
                          {KIND_LABELS[question.kind]} — нужно заменить перед публикацией
                        </option>
                      ) : null}
                      {EDITABLE_KINDS.map((value) => (
                        <option key={value} value={value}>{KIND_LABELS[value]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {!EDITABLE_KINDS.includes(question.kind) ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    Этот тип пока не имеет достаточных ограничений и операторов
                    для безопасной маршрутизации. Замените его на «Да / нет»,
                    «Один вариант» или «Несколько вариантов».
                  </div>
                ) : null}

                <label className="block text-xs text-neutral-600">
                  Текст вопроса
                  <input
                    value={question.label}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        label: event.currentTarget.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
                <label className="block text-xs text-neutral-600">
                  Пояснение врачу
                  <textarea
                    value={question.helpText ?? ""}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        helpText: event.currentTarget.value || undefined,
                      })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
                <label className="block text-xs text-neutral-600 sm:max-w-sm">
                  Обязательность
                  <select
                    value={question.requirement}
                    onChange={(event) =>
                      replaceQuestion(index, {
                        ...question,
                        requirement: event.currentTarget.value as RoutingQuestionRequirement,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  >
                    {Object.entries(REQUIREMENT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">Условие показа вопроса</div>
                      <div className="text-xs text-neutral-600">
                        Без условия вопрос показывается всегда. Можно использовать только ответы выше по порядку.
                      </div>
                    </div>
                    {question.visibility ? (
                      <button
                        type="button"
                        onClick={() => replaceQuestion(index, { ...question, visibility: undefined })}
                        className="text-xs text-red-700 underline"
                      >
                        Удалить условие
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={previousQuestions.length === 0}
                        onClick={() =>
                          replaceQuestion(index, {
                            ...question,
                            visibility: initialCondition(previousQuestions),
                          })
                        }
                        className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-blue-800 disabled:opacity-40"
                      >
                        + Добавить условие
                      </button>
                    )}
                  </div>
                  {question.visibility ? (
                    <div className="mt-3">
                      <InfectiousConditionEditor
                        condition={question.visibility}
                        ruleSet={props.ruleSet}
                        questions={previousQuestions}
                        onChange={(visibility) =>
                          replaceQuestion(index, { ...question, visibility })
                        }
                      />
                    </div>
                  ) : null}
                </div>

                {choiceQuestion ? (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        Варианты ответа ({question.options?.length ?? 0})
                      </div>
                      {question.kind !== "boolean" ? (
                        <button
                          type="button"
                          onClick={() => {
                            const options = question.options ?? [];
                            const value = uniqueOptionValue(options, "new_option");
                            props.onChange(
                              questions.map((currentQuestion, questionIndex) =>
                                questionIndex === index
                                  ? {
                                      ...question,
                                      options: [
                                        ...options,
                                        { value, label: "Новый вариант" },
                                      ],
                                    }
                                  : currentQuestion,
                              ),
                              addOptionToLabelCatalogs(
                                props.ruleSet,
                                question.id,
                                value,
                                "Новый вариант",
                              ),
                            );
                          }}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                        >
                          + Добавить вариант
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={`${String(option.value)}-${optionIndex}`} className="rounded-xl border border-neutral-200 p-3">
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                            <label className="text-xs text-neutral-600">
                              Значение для логики
                              <input
                                value={String(option.value)}
                                readOnly={question.kind === "boolean"}
                                onChange={(event) => {
                                  const renamed = renameOptionEverywhere(
                                    questions,
                                    props.ruleSet,
                                    question.id,
                                    option.value,
                                    event.currentTarget.value,
                                  );
                                  props.onChange(renamed.questions, renamed.ruleSet);
                                }}
                                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900 read-only:bg-neutral-100"
                              />
                            </label>
                            <label className="text-xs text-neutral-600">
                              Подпись для врача
                              <input
                                value={option.label}
                                onChange={(event) => {
                                  const nextQuestions = questions.map((currentQuestion, questionIndex) =>
                                    questionIndex === index
                                      ? {
                                          ...question,
                                          options: question.options?.map((item, itemIndex) =>
                                            itemIndex === optionIndex
                                              ? { ...item, label: event.currentTarget.value }
                                              : item,
                                          ),
                                        }
                                      : currentQuestion,
                                  );
                                  props.onChange(
                                    nextQuestions,
                                    updateOptionLabelCatalogs(
                                      props.ruleSet,
                                      question.id,
                                      option.value,
                                      event.currentTarget.value,
                                    ),
                                  );
                                }}
                                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={question.kind === "boolean" || (question.options?.length ?? 0) <= 1}
                              onClick={() =>
                                replaceQuestion(index, {
                                  ...question,
                                  options: question.options?.filter((_, itemIndex) => itemIndex !== optionIndex),
                                })
                              }
                              className="self-end px-2 py-2 text-xs text-red-700 underline disabled:opacity-40"
                            >
                              Удалить
                            </button>
                          </div>
                          {question.kind === "multiple_choice" ? (
                            <label className="mt-2 flex gap-2 text-xs text-neutral-700">
                              <input
                                type="checkbox"
                                checked={option.exclusive ?? false}
                                onChange={(event) =>
                                  replaceQuestion(index, {
                                    ...question,
                                    options: question.options?.map((item, itemIndex) =>
                                      itemIndex === optionIndex
                                        ? { ...item, exclusive: event.currentTarget.checked || undefined }
                                        : item,
                                    ),
                                  })
                                }
                              />
                              Исключающий вариант: при выборе снимает остальные отметки
                            </label>
                          ) : null}
                          <div className="mt-2 rounded-lg bg-neutral-50 p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-medium text-neutral-700">
                                Условие показа варианта
                              </span>
                              {option.visibility ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    replaceQuestion(index, {
                                      ...question,
                                      options: question.options?.map((item, itemIndex) =>
                                        itemIndex === optionIndex
                                          ? { ...item, visibility: undefined }
                                          : item,
                                      ),
                                    })
                                  }
                                  className="text-xs text-red-700 underline"
                                >
                                  Удалить условие
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={previousQuestions.length === 0}
                                  onClick={() =>
                                    replaceQuestion(index, {
                                      ...question,
                                      options: question.options?.map((item, itemIndex) =>
                                        itemIndex === optionIndex
                                          ? { ...item, visibility: initialCondition(previousQuestions) }
                                          : item,
                                      ),
                                    })
                                  }
                                  className="text-xs text-blue-700 underline disabled:opacity-40"
                                >
                                  + Ограничить показ
                                </button>
                              )}
                            </div>
                            {option.visibility ? (
                              <div className="mt-2">
                                <InfectiousConditionEditor
                                  condition={option.visibility}
                                  ruleSet={props.ruleSet}
                                  questions={previousQuestions}
                                  onChange={(visibility) =>
                                    replaceQuestion(index, {
                                      ...question,
                                      options: question.options?.map((item, itemIndex) =>
                                        itemIndex === optionIndex
                                          ? { ...item, visibility }
                                          : item,
                                      ),
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                  <button type="button" onClick={() => moveQuestion(index, -1)} disabled={index === 0} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Выше</button>
                  <button type="button" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Ниже</button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = uniqueQuestionId(questions, `${question.id}_copy`);
                      props.onChange(
                        [...questions.slice(0, index + 1), { ...question, id }, ...questions.slice(index + 1)],
                        props.ruleSet,
                      );
                    }}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
                  >
                    Дублировать
                  </button>
                  <button
                    type="button"
                    disabled={questions.length <= 1 || references.length > 0}
                    title={references.length > 0 ? `Используется: ${references.join(", ")}` : undefined}
                    onClick={() =>
                      props.onChange(
                        questions.filter((_, questionIndex) => questionIndex !== index),
                        props.ruleSet,
                      )
                    }
                    className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
                  >
                    Удалить вопрос
                  </button>
                </div>
                {references.length > 0 ? (
                  <div className="text-xs text-amber-800">
                    Удаление заблокировано: вопрос используется в {references.slice(0, 4).join(", ")}.
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>

      <details className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
        <summary className="cursor-pointer font-semibold">
          Контрольная проверка сценариев · {analysis.scenarioCount} сочетаний
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          {analysis.issues.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              Во всех проверенных контрольных сценариях есть результат, и каждая ветка хотя бы один раз становится итоговой.
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <div className="font-medium">Обнаружено замечаний: {analysis.issues.length}</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                {analysis.issues.slice(0, 20).map((issue, index) => (
                  <li key={`${issue.kind}-${issue.ruleId ?? index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-neutral-600">
            Пересечение условий найдено в {analysis.overlapScenarioCount} сочетаниях.
            До публикации каждое пересечение нужно устранить. Во время работы
            черновика итог по-прежнему выбирается по приоритету.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(analysis.winnerCounts).map(([ruleId, count]) => (
              <div key={ruleId} className="rounded-lg bg-white px-3 py-2 text-xs">
                <span className="font-mono">{ruleId}</span>
                <span className="float-right font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold">
          Проверить полный опросник и переходы
        </summary>
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <DynamicRoutingQuestionnaire
            questions={questions}
            state={previewState}
            onChange={setPreviewState}
            compact
          />
          <div className="lg:sticky lg:top-4">
            <div className="mb-2 text-sm font-semibold">Результат тестового прохождения</div>
            <ResultSummary
              ruleSet={props.ruleSet}
              state={previewState}
              missing={missing}
            />
            <button
              type="button"
              onClick={() => setPreviewState({})}
              className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
            >
              Сбросить ответы
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
