import { type ReactNode, useMemo, useState } from "react";
import {
  evaluateRoutingRuleSetV1,
  validateInfectiousRuleSetForEditor,
  type RoutingConditionV1,
  type RoutingJsonPrimitive,
  type RoutingQuestionDescriptor,
  type RoutingRuleSetV1,
  type RoutingRuleV1,
  type RoutingTemplateV1,
} from "../routing/index.js";
import {
  INFECTIOUS_ADMISSION_LABELS_V1,
  INFECTIOUS_GROUP_LABELS_V1,
  INFECTIOUS_LIFE_THREAT_LABELS_V1,
  INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  INFECTIOUS_TERRITORIES_V1,
} from "../routing/infectious-rules-v1.js";

type TemplateRecord = Record<string, RoutingTemplateV1>;
type FacilityRecord = {
  name: string;
  role: string;
  address: string;
  url?: string;
};
type FieldSpec = {
  id: string;
  label: string;
  values: readonly { value: RoutingJsonPrimitive; label: string }[];
  multiple?: boolean;
};
type ConditionOperator = RoutingConditionV1["op"];

const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  all: "Все условия (И)",
  any: "Хотя бы одно (ИЛИ)",
  not: "Отрицание (НЕ)",
  eq: "Равно",
  neq: "Не равно",
  present: "Значение заполнено",
  non_empty: "Список не пуст",
  in: "Одно из значений",
  includes: "Список содержит",
};

const LEAF_OPERATORS: ConditionOperator[] = [
  "eq",
  "neq",
  "present",
  "non_empty",
  "in",
  "includes",
];

const RESULT_TEXT_FIELDS = [
  ["title", "Название результата"],
  ["targetLabel", "Подпись основного пункта"],
  ["nextTargetLabel", "Подпись следующего этапа"],
  ["referenceTargetsLabel", "Подпись дополнительных пунктов"],
  ["urgency", "Срочность"],
  ["transport", "Порядок транспортировки"],
  ["warning", "Предупреждение"],
] as const;

function LazyDetails(props: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={props.className}
    >
      <summary className="cursor-pointer">{props.summary}</summary>
      {open ? props.children : null}
    </details>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTemplateRecord(value: RoutingTemplateV1): TemplateRecord {
  return isRecord(value) ? (value as TemplateRecord) : {};
}

function asFacility(value: RoutingTemplateV1 | undefined): FacilityRecord | null {
  if (!isRecord(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.name !== "string" ||
    typeof record.role !== "string" ||
    typeof record.address !== "string"
  ) {
    return null;
  }
  return {
    name: record.name,
    role: record.role,
    address: record.address,
    ...(typeof record.url === "string" ? { url: record.url } : {}),
  };
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function templateSummary(value: RoutingTemplateV1 | undefined): string {
  if (value === undefined) return "Не задано";
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.$catalog === "string") {
      return `Значение из каталога «${record.$catalog}»`;
    }
    if (typeof record.$field === "string") {
      return `Значение поля «${record.$field}»`;
    }
  }
  return "Динамическое значение";
}

function catalogLabels(
  ruleSet: RoutingRuleSetV1,
  catalogId: string,
  fallback: Readonly<Record<string, string>>,
): Record<string, string> {
  const catalog = ruleSet.catalogs[catalogId] ?? {};
  const entries = Object.entries(catalog)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length > 0 ? Object.fromEntries(entries) : { ...fallback };
}

function fieldSpecs(
  ruleSet: RoutingRuleSetV1,
  questions?: readonly RoutingQuestionDescriptor[],
): FieldSpec[] {
  const groupLabels = catalogLabels(
    ruleSet,
    "groupLabels",
    INFECTIOUS_GROUP_LABELS_V1,
  );
  const lifeThreatLabels = catalogLabels(
    ruleSet,
    "lifeThreatLabels",
    INFECTIOUS_LIFE_THREAT_LABELS_V1,
  );
  const generalAdmission = catalogLabels(
    ruleSet,
    "admissionGeneral",
    INFECTIOUS_ADMISSION_LABELS_V1,
  );
  const respiratoryAdmission = catalogLabels(
    ruleSet,
    "admissionRespiratory",
    INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  );
  const admissionLabels = { ...generalAdmission, ...respiratoryAdmission };
  const defaults: FieldSpec[] = [
    {
      id: "territory",
      label: "Территория вызова",
      values: INFECTIOUS_TERRITORIES_V1.map((territory) => ({
        value: territory.name,
        label: territory.name,
      })),
    },
    {
      id: "infectionGroup",
      label: "Группа инфекции",
      values: Object.entries(groupLabels).map(([value, label]) => ({ value, label })),
    },
    {
      id: "lifeThreats",
      label: "Жизнеугрожающие состояния",
      values: Object.entries(lifeThreatLabels).map(([value, label]) => ({ value, label })),
      multiple: true,
    },
    {
      id: "admissionCriteria",
      label: "Показания к госпитализации",
      values: Object.entries(admissionLabels).map(([value, label]) => ({ value, label })),
      multiple: true,
    },
    {
      id: "transportable",
      label: "Транспортабельность",
      values: [
        { value: true, label: "Транспортабелен" },
        { value: false, label: "Нетранспортабелен" },
      ],
    },
  ];
  if (!questions) return defaults;
  return questions.map((question) => {
    const existing = defaults.find((spec) => spec.id === question.id);
    const configuredValues = (question.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
    }));
    return {
      id: question.id,
      label: question.label,
      values:
        configuredValues.length > 0
          ? configuredValues
          : (existing?.values ?? []),
      multiple: question.kind === "multiple_choice",
    };
  });
}

