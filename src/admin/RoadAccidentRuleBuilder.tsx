import { type ReactNode, useState } from "react";
import {
  validateRoutingRuleSetForEditor,
  type RoutingQuestionDescriptor,
  type RoutingRuleSetV1,
  type RoutingRuleV1,
  type RoutingTemplateV1,
} from "../routing/index.js";
import { InfectiousConditionEditor } from "./InfectiousRuleBuilder.js";

type TemplateRecord = Record<string, RoutingTemplateV1>;
type FacilityRecord = {
  id: string;
  name: string;
  level: "I" | "II" | "III";
  role: string;
  address: string;
  url?: string;
};

const TARGET_CATALOGS = [
  ["levelOneTargets", "Травмоцентры I уровня по возрасту"],
  ["territoryLevelTwoTargets", "Травмоцентры II уровня по территории и возрасту"],
  ["territoryLevelThreeTargets", "Травмоцентры III уровня по территории"],
  ["m10Targets", "Назначения для М-10"],
  ["m11Targets", "Назначения для М-11"],
] as const;

const TARGET_MODES = [
  ["levelOneTargets", { $field: "ageGroup" }],
  ["territoryLevelTwoTargets", concatFields("territory", "ageGroup")],
  ["territoryLevelThreeTargets", { $field: "territory" }],
  ["m10Targets", concatFields("m10Zone", "ageGroup", "injuryCriterion")],
  ["m11Targets", concatFields("m11Responder", "m11Zone", "ageGroup", "injuryCriterion")],
] as const;

function concatFields(...fields: string[]): RoutingTemplateV1 {
  return {
    $concat: fields.flatMap((field, index) => [
      ...(index === 0 ? [] : ["|"]),
      { $field: field },
    ]),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: RoutingTemplateV1): TemplateRecord {
  return isRecord(value) ? value as TemplateRecord : {};
}

function asFacility(value: RoutingTemplateV1 | undefined): FacilityRecord | null {
  if (!isRecord(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    (record.level !== "I" && record.level !== "II" && record.level !== "III") ||
    typeof record.role !== "string" ||
    typeof record.address !== "string"
  ) return null;
  return record as FacilityRecord;
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
      return `Динамическое значение из таблицы «${record.$catalog}»`;
    }
  }
  return "Динамическое значение";
}

function replaceMatching(
  value: RoutingTemplateV1,
  previous: RoutingTemplateV1,
  next: RoutingTemplateV1,
): RoutingTemplateV1 {
  if (deepEqual(value, previous)) return next;
  if (Array.isArray(value)) return value.map((item) => replaceMatching(item, previous, next));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replaceMatching(item as RoutingTemplateV1, previous, next),
    ]),
  );
}

function updateFacility(
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
        Object.entries(catalog).map(([key, value]) => {
          if (catalogId === "facilities" && key === facilityId) return [key, nextFacility];
          if (catalogId === "territoryLevelTwoNames" && value === asFacility(previous)?.name) {
            return [key, nextFacility.name];
          }
          return [key, previous === undefined ? value : replaceMatching(value, previous, nextFacility)];
        }),
      ),
    ]),
  );
  catalogs.facilities = {
    ...(catalogs.facilities ?? facilities),
    [facilityId]: nextFacility,
  };
  return { ...ruleSet, catalogs };
}

