import { type ReactNode, useState } from "react";
import {
  validateRoutingRuleSetForEditor,
  type RoutingProfileId,
  type RoutingQuestionDescriptor,
  type RoutingRuleSetV1,
  type RoutingRuleV1,
  type RoutingTemplateV1,
} from "../routing/index.js";
import { InfectiousConditionEditor } from "./InfectiousRuleBuilder.js";

type Facility = Record<string, RoutingTemplateV1> & {
  name: string;
  address: string;
};
type TargetTableMode = {
  catalogId: string;
  label: string;
  key: RoutingTemplateV1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: RoutingTemplateV1): Record<string, RoutingTemplateV1> {
  return isRecord(value) ? value as Record<string, RoutingTemplateV1> : {};
}

function facility(value: RoutingTemplateV1 | undefined): Facility | null {
  if (!isRecord(value)) return null;
  const item = value as Record<string, unknown>;
  return typeof item.name === "string" && typeof item.address === "string"
    ? item as Facility
    : null;
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function replaceMatching(value: RoutingTemplateV1, previous: RoutingTemplateV1, next: RoutingTemplateV1): RoutingTemplateV1 {
  if (deepEqual(value, previous)) return next;
  if (Array.isArray(value)) return value.map((item) => replaceMatching(item, previous, next));
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMatching(item as RoutingTemplateV1, previous, next)]));
}

function facilityReference(id: string, catalogId = "facilities"): RoutingTemplateV1 {
  return { $catalog: catalogId, key: id };
}

function facilityKey(value: RoutingTemplateV1 | undefined, facilities: Readonly<Record<string, RoutingTemplateV1>>, catalogId = "facilities"): string | undefined {
  if (isRecord(value)) {
    const item = value as Record<string, unknown>;
    if (item.$catalog === catalogId && typeof item.key === "string") return facilities[item.key] ? item.key : undefined;
  }
  return Object.entries(facilities).find(([, candidate]) => deepEqual(candidate, value))?.[0];
}

function updateFacility(
  ruleSet: RoutingRuleSetV1,
  id: string,
  next: Facility,
  facilityCatalogId = "facilities",
  mirrorFields: Readonly<Record<string, string>> = {},
): RoutingRuleSetV1 {
  const facilities = ruleSet.catalogs[facilityCatalogId] ?? {};
  const previous = facilities[id];
  const catalogs = Object.fromEntries(
    Object.entries(ruleSet.catalogs).map(([catalogName, catalog]) => [
      catalogName,
      Object.fromEntries(Object.entries(catalog).map(([key, value]) => [
        key,
        catalogName === facilityCatalogId && key === id
          ? next
          : previous === undefined ? value : replaceMatching(value, previous, next),
      ])),
    ]),
  );
  catalogs[facilityCatalogId] = { ...(catalogs[facilityCatalogId] ?? facilities), [id]: next };
  Object.entries(mirrorFields).forEach(([facilityField, mirrorCatalogId]) => {
    const value = next[facilityField];
    if (typeof value === "string") {
      catalogs[mirrorCatalogId] = {
        ...(catalogs[mirrorCatalogId] ?? {}),
        [id]: value,
      };
    }
  });
  return { ...ruleSet, catalogs };
}