function firstValue(spec: FieldSpec | undefined): RoutingJsonPrimitive {
  return spec?.values[0]?.value ?? "";
}

function leafOperatorsFor(spec: FieldSpec): ConditionOperator[] {
  if (spec.values.length === 0) return ["present"];
  return spec.multiple
    ? ["non_empty", "includes"]
    : ["eq", "neq", "present", "in"];
}

function makeLeafCondition(
  specs: readonly FieldSpec[],
  field = "territory",
  op: ConditionOperator = "present",
): RoutingConditionV1 {
  const spec = specs.find((item) => item.id === field) ?? specs[0];
  const resolvedField = spec?.id ?? field;
  if (op === "present" || op === "non_empty") {
    return { op, field: resolvedField };
  }
  if (op === "in") {
    return { op, field: resolvedField, values: [firstValue(spec)] };
  }
  const value = firstValue(spec);
  if (op === "includes") return { op, field: resolvedField, value };
  if (op === "neq") return { op, field: resolvedField, value };
  return { op: "eq", field: resolvedField, value };
}

function convertCondition(
  condition: RoutingConditionV1,
  op: ConditionOperator,
  specs: readonly FieldSpec[],
): RoutingConditionV1 {
  if (op === "all" || op === "any") {
    if (condition.op === "all" || condition.op === "any") {
      return { op, conditions: condition.conditions };
    }
    return { op, conditions: [condition] };
  }
  if (op === "not") {
    return condition.op === "not" ? condition : { op, condition };
  }
  const field =
    "field" in condition
      ? condition.field
      : op === "includes" || op === "non_empty"
        ? "lifeThreats"
        : "territory";
  return makeLeafCondition(specs, field, op);
}

function optionValue(serialized: string, spec: FieldSpec): RoutingJsonPrimitive {
  const option = spec.values.find((item) => String(item.value) === serialized);
  return option?.value ?? serialized;
}

function describeValue(value: RoutingJsonPrimitive, spec: FieldSpec | undefined) {
  return spec?.values.find((item) => Object.is(item.value, value))?.label ?? String(value);
}

function describeInfectiousCondition(
  condition: RoutingConditionV1,
  ruleSet: RoutingRuleSetV1,
  questions?: readonly RoutingQuestionDescriptor[],
): string {
  const specs = fieldSpecs(ruleSet, questions);
  if (condition.op === "all" || condition.op === "any") {
    const separator = condition.op === "all" ? " И " : " ИЛИ ";
    return condition.conditions
      .map(
        (item) =>
          `(${describeInfectiousCondition(item, ruleSet, questions)})`,
      )
      .join(separator);
  }
  if (condition.op === "not") {
    return `НЕ (${describeInfectiousCondition(condition.condition, ruleSet, questions)})`;
  }
  const spec = specs.find((item) => item.id === condition.field);
  const field = spec?.label ?? condition.field;
  if (condition.op === "present") return `${field}: заполнено`;
  if (condition.op === "non_empty") return `${field}: выбран хотя бы один вариант`;
  if (condition.op === "in") {
    return `${field}: ${condition.values.map((value) => describeValue(value, spec)).join(", ")}`;
  }
  const operator = condition.op === "eq" ? "=" : condition.op === "neq" ? "≠" : "содержит";
  return `${field} ${operator} ${describeValue(condition.value, spec)}`;
}

function replaceMatchingTemplate(
  value: RoutingTemplateV1,
  previous: RoutingTemplateV1,
  next: RoutingTemplateV1,
): RoutingTemplateV1 {
  if (deepEqual(value, previous)) return next;
  if (Array.isArray(value)) {
    return value.map((item) => replaceMatchingTemplate(item, previous, next));
  }
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replaceMatchingTemplate(item as RoutingTemplateV1, previous, next),
    ]),
  );
}

function updateInfectiousFacility(
  ruleSet: RoutingRuleSetV1,
  facilityId: string,
  nextFacility: FacilityRecord,
): RoutingRuleSetV1 {
  const facilities = ruleSet.catalogs.facilities ?? {};
  const previous = facilities[facilityId];
  const catalogs = Object.fromEntries(
    Object.entries(ruleSet.catalogs).map(([catalogId, catalog]) => [
      catalogId,
      Object.fromEntries(
        Object.entries(catalog).map(([key, value]) => [
          key,
          previous === undefined || catalogId === "facilities"
            ? value
            : replaceMatchingTemplate(value, previous, nextFacility),
        ]),
      ),
    ]),
  );
  return {
    ...ruleSet,
    catalogs: {
      ...catalogs,
      facilities: { ...facilities, [facilityId]: nextFacility },
    },
  };
}

