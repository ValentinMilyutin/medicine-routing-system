import type {
  RoutingBranchDescriptor,
  RoutingProfileContentDocument,
  RoutingQuestionDescriptor,
  RoutingSourceDescriptor,
} from "./content-schema.js";
import type {
  RoutingConditionV1,
  RoutingRuleSetV1,
} from "./rules-v1.js";

export type RoutingVersionChangeCategory =
  | "routing"
  | "questions"
  | "sources"
  | "text";

export type RoutingVersionChange = {
  id: string;
  category: RoutingVersionChangeCategory;
  kind: "added" | "removed" | "changed";
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  before?: string;
  after?: string;
};

export type RoutingVersionDiff = {
  changes: RoutingVersionChange[];
  counts: Record<RoutingVersionChangeCategory, number>;
  highImpactCount: number;
  total: number;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

function valueLabel(value: unknown): string {
  if (typeof value === "string") return `«${value}»`;
  if (value === true) return "Да";
  if (value === false) return "Нет";
  if (value === null) return "пусто";
  return String(value);
}

function conditionLabel(condition: RoutingConditionV1): string {
  if (condition.op === "all" || condition.op === "any") {
    const separator = condition.op === "all" ? " И " : " ИЛИ ";
    return condition.conditions
      .map((child) => `(${conditionLabel(child)})`)
      .join(separator);
  }
  if (condition.op === "not") {
    return `НЕ (${conditionLabel(condition.condition)})`;
  }
  if (condition.op === "present") return `${condition.field}: заполнено`;
  if (condition.op === "non_empty") return `${condition.field}: список не пуст`;
  if (condition.op === "in") {
    return `${condition.field}: один из ${condition.values.map(valueLabel).join(", ")}`;
  }
  if (condition.op === "includes") {
    return `${condition.field}: содержит ${valueLabel(condition.value)}`;
  }
  return `${condition.field} ${condition.op === "eq" ? "=" : "≠"} ${valueLabel(condition.value)}`;
}

function questionLabel(question: RoutingQuestionDescriptor): string {
  const options = question.options?.length ?? 0;
  return `${question.label}; тип: ${question.kind}; обязательность: ${question.requirement}; вариантов ответа: ${options}`;
}

function changedQuestionFields(
  before: RoutingQuestionDescriptor,
  after: RoutingQuestionDescriptor,
): string[] {
  const fields: Array<[keyof RoutingQuestionDescriptor, string]> = [
    ["label", "название"],
    ["kind", "тип ответа"],
    ["requirement", "обязательность"],
    ["helpText", "подсказка"],
    ["placeholder", "текст поля"],
    ["visibility", "условие показа"],
    ["options", "варианты ответа"],
  ];
  return fields
    .filter(([field]) => !same(before[field], after[field]))
    .map(([, label]) => label);
}

function branchName(
  ruleId: string,
  before: RoutingProfileContentDocument,
  after: RoutingProfileContentDocument,
): string {
  return (
    after.branches.find((branch) => branch.id === ruleId)?.title ??
    before.branches.find((branch) => branch.id === ruleId)?.title ??
    ruleId
  );
}

function addQuestionChanges(
  changes: RoutingVersionChange[],
  before: RoutingProfileContentDocument,
  after: RoutingProfileContentDocument,
) {
  const beforeById = new Map(before.questions.map((item) => [item.id, item]));
  const afterById = new Map(after.questions.map((item) => [item.id, item]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  ids.forEach((id) => {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    if (!previous && next) {
      changes.push({
        id: `question:${id}`,
        category: "questions",
        kind: "added",
        impact: "medium",
        title: `Добавлен вопрос «${next.label}»`,
        description: "Новый вопрос появился в опроснике.",
        after: questionLabel(next),
      });
    } else if (previous && !next) {
      changes.push({
        id: `question:${id}`,
        category: "questions",
        kind: "removed",
        impact: "high",
        title: `Удалён вопрос «${previous.label}»`,
        description: "Вопрос больше не участвует в опроснике.",
        before: questionLabel(previous),
      });
    } else if (previous && next && !same(previous, next)) {
      const fields = changedQuestionFields(previous, next);
      changes.push({
        id: `question:${id}`,
        category: "questions",
        kind: "changed",
        impact:
          fields.includes("условие показа") ||
          fields.includes("варианты ответа") ||
          fields.includes("тип ответа")
            ? "high"
            : "medium",
        title: `Изменён вопрос «${next.label}»`,
        description: `Изменены: ${fields.join(", ")}.`,
        before: questionLabel(previous),
        after: questionLabel(next),
      });
    }
  });
}

function addRuleChanges(
  changes: RoutingVersionChange[],
  beforeDocument: RoutingProfileContentDocument,
  afterDocument: RoutingProfileContentDocument,
  before: RoutingRuleSetV1,
  after: RoutingRuleSetV1,
) {
  const beforeById = new Map(before.rules.map((item) => [item.id, item]));
  const afterById = new Map(after.rules.map((item) => [item.id, item]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  ids.forEach((id) => {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    const name = branchName(id, beforeDocument, afterDocument);
    if (!previous && next) {
      changes.push({
        id: `rule:${id}`,
        category: "routing",
        kind: "added",
        impact: "high",
        title: `Добавлена ветка «${name}»`,
        description: "Появился новый возможный результат маршрутизации.",
        after: `Приоритет ${next.priority}; ${conditionLabel(next.when)}`,
      });
      return;
    }
    if (previous && !next) {
      changes.push({
        id: `rule:${id}`,
        category: "routing",
        kind: "removed",
        impact: "high",
        title: `Удалена ветка «${name}»`,
        description: "Ранее возможный результат маршрутизации удалён.",
        before: `Приоритет ${previous.priority}; ${conditionLabel(previous.when)}`,
      });
      return;
    }
    if (!previous || !next) return;
    if (!same(previous.when, next.when) || previous.priority !== next.priority) {
      changes.push({
        id: `rule-condition:${id}`,
        category: "routing",
        kind: "changed",
        impact: "high",
        title: `Изменено условие ветки «${name}»`,
        description: "Изменились ответы, при которых выбирается эта ветка, или её приоритет.",
        before: `Приоритет ${previous.priority}; ${conditionLabel(previous.when)}`,
        after: `Приоритет ${next.priority}; ${conditionLabel(next.when)}`,
      });
    }
    if (!same(previous.result, next.result)) {
      changes.push({
        id: `rule-result:${id}`,
        category: "routing",
        kind: "changed",
        impact: "high",
        title: `Изменён результат ветки «${name}»`,
        description: "Изменилось содержимое конечного маршрута, действий или пункта назначения.",
      });
    }
  });
}

function addCatalogChanges(
  changes: RoutingVersionChange[],
  before: RoutingRuleSetV1,
  after: RoutingRuleSetV1,
) {
  const catalogIds = new Set([
    ...Object.keys(before.catalogs),
    ...Object.keys(after.catalogs),
  ]);
  catalogIds.forEach((catalogId) => {
    const previous = before.catalogs[catalogId] ?? {};
    const next = after.catalogs[catalogId] ?? {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    keys.forEach((key) => {
      if (same(previous[key], next[key])) return;
      const kind =
        previous[key] === undefined
          ? "added"
          : next[key] === undefined
            ? "removed"
            : "changed";
      changes.push({
        id: `catalog:${catalogId}:${key}`,
        category: "routing",
        kind,
        impact: "high",
        title: `Изменён справочник маршрута: ${key}`,
        description: `Изменение в разделе «${catalogId}» может влиять на отображаемый пункт назначения или текст результата.`,
        before:
          previous[key] === undefined ? undefined : JSON.stringify(previous[key]),
        after: next[key] === undefined ? undefined : JSON.stringify(next[key]),
      });
    });
  });
}

function sourceLabel(source: RoutingSourceDescriptor): string {
  return `${source.label}; статус: ${source.verificationStatus}${source.url ? `; ${source.url}` : ""}`;
}

function addSourceChanges(
  changes: RoutingVersionChange[],
  before: RoutingProfileContentDocument,
  after: RoutingProfileContentDocument,
) {
  const beforeById = new Map(before.sources.map((item) => [item.id, item]));
  const afterById = new Map(after.sources.map((item) => [item.id, item]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  ids.forEach((id) => {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    if (previous && next && same(previous, next)) return;
    const kind = !previous ? "added" : !next ? "removed" : "changed";
    changes.push({
      id: `source:${id}`,
      category: "sources",
      kind,
      impact: "medium",
      title: `${kind === "added" ? "Добавлен" : kind === "removed" ? "Удалён" : "Изменён"} источник «${next?.label ?? previous?.label ?? id}»`,
      description: "Изменились нормативное основание, ссылка или статус его проверки.",
      before: previous ? sourceLabel(previous) : undefined,
      after: next ? sourceLabel(next) : undefined,
    });
  });
}

function branchLabel(branch: RoutingBranchDescriptor): string {
  return `${branch.title}; ${branch.conditionSummary}; ${branch.outcomeSummary}`;
}

function addTextChanges(
  changes: RoutingVersionChange[],
  before: RoutingProfileContentDocument,
  after: RoutingProfileContentDocument,
) {
  const beforeById = new Map(before.branches.map((item) => [item.id, item]));
  const afterById = new Map(after.branches.map((item) => [item.id, item]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  ids.forEach((id) => {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    if (!previous || !next || same(previous, next)) return;
    changes.push({
      id: `branch-description:${id}`,
      category: "text",
      kind: "changed",
      impact: same(previous.sourceIds, next.sourceIds) ? "low" : "medium",
      title: `Изменено описание ветки «${next.title}»`,
      description: "Изменены пояснение условия, итоговое описание или нормативные ссылки ветки.",
      before: branchLabel(previous),
      after: branchLabel(next),
    });
  });
}

export function compareRoutingVersions(
  beforeDocument: RoutingProfileContentDocument,
  beforeRuleSet: RoutingRuleSetV1,
  afterDocument: RoutingProfileContentDocument,
  afterRuleSet: RoutingRuleSetV1,
): RoutingVersionDiff {
  const changes: RoutingVersionChange[] = [];
  addQuestionChanges(changes, beforeDocument, afterDocument);
  addRuleChanges(
    changes,
    beforeDocument,
    afterDocument,
    beforeRuleSet,
    afterRuleSet,
  );
  addCatalogChanges(changes, beforeRuleSet, afterRuleSet);
  addSourceChanges(changes, beforeDocument, afterDocument);
  addTextChanges(changes, beforeDocument, afterDocument);
  const counts: RoutingVersionDiff["counts"] = {
    routing: 0,
    questions: 0,
    sources: 0,
    text: 0,
  };
  changes.forEach((change) => {
    counts[change.category] += 1;
  });
  return {
    changes,
    counts,
    highImpactCount: changes.filter((change) => change.impact === "high").length,
    total: changes.length,
  };
}