function LazyDetails(props: { summary: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={props.className}><summary className="cursor-pointer">{props.summary}</summary>{open ? props.children : null}</details>;
}

function FacilitiesEditor(props: { ruleSet: RoutingRuleSetV1; onChange: (ruleSet: RoutingRuleSetV1) => void; includeId?: boolean; catalogId?: string; mirrorFields?: Readonly<Record<string, string>> }) {
  const catalogId = props.catalogId ?? "facilities";
  const facilities = props.ruleSet.catalogs[catalogId] ?? {};
  const [newId, setNewId] = useState("");
  return (
    <LazyDetails className="rounded-2xl border border-neutral-200 p-4" summary={<span className="font-semibold">Медицинские организации ({Object.keys(facilities).length})</span>}>
      <div className="mt-3 space-y-3">
        {Object.entries(facilities).map(([id, value]) => {
          const item = facility(value);
          if (!item) return null;
          const fields = ["name", "role", "address", "url"] as const;
          return (
            <div key={id} className="rounded-xl bg-neutral-50 p-3">
              <div className="text-xs font-medium text-neutral-500">{id}</div>
              {fields.map((field) => (
                <label key={field} className="mt-2 block text-xs text-neutral-600">
                  {field === "name" ? "Название" : field === "role" ? "Роль" : field === "address" ? "Город и адрес" : "Официальный сайт"}
                  <textarea
                    value={typeof item[field] === "string" ? item[field] as string : ""}
                    rows={field === "name" || field === "url" ? 1 : 2}
                    onChange={(event) => {
                      const next = { ...item, [field]: event.currentTarget.value };
                      if (field === "url" && !event.currentTarget.value) delete next.url;
                      props.onChange(updateFacility(props.ruleSet, id, next, catalogId, props.mirrorFields));
                    }}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={newId} onChange={(event) => setNewId(event.currentTarget.value)} placeholder="идентификатор новой организации" className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <button type="button" disabled={!newId.trim()} onClick={() => {
          const id = newId.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
          if (!id || facilities[id]) return;
          props.onChange(updateFacility(props.ruleSet, id, {
            ...(props.includeId ? { id } : {}),
            name: "Новая медицинская организация",
            role: "Укажите роль в маршруте",
            address: "Укажите город и адрес",
          }, catalogId, props.mirrorFields));
          setNewId("");
        }} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs disabled:opacity-40">Добавить</button>
      </div>
    </LazyDetails>
  );
}

function TargetTablesEditor(props: { ruleSet: RoutingRuleSetV1; tables: readonly TargetTableMode[]; onChange: (ruleSet: RoutingRuleSetV1) => void; facilityCatalogId?: string }) {
  const facilityCatalogId = props.facilityCatalogId ?? "facilities";
  const facilities = props.ruleSet.catalogs[facilityCatalogId] ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => facility(value));
  const editableTables = props.tables.filter((table) => table.catalogId !== facilityCatalogId);
  if (editableTables.length === 0) return null;
  return (
    <LazyDetails className="rounded-2xl border border-neutral-200 p-4" summary={<span className="font-semibold">Таблицы пунктов назначения</span>}>
      <p className="mt-2 text-xs text-neutral-600">В каждой строке выбирается конкретная организация для соответствующего сочетания ответов.</p>
      <div className="mt-3 space-y-3">
        {editableTables.map((table) => {
          const values = props.ruleSet.catalogs[table.catalogId] ?? {};
          return (
            <LazyDetails key={table.catalogId} className="rounded-xl border border-neutral-200 p-3" summary={<span className="text-sm font-medium">{table.label} ({Object.keys(values).length})</span>}>
              <div className="mt-3 max-h-[36rem] space-y-2 overflow-auto">
                {Object.entries(values).map(([key, value]) => {
                  const selected = facilityKey(value, facilities, facilityCatalogId);
                  return (
                    <label key={key} className="grid gap-2 rounded-lg bg-neutral-50 p-2 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <span className="break-words">{key}</span>
                      <select value={selected ?? "custom"} onChange={(event) => props.onChange({ ...props.ruleSet, catalogs: { ...props.ruleSet.catalogs, [table.catalogId]: { ...values, [key]: facilityReference(event.currentTarget.value, facilityCatalogId) } } })} className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm">
                        {!selected ? <option value="custom" disabled>Индивидуальное значение</option> : null}
                        {facilityEntries.map(([id, value]) => <option key={id} value={id}>{facility(value)?.name ?? id}</option>)}
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

function templateSummary(value: RoutingTemplateV1): string {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof (value as Record<string, unknown>).$catalog === "string") return `Значение из таблицы ${(value as Record<string, unknown>).$catalog}`;
  return "Динамический текст";
}

function ListEditor(props: { title: string; items: readonly RoutingTemplateV1[]; structured?: boolean; onChange: (items: RoutingTemplateV1[]) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{props.title}</div>
      <div className="space-y-2">
        {props.items.map((item, index) => {
          const itemRecord = isRecord(item) ? item as Record<string, unknown> : null;
          const editable = typeof item === "string"
            ? item
            : props.structured && typeof itemRecord?.label === "string"
              ? itemRecord.label
              : null;
          return (
            <div key={index} className="flex items-start gap-2">
              {editable !== null ? (
                <textarea value={editable} rows={2} onChange={(event) => props.onChange(props.items.map((current, itemIndex) => itemIndex === index ? (props.structured ? { ...(isRecord(current) ? current : {}), label: event.currentTarget.value } : event.currentTarget.value) as RoutingTemplateV1 : current))} className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm" />
              ) : (
                <div className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">{templateSummary(item)}<button type="button" className="ml-2 underline" onClick={() => props.onChange(props.items.map((current, itemIndex) => itemIndex === index ? (props.structured ? { label: "" } : "") : current))}>Заменить текстом</button></div>
              )}
              <button type="button" onClick={() => props.onChange(props.items.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-700 underline">Удалить</button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => props.onChange([...props.items, props.structured ? { label: "" } : ""])} className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs">+ Добавить пункт</button>
    </div>
  );
}

function targetMode(value: RoutingTemplateV1 | undefined, facilities: Readonly<Record<string, RoutingTemplateV1>>, tables: readonly TargetTableMode[], facilityCatalogId = "facilities"): string {
  if (!isRecord(value)) return "custom";
  const item = value as Record<string, unknown>;
  if (item.$catalog === facilityCatalogId && typeof item.key === "string" && facilities[item.key]) return `facility:${item.key}`;
  return typeof item.$catalog === "string" && tables.some((table) => table.catalogId === item.$catalog) ? `table:${item.$catalog}` : "custom";
}

function targetTemplate(mode: string, tables: readonly TargetTableMode[], facilityCatalogId = "facilities"): RoutingTemplateV1 | undefined {
  if (mode === "none") return undefined;
  if (mode.startsWith("facility:")) return facilityReference(mode.slice("facility:".length), facilityCatalogId);
  if (mode.startsWith("table:")) {
    const table = tables.find((item) => item.catalogId === mode.slice("table:".length));
    return table ? { $catalog: table.catalogId, key: table.key } : undefined;
  }
  return undefined;
}

function ResultEditor(props: {
  result: RoutingTemplateV1;
  ruleSet: RoutingRuleSetV1;
  tables: readonly TargetTableMode[];
  secondaryTargetField?: string;
  secondaryTargetLabelField?: string;
  listFields: readonly { field: string; label: string; structured?: boolean }[];
  facilityCatalogId?: string;
  primaryTargetField?: string;
  textFields?: readonly { field: string; label: string; rows?: number }[];
  onChange: (result: RoutingTemplateV1) => void;
}) {
  const result = record(props.result);
  const facilityCatalogId = props.facilityCatalogId ?? "facilities";
  const facilities = props.ruleSet.catalogs[facilityCatalogId] ?? {};
  const facilityEntries = Object.entries(facilities).filter(([, value]) => facility(value));
  function update(field: string, value: RoutingTemplateV1 | undefined) {
    const next = { ...result };
    if (value === undefined) delete next[field]; else next[field] = value;
    props.onChange(next);
  }
  const textFields = props.textFields ?? [
    { field: "title", label: "Название результата" },
    { field: "targetLabel", label: "Подпись пункта назначения" },
    { field: "urgency", label: "Срочность" },
    { field: "transport", label: "Порядок транспортировки", rows: 3 },
  ];
  const targetFields = [
    { field: props.primaryTargetField ?? "target", label: "Основной пункт назначения", optional: false },
    ...(props.secondaryTargetField ? [{ field: props.secondaryTargetField, label: "Следующий этап", optional: true }] : []),
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {textFields.map(({ field, label, rows }) => <label key={field} className={`text-xs text-neutral-600 ${rows && rows >= 3 ? "sm:col-span-2" : ""}`}>{label}<textarea value={typeof result[field] === "string" ? result[field] as string : ""} rows={rows ?? 2} onChange={(event) => update(field, event.currentTarget.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>)}
        {props.secondaryTargetLabelField ? <label className="text-xs text-neutral-600">Подпись следующего этапа<textarea value={typeof result[props.secondaryTargetLabelField] === "string" ? result[props.secondaryTargetLabelField] as string : ""} onChange={(event) => update(props.secondaryTargetLabelField!, event.currentTarget.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {targetFields.map((target) => {
          const mode = target.optional && result[target.field] === undefined ? "none" : targetMode(result[target.field], facilities, props.tables, facilityCatalogId);
          return <label key={target.field} className="text-xs text-neutral-600">{target.label}<select value={mode} onChange={(event) => update(target.field, targetTemplate(event.currentTarget.value, props.tables, facilityCatalogId))} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{target.optional ? <option value="none">Нет следующего этапа</option> : null}{mode === "custom" ? <option value="custom">Индивидуальный динамический шаблон</option> : null}<optgroup label="Конкретная организация">{facilityEntries.map(([id, value]) => <option key={id} value={`facility:${id}`}>{facility(value)?.name ?? id}</option>)}</optgroup>{!target.optional ? <optgroup label="Зависит от ответов">{props.tables.map((table) => <option key={table.catalogId} value={`table:${table.catalogId}`}>{table.label}</option>)}</optgroup> : null}</select></label>;
        })}
      </div>
      {props.listFields.map((item) => <ListEditor key={item.field} title={item.label} structured={item.structured} items={Array.isArray(result[item.field]) ? result[item.field] as RoutingTemplateV1[] : []} onChange={(items) => update(item.field, items)} />)}
    </div>
  );
}

function uniqueRuleId(ruleSet: RoutingRuleSetV1, base: string): string {
  const ids = new Set(ruleSet.rules.map((rule) => rule.id));
  if (!ids.has(base)) return base;
  let suffix = 2; while (ids.has(`${base}_${suffix}`)) suffix += 1; return `${base}_${suffix}`;
}

export default function FacilityRuleBuilder(props: {
  profileId: RoutingProfileId;
  title: string;
  ruleSet: RoutingRuleSetV1;
  questions: readonly RoutingQuestionDescriptor[];
  tables?: readonly TargetTableMode[];
  secondaryTargetField?: string;
  secondaryTargetLabelField?: string;
  listFields: readonly { field: string; label: string; structured?: boolean }[];
  newRuleSourcesStructured?: boolean;
  includeFacilityId?: boolean;
  facilityCatalogId?: string;
  facilityMirrorFields?: Readonly<Record<string, string>>;
  primaryTargetField?: string;
  resultTitleField?: string;
  textFields?: readonly { field: string; label: string; rows?: number }[];
  newRuleResult?: Readonly<Record<string, RoutingTemplateV1>>;
  onChange: (ruleSet: RoutingRuleSetV1) => void;
}) {
  const tables = props.tables ?? [];
  const facilityCatalogId = props.facilityCatalogId ?? "facilities";
  const issues = validateRoutingRuleSetForEditor(props.ruleSet, props.questions, props.profileId);
  function newRule(): RoutingRuleV1 {
    const question = props.questions[0];
    const option = question?.options?.[0];
    return {
      id: uniqueRuleId(props.ruleSet, "new_route"),
      priority: Math.max(0, ...props.ruleSet.rules.map((rule) => rule.priority)) + 10,
      when: question && option ? { op: "eq", field: question.id, value: option.value } : { op: "present", field: question?.id ?? "territory" },
      result: {
        title: "Новая маршрутная ветка",
        [props.primaryTargetField ?? "target"]: facilityReference(Object.keys(props.ruleSet.catalogs[facilityCatalogId] ?? {})[0] ?? "new_facility", facilityCatalogId),
        targetLabel: "Куда направить пациента",
        urgency: "По клиническим показаниям",
        transport: "Укажите порядок транспортировки.",
        ...Object.fromEntries(props.listFields.map((item) => [item.field, [item.structured ? { label: "Укажите официальный документ и точный пункт." } : "Укажите обязательный пункт."]])),
        ...(props.newRuleResult ?? {}),
      },
    };
  }
  function replaceRule(index: number, rule: RoutingRuleV1) {
    props.onChange({ ...props.ruleSet, rules: props.ruleSet.rules.map((item, itemIndex) => itemIndex === index ? rule : item) });
  }
  return (
    <section className="space-y-4 rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4">
      <div><div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Визуальный конструктор</div><h3 className="mt-1 text-lg font-bold">{props.title}</h3><p className="mt-1 text-sm text-neutral-600">Ответы врача выбирают первую подходящую ветку; результатом является медицинская организация и адрес.</p></div>
      {issues.length > 0 ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><div className="font-semibold">Ошибок логики: {issues.length}</div><ul className="mt-1 list-disc pl-5 text-xs">{issues.slice(0, 12).map((issue) => <li key={`${issue.path}-${issue.message}`}>{issue.path}: {issue.message}</li>)}</ul></div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Структура правил и результаты контрольных сочетаний корректны.</div>}
      <FacilitiesEditor ruleSet={props.ruleSet} includeId={props.includeFacilityId} catalogId={facilityCatalogId} mirrorFields={props.facilityMirrorFields} onChange={props.onChange} />
      <TargetTablesEditor ruleSet={props.ruleSet} tables={tables} facilityCatalogId={facilityCatalogId} onChange={props.onChange} />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2"><div><h4 className="font-semibold">Исполняемые маршрутные ветки ({props.ruleSet.rules.length})</h4><p className="text-xs text-neutral-600">Меньший приоритет срабатывает раньше.</p></div><button type="button" onClick={() => props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, newRule()] })} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-medium text-white">+ Добавить ветку</button></div>
        {props.ruleSet.rules.map((rule, index) => (
          <LazyDetails key={`${rule.id}-${index}`} className="rounded-2xl border border-neutral-200 bg-white p-4" summary={<><span className="font-semibold">{rule.priority}. {typeof record(rule.result)[props.resultTitleField ?? "title"] === "string" ? record(rule.result)[props.resultTitleField ?? "title"] as string : rule.id}</span><span className="mt-1 block text-xs text-neutral-500">{rule.id}</span></>}>
            <div className="mt-4 space-y-5 border-t border-neutral-100 pt-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><label className="text-xs">Идентификатор<input value={rule.id} onChange={(event) => replaceRule(index, { ...rule, id: event.currentTarget.value })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label><label className="text-xs">Приоритет<input type="number" min={1} value={rule.priority} onChange={(event) => replaceRule(index, { ...rule, priority: Number(event.currentTarget.value) })} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label></div>
              <div><div className="mb-2 text-sm font-medium">Когда срабатывает ветка</div><InfectiousConditionEditor condition={rule.when} ruleSet={props.ruleSet} questions={props.questions} onChange={(when) => replaceRule(index, { ...rule, when })} /></div>
              <div><div className="mb-2 text-sm font-medium">Что показать врачу СМП</div><ResultEditor result={rule.result} ruleSet={props.ruleSet} tables={tables} facilityCatalogId={facilityCatalogId} primaryTargetField={props.primaryTargetField} textFields={props.textFields} secondaryTargetField={props.secondaryTargetField} secondaryTargetLabelField={props.secondaryTargetLabelField} listFields={props.listFields} onChange={(result) => replaceRule(index, { ...rule, result })} /></div>
              <div className="flex gap-2 border-t pt-3"><button type="button" onClick={() => props.onChange({ ...props.ruleSet, rules: [...props.ruleSet.rules, { ...rule, id: uniqueRuleId(props.ruleSet, `${rule.id}_copy`), priority: Math.max(...props.ruleSet.rules.map((item) => item.priority)) + 10 }] })} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs">Дублировать</button><button type="button" disabled={props.ruleSet.rules.length <= 1} onClick={() => props.onChange({ ...props.ruleSet, rules: props.ruleSet.rules.filter((_, itemIndex) => itemIndex !== index) })} className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40">Удалить ветку</button></div>
            </div>
          </LazyDetails>
        ))}
      </div>
    </section>
  );
}