export function InfectiousConditionEditor(props: {
  condition: RoutingConditionV1;
  ruleSet: RoutingRuleSetV1;
  questions?: readonly RoutingQuestionDescriptor[];
  onChange: (condition: RoutingConditionV1) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  const depth = props.depth ?? 0;
  const specs = fieldSpecs(props.ruleSet, props.questions);
  const condition = props.condition;
  const leaf = condition.op !== "all" && condition.op !== "any" && condition.op !== "not";
  const selectedField = leaf
    ? specs.find((item) => item.id === condition.field) ?? specs[0]
    : undefined;
  const displayedLeafOperators =
    leaf && selectedField ? leafOperatorsFor(selectedField) : LEAF_OPERATORS;

  function changeField(field: string) {
    if (!leaf) return;
    const nextSpec = specs.find((item) => item.id === field) ?? specs[0];
    if (!nextSpec) return;
    const nextOperator = leafOperatorsFor(nextSpec).includes(condition.op)
      ? condition.op
      : nextSpec.multiple
        ? "non_empty"
        : "present";
    props.onChange(makeLeafCondition(specs, field, nextOperator));
  }

  return (
    <div className={`rounded-xl border p-3 ${depth === 0 ? "border-blue-200 bg-blue-50/40" : "border-neutral-200 bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Тип условия"
          value={condition.op}
          onChange={(event) =>
            props.onChange(
              convertCondition(condition, event.currentTarget.value as ConditionOperator, specs),
            )
          }
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          <optgroup label="Группы">
            {(["all", "any", "not"] as ConditionOperator[]).map((op) => (
              <option key={op} value={op}>{CONDITION_OPERATOR_LABELS[op]}</option>
            ))}
          </optgroup>
          <optgroup label="Критерии">
            {displayedLeafOperators.map((op) => (
              <option key={op} value={op}>{CONDITION_OPERATOR_LABELS[op]}</option>
            ))}
          </optgroup>
        </select>
        {props.onRemove ? (
          <button
            type="button"
            onClick={props.onRemove}
            className="ml-auto text-xs text-red-700 underline"
          >
            Удалить условие
          </button>
        ) : null}
      </div>

      {condition.op === "all" || condition.op === "any" ? (
        <div className="mt-3 space-y-2 border-l-2 border-blue-200 pl-3">
          {condition.conditions.map((child, index) => (
            <InfectiousConditionEditor
              key={`${index}-${child.op}`}
              condition={child}
              ruleSet={props.ruleSet}
              questions={props.questions}
              depth={depth + 1}
              onChange={(next) =>
                props.onChange({
                  ...condition,
                  conditions: condition.conditions.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                })
              }
              onRemove={() =>
                props.onChange({
                  ...condition,
                  conditions: condition.conditions.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                props.onChange({
                  ...condition,
                  conditions: [...condition.conditions, makeLeafCondition(specs)],
                })
              }
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800"
            >
              + Критерий
            </button>
            {depth < 4 ? (
              <button
                type="button"
                onClick={() =>
                  props.onChange({
                    ...condition,
                    conditions: [
                      ...condition.conditions,
                      { op: "all", conditions: [makeLeafCondition(specs)] },
                    ],
                  })
                }
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800"
              >
                + Группа условий
              </button>
            ) : null}
          </div>
        </div>
      ) : condition.op === "not" ? (
        <div className="mt-3 border-l-2 border-amber-200 pl-3">
          <InfectiousConditionEditor
            condition={condition.condition}
            ruleSet={props.ruleSet}
            questions={props.questions}
            depth={depth + 1}
            onChange={(next) => props.onChange({ op: "not", condition: next })}
          />
        </div>
      ) : selectedField ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-neutral-600">
            Поле пациента
            <select
              value={selectedField.id}
              onChange={(event) => changeField(event.currentTarget.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
            >
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>{spec.label}</option>
              ))}
            </select>
          </label>

          {condition.op === "in" ? (
            <fieldset className="text-xs text-neutral-600 sm:col-span-2">
              <legend className="mb-1">Допустимые значения</legend>
              <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-neutral-200 bg-white p-2">
                {selectedField.values.map((option) => {
                  const checked = condition.values.some((value) => Object.is(value, option.value));
                  return (
                    <label key={String(option.value)} className="flex gap-2 text-sm text-neutral-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          props.onChange({
                            ...condition,
                            values: checked
                              ? condition.values.filter((value) => !Object.is(value, option.value))
                              : [...condition.values, option.value],
                          })
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : condition.op === "eq" || condition.op === "neq" || condition.op === "includes" ? (
            <label className="text-xs text-neutral-600">
              Значение
              <select
                value={String(condition.value)}
                onChange={(event) =>
                  props.onChange({
                    ...condition,
                    value: optionValue(event.currentTarget.value, selectedField),
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
              >
                {selectedField.values.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="self-end rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
              Значение выбирать не требуется.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function targetMode(
  value: RoutingTemplateV1 | undefined,
  facilities: Readonly<Record<string, RoutingTemplateV1>>,
): string {
  if (!isRecord(value)) return "custom";
  const record = value as Record<string, unknown>;
  if (typeof record.$catalog !== "string") return "custom";
  if (record.$catalog === "facilities" && typeof record.key === "string" && facilities[record.key]) {
    return `facility:${record.key}`;
  }
  if (record.$catalog === "territorialTargets") return "territorial";
  if (record.$catalog === "seasonalPrimary") return "seasonal";
  return "custom";
}

function targetTemplate(mode: string): RoutingTemplateV1 | undefined {
  if (mode === "none") return undefined;
  if (mode.startsWith("facility:")) {
    return { $catalog: "facilities", key: mode.slice("facility:".length) };
  }
  if (mode === "territorial") {
    return { $catalog: "territorialTargets", key: { $field: "territory" } };
  }
  if (mode === "seasonal") {
    return {
      $catalog: "seasonalPrimary",
      key: {
        $concat: [{ $field: "infectionGroup" }, "|", { $field: "territory" }],
      },
    };
  }
  return undefined;
}

function TextResultField(props: {
  label: string;
  value: RoutingTemplateV1 | undefined;
  rows?: number;
  optional?: boolean;
  onChange: (value: RoutingTemplateV1 | undefined) => void;
}) {
  if (typeof props.value !== "string" && props.value !== undefined) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="font-medium">{props.label}</div>
        <div className="mt-1">{templateSummary(props.value)}</div>
        <button
          type="button"
          onClick={() => props.onChange("")}
          className="mt-2 text-amber-900 underline"
        >
          Заменить постоянным текстом
        </button>
      </div>
    );
  }
  return (
    <label className="block text-xs text-neutral-600">
      {props.label}
      <textarea
        value={typeof props.value === "string" ? props.value : ""}
        onChange={(event) =>
          props.onChange(
            props.optional && event.currentTarget.value === "" ? undefined : event.currentTarget.value,
          )
        }
        rows={props.rows ?? 2}
        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
      />
    </label>
  );
}

function StringListEditor(props: {
  title: string;
  items: readonly RoutingTemplateV1[];
  onChange: (items: RoutingTemplateV1[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{props.title}</div>
      <div className="space-y-2">
        {props.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            {typeof item === "string" ? (
              <textarea
                aria-label={`${props.title}, пункт ${index + 1}`}
                value={item}
                rows={2}
                onChange={(event) =>
                  props.onChange(
                    props.items.map((current, itemIndex) =>
                      itemIndex === index ? event.currentTarget.value : current,
                    ),
                  )
                }
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              />
            ) : (
              <div className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {templateSummary(item)}
                <button
                  type="button"
                  onClick={() =>
                    props.onChange(
                      props.items.map((current, itemIndex) =>
                        itemIndex === index ? "" : current,
                      ),
                    )
                  }
                  className="ml-2 underline"
                >
                  Заменить текстом
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label={`Удалить пункт ${index + 1}`}
              onClick={() => props.onChange(props.items.filter((_, itemIndex) => itemIndex !== index))}
              className="px-1 py-2 text-xs text-red-700 underline"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => props.onChange([...props.items, ""])}
        className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
      >
        + Добавить пункт
      </button>
    </div>
  );
}

function SourcesEditor(props: {
  items: readonly RoutingTemplateV1[];
  onChange: (items: RoutingTemplateV1[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">Нормативные основания результата</div>
      <div className="space-y-2">
        {props.items.map((item, index) => {
          const source: Record<string, unknown> = isRecord(item)
            ? (item as Record<string, unknown>)
            : {};
          return (
            <div key={index} className="rounded-xl border border-neutral-200 p-3">
              <label className="block text-xs text-neutral-600">
                Описание документа и точный пункт
                <textarea
                  value={typeof source.label === "string" ? source.label : ""}
                  rows={2}
                  onChange={(event) =>
                    props.onChange(
                      props.items.map((current, itemIndex) =>
                        itemIndex === index
                          ? { ...(isRecord(current) ? current : {}), label: event.currentTarget.value }
                          : current,
                      ) as RoutingTemplateV1[],
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                />
              </label>
              <label className="mt-2 block text-xs text-neutral-600">
                Официальная ссылка
                <input
                  value={typeof source.url === "string" ? source.url : ""}
                  onChange={(event) =>
                    props.onChange(
                      props.items.map((current, itemIndex) =>
                        itemIndex === index
                          ? { ...(isRecord(current) ? current : {}), url: event.currentTarget.value }
                          : current,
                      ) as RoutingTemplateV1[],
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => props.onChange(props.items.filter((_, itemIndex) => itemIndex !== index))}
                className="mt-2 text-xs text-red-700 underline"
              >
                Удалить основание
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => props.onChange([...props.items, { label: "", url: "" }])}
        className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
      >
        + Добавить основание
      </button>
    </div>
  );
}

function ResultEditor(props: {
  result: RoutingTemplateV1;
  ruleSet: RoutingRuleSetV1;
  onChange: (result: RoutingTemplateV1) => void;
}) {
  const result = asTemplateRecord(props.result);
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => asFacility(value));
  const currentTargetMode = targetMode(result.target, facilities);
  const currentNextMode = result.nextTarget
    ? targetMode(result.nextTarget, facilities)
    : "none";

  function update(field: string, value: RoutingTemplateV1 | undefined) {
    const next = { ...result };
    if (value === undefined) delete next[field];
    else next[field] = value;
    props.onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {RESULT_TEXT_FIELDS.map(([field, label]) => (
          <div key={field} className={field === "transport" || field === "warning" ? "sm:col-span-2" : ""}>
            <TextResultField
              label={label}
              value={result[field]}
              optional={field === "nextTargetLabel" || field === "referenceTargetsLabel" || field === "warning"}
              onChange={(value) => update(field, value)}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-neutral-600">
          Основной пункт назначения
          <select
            value={currentTargetMode}
            onChange={(event) => {
              const template = targetTemplate(event.currentTarget.value);
              if (template) update("target", template);
            }}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            {currentTargetMode === "custom" ? <option value="custom">Индивидуальный шаблон</option> : null}
            <option value="territorial">По территориальной таблице</option>
            <option value="seasonal">По сезонной таблице</option>
            {facilityEntries.map(([id, value]) => (
              <option key={id} value={`facility:${id}`}>{asFacility(value)?.name ?? id}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Следующий этап
          <select
            value={currentNextMode}
            onChange={(event) => update("nextTarget", targetTemplate(event.currentTarget.value))}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            <option value="none">Нет следующего этапа</option>
            {currentNextMode === "custom" ? <option value="custom">Индивидуальный шаблон</option> : null}
            {facilityEntries.map(([id, value]) => (
              <option key={id} value={`facility:${id}`}>{asFacility(value)?.name ?? id}</option>
            ))}
          </select>
        </label>
      </div>

      <StringListEditor
        title="Действия СМП"
        items={Array.isArray(result.actions) ? result.actions : []}
        onChange={(items) => update("actions", items)}
      />
      <StringListEditor
        title="Что передать принимающей стороне"
        items={Array.isArray(result.handoff) ? result.handoff : []}
        onChange={(items) => update("handoff", items)}
      />
      <SourcesEditor
        items={Array.isArray(result.sources) ? result.sources : []}
        onChange={(items) => update("sources", items)}
      />
    </div>
  );
}

function FacilityCatalogEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const [newId, setNewId] = useState("");

  function addFacility() {
    const id = newId.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
    if (!id || facilities[id]) return;
    props.onChange(
      updateInfectiousFacility(props.ruleSet, id, {
        name: "Новая медицинская организация",
        role: "Укажите роль в маршруте",
        address: "Укажите город и адрес",
      }),
    );
    setNewId("");
  }

  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Медицинские организации ({Object.keys(facilities).length})</span>}
    >
      <p className="mt-2 text-xs text-neutral-600">
        Изменение организации обновляет совпадающие территориальные и сезонные назначения в этом черновике.
      </p>
      <div className="mt-3 space-y-3">
        {Object.entries(facilities).map(([id, value]) => {
          const facility = asFacility(value);
          if (!facility) return null;
          return (
            <div key={id} className="rounded-xl bg-neutral-50 p-3">
              <div className="text-xs font-medium text-neutral-500">{id}</div>
              {(["name", "role", "address", "url"] as const).map((field) => (
                <label key={field} className="mt-2 block text-xs text-neutral-600">
                  {field === "name" ? "Название" : field === "role" ? "Роль" : field === "address" ? "Город и адрес" : "Официальный сайт"}
                  <textarea
                    value={facility[field] ?? ""}
                    rows={field === "name" || field === "url" ? 1 : 2}
                    onChange={(event) => {
                      const next = { ...facility, [field]: event.currentTarget.value };
                      if (field === "url" && !event.currentTarget.value) delete next.url;
                      props.onChange(updateInfectiousFacility(props.ruleSet, id, next));
                    }}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
                  />
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          aria-label="Идентификатор новой медицинской организации"
          value={newId}
          onChange={(event) => setNewId(event.currentTarget.value)}
          placeholder="например, reserve_hospital"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addFacility}
          disabled={!newId.trim()}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </LazyDetails>
  );
}

function facilityKeyFor(
  value: RoutingTemplateV1 | undefined,
  facilities: Readonly<Record<string, RoutingTemplateV1>>,
): string | undefined {
  if (isRecord(value)) {
    const record = value as Record<string, unknown>;
    if (record.$catalog === "facilities" && typeof record.key === "string") {
      return facilities[record.key] ? record.key : undefined;
    }
  }
  return Object.entries(facilities).find(([, facility]) => deepEqual(facility, value))?.[0];
}

function facilityReference(id: string): RoutingTemplateV1 {
  return { $catalog: "facilities", key: id };
}

function updateCatalogEntry(
  ruleSet: RoutingRuleSetV1,
  catalogId: string,
  key: string,
  value: RoutingTemplateV1,
): RoutingRuleSetV1 {
  return {
    ...ruleSet,
    catalogs: {
      ...ruleSet.catalogs,
      [catalogId]: { ...(ruleSet.catalogs[catalogId] ?? {}), [key]: value },
    },
  };
}

function TerritoryMappingsEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => asFacility(value));
  const targets = props.ruleSet.catalogs.territorialTargets ?? {};

  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Территориальные назначения ({INFECTIOUS_TERRITORIES_V1.length})</span>}
    >
      <p className="mt-2 text-xs text-neutral-600">
        Используется для обычных инфекционных заболеваний без сезонной схемы.
      </p>
      <div className="mt-3 max-h-[34rem] space-y-2 overflow-auto pr-1">
        {INFECTIOUS_TERRITORIES_V1.map((territory) => {
          const selected = facilityKeyFor(targets[territory.name], facilities);
          return (
            <label key={territory.name} className="grid gap-1 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
              <span className="font-medium text-neutral-900">{territory.name}</span>
              <select
                value={selected ?? "custom"}
                onChange={(event) =>
                  props.onChange(
                    updateCatalogEntry(
                      props.ruleSet,
                      "territorialTargets",
                      territory.name,
                      facilityReference(event.currentTarget.value),
                    ),
                  )
                }
                className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
              >
                {!selected ? <option value="custom" disabled>Индивидуальное значение</option> : null}
                {facilityEntries.map(([id, value]) => (
                  <option key={id} value={id}>{asFacility(value)?.name ?? id}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </LazyDetails>
  );
}

function selectedFacilityKeys(
  value: RoutingTemplateV1 | undefined,
  facilities: Readonly<Record<string, RoutingTemplateV1>>,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => facilityKeyFor(item, facilities))
    .filter((item): item is string => Boolean(item));
}

function SeasonalMappingsEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => asFacility(value));
  const primary = props.ruleSet.catalogs.seasonalPrimary ?? {};
  const references = props.ruleSet.catalogs.seasonalReferences ?? {};
  const transport = props.ruleSet.catalogs.seasonalTransport ?? {};
  const groupLabels = catalogLabels(props.ruleSet, "groupLabels", INFECTIOUS_GROUP_LABELS_V1);

  function updateSeasonal(
    key: string,
    primaryId: string,
    referenceIds: readonly string[],
    transportText: RoutingTemplateV1,
  ) {
    let next = updateCatalogEntry(props.ruleSet, "seasonalPrimary", key, facilityReference(primaryId));
    next = updateCatalogEntry(
      next,
      "seasonalReferences",
      key,
      referenceIds.map(facilityReference),
    );
    next = updateCatalogEntry(
      next,
      "seasonalAll",
      key,
      [facilityReference(primaryId), ...referenceIds.map(facilityReference)],
    );
    next = updateCatalogEntry(next, "seasonalTransport", key, transportText);
    props.onChange(next);
  }

  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Сезонная территориальная схема (44 назначения)</span>}
    >
      <p className="mt-2 text-xs text-amber-800">
        Схема приказа № 920-Д ограничена сезоном 2025–2026. Изменять её следует только по новому официальному документу.
      </p>
      <div className="mt-3 max-h-[42rem] space-y-3 overflow-auto pr-1">
        {(["flu_orvi_vp", "covid"] as const).flatMap((group) =>
          INFECTIOUS_TERRITORIES_V1.map((territory) => {
            const key = `${group}|${territory.name}`;
            const primaryId = facilityKeyFor(primary[key], facilities) ?? "";
            const referenceIds = selectedFacilityKeys(references[key], facilities);
            return (
              <div key={key} className="rounded-xl bg-neutral-50 p-3">
                <div className="text-sm font-medium">{territory.name}</div>
                <div className="text-xs text-neutral-500">{groupLabels[group] ?? group}</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-neutral-600">
                    Основной стационар
                    <select
                      value={primaryId}
                      onChange={(event) =>
                        updateSeasonal(
                          key,
                          event.currentTarget.value,
                          referenceIds.filter((id) => id !== event.currentTarget.value),
                          transport[key] ?? "",
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
                    >
                      {!primaryId ? <option value="" disabled>Выберите организацию</option> : null}
                      {facilityEntries.map(([id, value]) => (
                        <option key={id} value={id}>{asFacility(value)?.name ?? id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-neutral-600">
                    Дополнительные стационары
                    <select
                      multiple
                      value={referenceIds}
                      onChange={(event) => {
                        const ids = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                        if (primaryId) updateSeasonal(key, primaryId, ids.filter((id) => id !== primaryId), transport[key] ?? "");
                      }}
                      className="mt-1 h-24 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
                    >
                      {facilityEntries
                        .filter(([id]) => id !== primaryId)
                        .map(([id, value]) => (
                          <option key={id} value={id}>{asFacility(value)?.name ?? id}</option>
                        ))}
                    </select>
                  </label>
                </div>
                <TextResultField
                  label="Указание по транспортировке"
                  value={transport[key]}
                  onChange={(value) => {
                    if (primaryId) updateSeasonal(key, primaryId, referenceIds, value ?? "");
                  }}
                />
              </div>
            );
          }),
        )}
      </div>
    </LazyDetails>
  );
}

function OptionLabelsEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const catalogs = [
    ["groupLabels", "Группы инфекций"],
    ["lifeThreatLabels", "Жизнеугрожающие состояния"],
    ["admissionGeneral", "Общие показания к госпитализации"],
    ["admissionRespiratory", "Респираторные показания"],
  ] as const;
  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Варианты ответов и медицинские формулировки</span>}
    >
      <div className="mt-3 space-y-4">
        {catalogs.map(([catalogId, title]) => (
          <div key={catalogId}>
            <div className="mb-2 text-sm font-medium">{title}</div>
            <div className="space-y-2">
              {Object.entries(props.ruleSet.catalogs[catalogId] ?? {}).map(([key, value]) => (
                <label key={key} className="block text-xs text-neutral-500">
                  {key}
                  <textarea
                    value={typeof value === "string" ? value : ""}
                    rows={2}
                    onChange={(event) =>
                      props.onChange(
                        updateCatalogEntry(
                          props.ruleSet,
                          catalogId,
                          key,
                          event.currentTarget.value,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LazyDetails>
  );
}

function uniqueRuleId(ruleSet: RoutingRuleSetV1, base: string): string {
  const ids = new Set(ruleSet.rules.map((rule) => rule.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function newRule(
  ruleSet: RoutingRuleSetV1,
  questions?: readonly RoutingQuestionDescriptor[],
): RoutingRuleV1 {
  const priority = Math.max(0, ...ruleSet.rules.map((rule) => rule.priority)) + 10;
  return {
    id: uniqueRuleId(ruleSet, "new_route"),
    priority,
    when: {
      op: "all",
      conditions: [makeLeafCondition(fieldSpecs(ruleSet, questions))],
    },
    result: {
      title: "Новая маршрутная ветка",
      target: { $catalog: "facilities", key: "noib" },
      targetLabel: "Куда госпитализировать",
      urgency: "После согласования",
      transport: "Укажите порядок транспортировки.",
      actions: ["Укажите действия бригады СМП."],
      handoff: ["Укажите данные для принимающей стороны."],
      sources: [{ label: "Укажите официальный документ и точный пункт." }],
    },
  };
}

function RulesEditor(props: {
  ruleSet: RoutingRuleSetV1;
  questions?: readonly RoutingQuestionDescriptor[];
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  function replaceRule(index: number, rule: RoutingRuleV1) {
    props.onChange({
      ...props.ruleSet,
      rules: props.ruleSet.rules.map((item, itemIndex) => (itemIndex === index ? rule : item)),
    });
  }

  function moveRule(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= props.ruleSet.rules.length) return;
    const rules = [...props.ruleSet.rules];
    [rules[index], rules[nextIndex]] = [rules[nextIndex]!, rules[index]!];
    props.onChange({
      ...props.ruleSet,
      rules: rules.map((rule, ruleIndex) => ({ ...rule, priority: (ruleIndex + 1) * 10 })),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">Исполняемые маршрутные правила ({props.ruleSet.rules.length})</h4>
          <p className="text-xs text-neutral-600">Первой срабатывает подходящая ветка с наименьшим приоритетом.</p>
        </div>
        <button
          type="button"
          onClick={() => props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, newRule(props.ruleSet, props.questions)] })}
          className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-medium text-white"
        >
          + Добавить ветку
        </button>
      </div>

      {props.ruleSet.rules.map((rule, index) => (
        <LazyDetails
          key={`${rule.id}-${index}`}
          className="rounded-2xl border border-neutral-200 bg-white p-4"
          summary={
            <>
            <span className="font-semibold">{rule.priority}. {templateSummary(asTemplateRecord(rule.result).title)}</span>
            <span
              className="mt-1 block truncate text-xs text-neutral-500"
              title={describeInfectiousCondition(rule.when, props.ruleSet, props.questions)}
            >
              {rule.id} · {describeInfectiousCondition(rule.when, props.ruleSet, props.questions)}
            </span>
            </>
          }
        >
          <div className="mt-4 space-y-5 border-t border-neutral-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <label className="text-xs text-neutral-600">
                Идентификатор ветки
                <input
                  value={rule.id}
                  onChange={(event) => replaceRule(index, { ...rule, id: event.currentTarget.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
              <label className="text-xs text-neutral-600">
                Приоритет
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rule.priority}
                  onChange={(event) => replaceRule(index, { ...rule, priority: Number(event.currentTarget.value) })}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Когда срабатывает ветка</div>
              <InfectiousConditionEditor
                condition={rule.when}
                ruleSet={props.ruleSet}
                questions={props.questions}
                onChange={(when) => replaceRule(index, { ...rule, when })}
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Что показать врачу СМП</div>
              <ResultEditor
                result={rule.result}
                ruleSet={props.ruleSet}
                onChange={(result) => replaceRule(index, { ...rule, result })}
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              <button type="button" onClick={() => moveRule(index, -1)} disabled={index === 0} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Выше</button>
              <button type="button" onClick={() => moveRule(index, 1)} disabled={index === props.ruleSet.rules.length - 1} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Ниже</button>
              <button
                type="button"
                onClick={() => {
                  const duplicate = {
                    ...rule,
                    id: uniqueRuleId(props.ruleSet, `${rule.id}_copy`),
                    priority: Math.max(0, ...props.ruleSet.rules.map((item) => item.priority)) + 10,
                  };
                  props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, duplicate] });
                }}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
              >
                Дублировать
              </button>
              <button
                type="button"
                onClick={() => props.onChange({ ...props.ruleSet, rules: props.ruleSet.rules.filter((_, itemIndex) => itemIndex !== index) })}
                disabled={props.ruleSet.rules.length <= 1}
                className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
              >
                Удалить ветку
              </button>
            </div>
          </div>
        </LazyDetails>
      ))}
    </div>
  );
}

type PreviewState = {
  territory?: string;
  infectionGroup?: string;
  lifeThreats: string[];
  admissionCriteria: string[];
  transportable?: boolean;
};

function Preview(props: {
  ruleSet: RoutingRuleSetV1;
  questions?: readonly RoutingQuestionDescriptor[];
}) {
  const specs = fieldSpecs(props.ruleSet, props.questions);
  const [state, setState] = useState<PreviewState>({
    territory: INFECTIOUS_TERRITORIES_V1[0]?.name,
    infectionGroup: "general",
    lifeThreats: ["none"],
    admissionCriteria: ["none"],
  });
  const issues = validateInfectiousRuleSetForEditor(
    props.ruleSet,
    props.questions,
  );
  const evaluation = useMemo(() => {
    if (issues.length > 0) return { error: "Сначала исправьте ошибки структуры правил." };
    try {
      return { value: evaluateRoutingRuleSetV1(props.ruleSet, state) };
    } catch (reason) {
      return { error: reason instanceof Error ? reason.message : "Не удалось рассчитать маршрут." };
    }
  }, [issues.length, props.ruleSet, state]);
  const result = evaluation.value ? asTemplateRecord(evaluation.value.result) : null;
  const target = result ? asFacility(result.target) : null;
  const nextTarget = result ? asFacility(result.nextTarget) : null;
  const referenceTargets = result && Array.isArray(result.referenceTargets)
    ? result.referenceTargets.map(asFacility).filter((item): item is FacilityRecord => Boolean(item))
    : [];
  const actions = result && Array.isArray(result.actions)
    ? result.actions.filter((item): item is string => typeof item === "string")
    : [];
  const handoff = result && Array.isArray(result.handoff)
    ? result.handoff.filter((item): item is string => typeof item === "string")
    : [];
  const sources = result && Array.isArray(result.sources)
    ? result.sources
        .map((item) => {
          if (!isRecord(item)) return null;
          const record = item as Record<string, unknown>;
          return typeof record.label === "string"
            ? { label: record.label, url: typeof record.url === "string" ? record.url : undefined }
            : null;
        })
        .filter((item): item is { label: string; url: string | undefined } => Boolean(item))
    : [];

  function toggle(field: "lifeThreats" | "admissionCriteria", value: string) {
    setState((current) => {
      if (value === "none") return { ...current, [field]: ["none"] };
      const withoutNone = current[field].filter((item) => item !== "none");
      return {
        ...current,
        [field]: withoutNone.includes(value)
          ? withoutNone.filter((item) => item !== value)
          : [...withoutNone, value],
      };
    });
  }

  const lifeSpec = specs.find((item) => item.id === "lifeThreats");
  const groupSpec = specs.find((item) => item.id === "infectionGroup");
  const previewAdmissionLabels = catalogLabels(
    props.ruleSet,
    state.infectionGroup === "general"
      ? "admissionGeneral"
      : "admissionRespiratory",
    state.infectionGroup === "general"
      ? INFECTIOUS_ADMISSION_LABELS_V1
      : INFECTIOUS_RESPIRATORY_ADMISSION_LABELS_V1,
  );

  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
      <h4 className="font-semibold">Предпросмотр маршрута</h4>
      <p className="mt-1 text-xs text-neutral-600">Расчёт выполняется в браузере по текущему черновику и ничего не сохраняет.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-neutral-600">
          Территория
          <select value={state.territory ?? ""} onChange={(event) => setState({ ...state, territory: event.currentTarget.value })} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900">
            {INFECTIOUS_TERRITORIES_V1.map((territory) => <option key={territory.name}>{territory.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Группа инфекции
          <select value={state.infectionGroup ?? ""} onChange={(event) => setState({ ...state, infectionGroup: event.currentTarget.value, admissionCriteria: [] })} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900">
            {groupSpec?.values.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-neutral-700">Жизнеугрожающие состояния</legend>
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {lifeSpec?.values.map((option) => (
            <label key={String(option.value)} className="flex gap-2 rounded-lg bg-white p-2 text-xs">
              <input type="checkbox" checked={state.lifeThreats.includes(String(option.value))} onChange={() => toggle("lifeThreats", String(option.value))} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-neutral-700">Показания к госпитализации</legend>
        <div className="mt-1 grid max-h-52 gap-1 overflow-auto sm:grid-cols-2">
          {Object.entries(previewAdmissionLabels).map(([value, label]) => (
            <label key={value} className="flex gap-2 rounded-lg bg-white p-2 text-xs">
              <input type="checkbox" checked={state.admissionCriteria.includes(value)} onChange={() => toggle("admissionCriteria", value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block text-xs text-neutral-600">
        Транспортабельность
        <select
          value={state.transportable === undefined ? "" : String(state.transportable)}
          onChange={(event) => setState({ ...state, transportable: event.currentTarget.value === "" ? undefined : event.currentTarget.value === "true" })}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900"
        >
          <option value="">Не указана</option>
          <option value="true">Транспортабелен</option>
          <option value="false">Нетранспортабелен</option>
        </select>
      </label>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
        {evaluation.error ? (
          <div className="text-sm text-red-800">{evaluation.error}</div>
        ) : !evaluation.value ? (
          <div className="text-sm text-amber-800">Ни одна ветка не подошла. Проверьте заполнение и условия.</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium text-emerald-700">Сработала ветка: {evaluation.value.ruleId}</div>
            <div className="text-lg font-bold">{typeof result?.title === "string" ? result.title : "Результат без названия"}</div>
            {target ? <div><span className="font-medium">Основной пункт:</span> {target.name}<br /><span className="text-neutral-600">{target.address}</span></div> : null}
            {nextTarget ? <div><span className="font-medium">Следующий этап:</span> {nextTarget.name}<br /><span className="text-neutral-600">{nextTarget.address}</span></div> : null}
            {referenceTargets.length > 0 ? (
              <div>
                <span className="font-medium">Дополнительные пункты:</span>
                <ul className="mt-1 list-disc pl-5 text-neutral-700">
                  {referenceTargets.map((facility) => <li key={`${facility.name}-${facility.address}`}>{facility.name} — {facility.address}</li>)}
                </ul>
              </div>
            ) : null}
            {typeof result?.urgency === "string" ? <div><span className="font-medium">Срочность:</span> {result.urgency}</div> : null}
            {typeof result?.transport === "string" ? <div><span className="font-medium">Транспорт:</span> {result.transport}</div> : null}
            {actions.length > 0 ? (
              <div><span className="font-medium">Действия СМП:</span><ul className="mt-1 list-disc pl-5 text-neutral-700">{actions.map((item) => <li key={item}>{item}</li>)}</ul></div>
            ) : null}
            {handoff.length > 0 ? (
              <div><span className="font-medium">Передать принимающей стороне:</span><ul className="mt-1 list-disc pl-5 text-neutral-700">{handoff.map((item) => <li key={item}>{item}</li>)}</ul></div>
            ) : null}
            {sources.length > 0 ? (
              <div><span className="font-medium">Нормативные основания:</span><ul className="mt-1 list-disc pl-5 text-neutral-700">{sources.map((source) => <li key={source.label}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{source.label}</a> : source.label}</li>)}</ul></div>
            ) : null}
            {typeof result?.warning === "string" ? <div className="rounded-lg bg-amber-50 p-2 text-amber-900">{result.warning}</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}

export default function InfectiousRuleBuilder(props: {
  ruleSet: RoutingRuleSetV1;
  questions?: readonly RoutingQuestionDescriptor[];
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const issues = validateInfectiousRuleSetForEditor(
    props.ruleSet,
    props.questions,
  );
  return (
    <div className="space-y-4 rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Пилотный визуальный конструктор</div>
        <h3 className="mt-1 text-lg font-bold">Инфекционный профиль</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Изменения относятся только к открытому черновику. Действующий публичный маршрут не меняется.
        </p>
      </div>

      {issues.length > 0 ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-semibold">Нужно исправить перед сохранением: {issues.length}</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {issues.slice(0, 12).map((issue) => <li key={`${issue.path}-${issue.message}`}><span className="font-mono">{issue.path}</span>: {issue.message}</li>)}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Структура правил корректна. Сервер повторно проверит её при сохранении.
        </div>
      )}

      {!props.questions ? (
        <OptionLabelsEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      ) : null}
      <FacilityCatalogEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      <TerritoryMappingsEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      <SeasonalMappingsEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      <RulesEditor
        ruleSet={props.ruleSet}
        questions={props.questions}
        onChange={props.onChange}
      />
      <Preview ruleSet={props.ruleSet} questions={props.questions} />
    </div>
  );
}