function facilityReference(id: string): RoutingTemplateV1 {
  return { $catalog: "facilities", key: id };
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

function LazyDetails(props: { summary: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={props.className}>
      <summary className="cursor-pointer">{props.summary}</summary>
      {open ? props.children : null}
    </details>
  );
}

function FacilitiesEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const [newId, setNewId] = useState("");
  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Медицинские организации ({Object.keys(facilities).length})</span>}
    >
      <p className="mt-2 text-xs text-neutral-600">
        Здесь задаются учреждения, которые можно выбрать конечным пунктом ветки или назначением в территориальной таблице.
      </p>
      <div className="mt-3 space-y-3">
        {Object.entries(facilities).map(([id, value]) => {
          const facility = asFacility(value);
          if (!facility) return null;
          return (
            <div key={id} className="rounded-xl bg-neutral-50 p-3">
              <div className="text-xs font-medium text-neutral-500">{id}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_8rem]">
                <label className="text-xs text-neutral-600">
                  Название
                  <input
                    value={facility.name}
                    onChange={(event) => props.onChange(updateFacility(props.ruleSet, id, { ...facility, name: event.currentTarget.value }))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-neutral-600">
                  Уровень
                  <select
                    value={facility.level}
                    onChange={(event) => props.onChange(updateFacility(props.ruleSet, id, { ...facility, level: event.currentTarget.value as FacilityRecord["level"] }))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm"
                  >
                    <option>I</option><option>II</option><option>III</option>
                  </select>
                </label>
              </div>
              {(["role", "address", "url"] as const).map((field) => (
                <label key={field} className="mt-2 block text-xs text-neutral-600">
                  {field === "role" ? "Роль в маршруте" : field === "address" ? "Город и адрес" : "Официальный сайт"}
                  <textarea
                    value={facility[field] ?? ""}
                    rows={field === "url" ? 1 : 2}
                    onChange={(event) => {
                      const next = { ...facility, [field]: event.currentTarget.value };
                      if (field === "url" && !event.currentTarget.value) delete next.url;
                      props.onChange(updateFacility(props.ruleSet, id, next));
                    }}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={newId}
          onChange={(event) => setNewId(event.currentTarget.value)}
          placeholder="идентификатор новой организации"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!newId.trim()}
          onClick={() => {
            const id = newId.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
            if (!id || facilities[id]) return;
            props.onChange(updateFacility(props.ruleSet, id, {
              id,
              name: "Новая медицинская организация",
              level: "III",
              role: "Укажите роль в маршруте",
              address: "Укажите город и адрес",
            }));
            setNewId("");
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-xs disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </LazyDetails>
  );
}

function TargetTablesEditor(props: {
  ruleSet: RoutingRuleSetV1;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => asFacility(value));
  return (
    <LazyDetails
      className="rounded-2xl border border-neutral-200 p-4"
      summary={<span className="font-semibold">Таблицы пунктов назначения</span>}
    >
      <p className="mt-2 text-xs text-neutral-600">
        Каждая строка — сочетание ответов врача. Выбранная организация станет конкретным результатом маршрута.
      </p>
      <div className="mt-3 space-y-4">
        {TARGET_CATALOGS.map(([catalogId, title]) => {
          const catalog = props.ruleSet.catalogs[catalogId] ?? {};
          return (
            <LazyDetails key={catalogId} className="rounded-xl border border-neutral-200 p-3" summary={<span className="text-sm font-medium">{title} ({Object.keys(catalog).length})</span>}>
              <div className="mt-3 max-h-[36rem] space-y-2 overflow-auto pr-1">
                {Object.entries(catalog).map(([key, value]) => {
                  const selected = facilityKeyFor(value, facilities);
                  return (
                    <label key={key} className="grid gap-1 rounded-lg bg-neutral-50 p-2 text-xs sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center">
                      <span className="break-words font-mono text-neutral-700">{key}</span>
                      <select
                        value={selected ?? "custom"}
                        onChange={(event) => {
                          const nextCatalog = {
                            ...catalog,
                            [key]: facilityReference(event.currentTarget.value),
                          };
                          const nextCatalogs = { ...props.ruleSet.catalogs, [catalogId]: nextCatalog };
                          if (catalogId === "territoryLevelTwoTargets") {
                            const facility = asFacility(facilities[event.currentTarget.value]);
                            nextCatalogs.territoryLevelTwoNames = {
                              ...(props.ruleSet.catalogs.territoryLevelTwoNames ?? {}),
                              [key]: facility?.name ?? "",
                            };
                          }
                          props.onChange({ ...props.ruleSet, catalogs: nextCatalogs });
                        }}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm"
                      >
                        {!selected ? <option value="custom" disabled>Индивидуальное значение</option> : null}
                        {facilityEntries.map(([id, facility]) => (
                          <option key={id} value={id}>{asFacility(facility)?.name ?? id}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </LazyDetails>
          );
        })}
      </div>
    </LazyDetails>
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
                value={item}
                rows={2}
                onChange={(event) => props.onChange(props.items.map((current, itemIndex) => itemIndex === index ? event.currentTarget.value : current))}
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              />
            ) : (
              <div className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {templateSummary(item)}
                <button type="button" onClick={() => props.onChange(props.items.map((current, itemIndex) => itemIndex === index ? "" : current))} className="ml-2 underline">
                  Заменить текстом
                </button>
              </div>
            )}
            <button type="button" onClick={() => props.onChange(props.items.filter((_, itemIndex) => itemIndex !== index))} className="px-1 py-2 text-xs text-red-700 underline">
              Удалить
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => props.onChange([...props.items, ""])} className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs">
        + Добавить пункт
      </button>
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
  return TARGET_MODES.some(([catalogId]) => catalogId === record.$catalog)
    ? `table:${record.$catalog}`
    : "custom";
}

function targetTemplate(mode: string): RoutingTemplateV1 | undefined {
  if (mode === "none") return undefined;
  if (mode.startsWith("facility:")) return facilityReference(mode.slice("facility:".length));
  if (mode.startsWith("table:")) {
    const catalogId = mode.slice("table:".length);
    const configured = TARGET_MODES.find(([id]) => id === catalogId);
    return configured ? { $catalog: catalogId, key: configured[1] } : undefined;
  }
  return undefined;
}

function ResultEditor(props: {
  result: RoutingTemplateV1;
  ruleSet: RoutingRuleSetV1;
  onChange: (result: RoutingTemplateV1) => void;
}) {
  const result = asRecord(props.result);
  const facilities = props.ruleSet.catalogs.facilities ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => asFacility(value));
  function update(field: string, value: RoutingTemplateV1 | undefined) {
    const next = { ...result };
    if (value === undefined) delete next[field];
    else next[field] = value;
    props.onChange(next);
  }
  const textFields = [
    ["title", "Название результата"],
    ["targetLabel", "Подпись основного пункта"],
    ["nextTargetLabel", "Подпись следующего этапа"],
    ["urgency", "Срочность"],
    ["sourceReference", "Нормативное основание и точный пункт"],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {textFields.map(([field, label]) => (
          <label key={field} className={`text-xs text-neutral-600 ${field === "sourceReference" ? "sm:col-span-2" : ""}`}>
            {label}
            <textarea
              value={typeof result[field] === "string" ? result[field] as string : ""}
              rows={field === "sourceReference" ? 3 : 2}
              onChange={(event) => update(field, event.currentTarget.value || (field === "nextTargetLabel" ? undefined : ""))}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["target", "nextTarget"] as const).map((field) => {
          const mode = field === "nextTarget" && result[field] === undefined
            ? "none"
            : targetMode(result[field], facilities);
          return (
            <label key={field} className="text-xs text-neutral-600">
              {field === "target" ? "Основной пункт назначения" : "Следующий этап"}
              <select
                value={mode}
                onChange={(event) => update(field, targetTemplate(event.currentTarget.value))}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {field === "nextTarget" ? <option value="none">Нет следующего этапа</option> : null}
                {mode === "custom" ? <option value="custom">Индивидуальный динамический шаблон</option> : null}
                <optgroup label="Конкретная организация">
                  {facilityEntries.map(([id, value]) => <option key={id} value={`facility:${id}`}>{asFacility(value)?.name ?? id}</option>)}
                </optgroup>
                {field === "target" ? (
                  <optgroup label="Зависит от ответов">
                    {TARGET_CATALOGS.map(([id, label]) => <option key={id} value={`table:${id}`}>{label}</option>)}
                  </optgroup>
                ) : null}
              </select>
            </label>
          );
        })}
      </div>
      <StringListEditor title="Почему выбран маршрут" items={Array.isArray(result.rationale) ? result.rationale : []} onChange={(items) => update("rationale", items)} />
      <StringListEditor title="Действия СМП" items={Array.isArray(result.actions) ? result.actions : []} onChange={(items) => update("actions", items)} />
      <StringListEditor title="Что передать принимающей стороне" items={Array.isArray(result.handoff) ? result.handoff : []} onChange={(items) => update("handoff", items)} />
      <StringListEditor title="Предупреждения и ограничения" items={Array.isArray(result.warnings) ? result.warnings : []} onChange={(items) => update("warnings", items)} />
    </div>
  );
}

function uniqueRuleId(ruleSet: RoutingRuleSetV1, base: string): string {
  const ids = new Set(ruleSet.rules.map((rule) => rule.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function newRule(ruleSet: RoutingRuleSetV1, questions: readonly RoutingQuestionDescriptor[]): RoutingRuleV1 {
  const first = questions[0];
  const firstOption = first?.options?.[0];
  return {
    id: uniqueRuleId(ruleSet, "new_route"),
    priority: Math.max(0, ...ruleSet.rules.map((rule) => rule.priority)) + 10,
    when: first && firstOption
      ? { op: "eq", field: first.id, value: firstOption.value }
      : { op: "present", field: first?.id ?? "locationKind" },
    result: {
      title: "Новая маршрутная ветка",
      urgency: "Экстренно",
      target: facilityReference("nokb"),
      targetLabel: "Место госпитализации",
      rationale: ["Укажите медицинское обоснование маршрута."],
      actions: ["Укажите действия бригады СМП."],
      handoff: ["Укажите данные для принимающей стороны."],
      warnings: [],
      sourceReference: "Укажите официальный документ и точный пункт.",
    },
  };
}

function RulesEditor(props: {
  ruleSet: RoutingRuleSetV1;
  questions: readonly RoutingQuestionDescriptor[];
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  function replaceRule(index: number, rule: RoutingRuleV1) {
    props.onChange({ ...props.ruleSet, rules: props.ruleSet.rules.map((item, itemIndex) => itemIndex === index ? rule : item) });
  }
  function moveRule(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= props.ruleSet.rules.length) return;
    const rules = [...props.ruleSet.rules];
    [rules[index], rules[nextIndex]] = [rules[nextIndex]!, rules[index]!];
    props.onChange({ ...props.ruleSet, rules: rules.map((rule, ruleIndex) => ({ ...rule, priority: (ruleIndex + 1) * 10 })) });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">Исполняемые маршрутные ветки ({props.ruleSet.rules.length})</h4>
          <p className="text-xs text-neutral-600">Первой срабатывает подходящая ветка с наименьшим приоритетом.</p>
        </div>
        <button type="button" onClick={() => props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, newRule(props.ruleSet, props.questions)] })} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-medium text-white">
          + Добавить ветку
        </button>
      </div>
      {props.ruleSet.rules.map((rule, index) => (
        <LazyDetails key={`${rule.id}-${index}`} className="rounded-2xl border border-neutral-200 bg-white p-4" summary={<><span className="font-semibold">{rule.priority}. {typeof asRecord(rule.result).title === "string" ? asRecord(rule.result).title as string : rule.id}</span><span className="mt-1 block text-xs text-neutral-500">{rule.id}</span></>}>
          <div className="mt-4 space-y-5 border-t border-neutral-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <label className="text-xs text-neutral-600">Идентификатор ветки<input value={rule.id} onChange={(event) => replaceRule(index, { ...rule, id: event.currentTarget.value })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs text-neutral-600">Приоритет<input type="number" min={1} value={rule.priority} onChange={(event) => replaceRule(index, { ...rule, priority: Number(event.currentTarget.value) })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Когда срабатывает ветка</div>
              <InfectiousConditionEditor condition={rule.when} ruleSet={props.ruleSet} questions={props.questions} onChange={(when) => replaceRule(index, { ...rule, when })} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Какой маршрут показать врачу СМП</div>
              <ResultEditor result={rule.result} ruleSet={props.ruleSet} onChange={(result) => replaceRule(index, { ...rule, result })} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              <button type="button" onClick={() => moveRule(index, -1)} disabled={index === 0} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Выше</button>
              <button type="button" onClick={() => moveRule(index, 1)} disabled={index === props.ruleSet.rules.length - 1} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40">Ниже</button>
              <button type="button" onClick={() => props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, { ...rule, id: uniqueRuleId(props.ruleSet, `${rule.id}_copy`), priority: Math.max(...props.ruleSet.rules.map((item) => item.priority)) + 10 }] })} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs">Дублировать</button>
              <button type="button" disabled={props.ruleSet.rules.length <= 1} onClick={() => props.onChange({ ...props.ruleSet, rules: props.ruleSet.rules.filter((_, itemIndex) => itemIndex !== index) })} className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40">Удалить ветку</button>
            </div>
          </div>
        </LazyDetails>
      ))}
    </div>
  );
}

export default function RoadAccidentRuleBuilder(props: {
  ruleSet: RoutingRuleSetV1;
  questions: readonly RoutingQuestionDescriptor[];
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const issues = validateRoutingRuleSetForEditor(props.ruleSet, props.questions, "road_accident");
  return (
    <section className="space-y-4 rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Визуальный конструктор</div>
        <h3 className="mt-1 text-lg font-bold">ДТП / травма</h3>
        <p className="mt-1 text-sm text-neutral-600">Изменения относятся только к открытому черновику.</p>
      </div>
      {issues.length > 0 ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-semibold">Найдены ошибки логики: {issues.length}</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {issues.slice(0, 12).map((issue) => <li key={`${issue.path}-${issue.message}`}><span className="font-mono">{issue.path}</span>: {issue.message}</li>)}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Структура правил и результаты контрольных сочетаний корректны.</div>
      )}
      <FacilitiesEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      <TargetTablesEditor ruleSet={props.ruleSet} onChange={props.onChange} />
      <RulesEditor ruleSet={props.ruleSet} questions={props.questions} onChange={props.onChange} />
    </section>
  );
}
