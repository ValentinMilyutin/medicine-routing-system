import type { RoutingProfileId } from "./types.js";

export const ROUTING_RULES_SCHEMA_VERSION = 1 as const;

export type RoutingJsonPrimitive = string | number | boolean | null;

export type RoutingConditionV1 =
  | {
      op: "eq";
      field: string;
      value: RoutingJsonPrimitive;
    }
  | {
      op: "neq";
      field: string;
      value: RoutingJsonPrimitive;
    }
  | {
      op: "present";
      field: string;
    }
  | {
      op: "non_empty";
      field: string;
    }
  | {
      op: "in";
      field: string;
      values: readonly RoutingJsonPrimitive[];
    }
  | {
      op: "includes";
      field: string;
      value: RoutingJsonPrimitive;
    }
  | {
      op: "all";
      conditions: readonly RoutingConditionV1[];
    }
  | {
      op: "any";
      conditions: readonly RoutingConditionV1[];
    }
  | {
      op: "not";
      condition: RoutingConditionV1;
    };

export type RoutingFieldTemplateV1 = {
  $field: string;
};

export type RoutingCatalogTemplateV1 = {
  $catalog: string;
  key: RoutingTemplateV1;
};

export type RoutingConcatTemplateV1 = {
  $concat: readonly RoutingTemplateV1[];
};

export type RoutingJoinCatalogTemplateV1 = {
  $joinCatalog: {
    field: string;
    catalog: string;
    exclude?: readonly RoutingJsonPrimitive[];
    separator: string;
    prefix?: string;
    suffix?: string;
  };
};

export type RoutingTemplateObjectV1 = {
  readonly [key: string]: RoutingTemplateV1;
};

export type RoutingTemplateV1 =
  | RoutingJsonPrimitive
  | RoutingFieldTemplateV1
  | RoutingCatalogTemplateV1
  | RoutingConcatTemplateV1
  | RoutingJoinCatalogTemplateV1
  | RoutingTemplateObjectV1
  | readonly RoutingTemplateV1[];

export type RoutingRuleV1 = {
  id: string;
  priority: number;
  when: RoutingConditionV1;
  result: RoutingTemplateV1;
};

export type RoutingRuleSetV1 = {
  schemaVersion: typeof ROUTING_RULES_SCHEMA_VERSION;
  id: string;
  profileId: RoutingProfileId;
  catalogs: Readonly<
    Record<string, Readonly<Record<string, RoutingTemplateV1>>>
  >;
  rules: readonly RoutingRuleV1[];
};

export type RoutingRuleEvaluationV1 = {
  ruleId: string;
  priority: number;
  result: RoutingTemplateV1;
};

export type RoutingRuleSetValidationIssue = {
  path: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldValue(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, input);
}

export function matchesRoutingConditionV1(
  condition: RoutingConditionV1,
  input: unknown,
): boolean {
  if (condition.op === "all" || condition.op === "any") {
    return condition.op === "all"
      ? condition.conditions.every((item) =>
          matchesRoutingConditionV1(item, input),
        )
      : condition.conditions.some((item) =>
          matchesRoutingConditionV1(item, input),
        );
  }
  if (condition.op === "not") {
    return !matchesRoutingConditionV1(condition.condition, input);
  }

  const value = fieldValue(input, condition.field);
  if (condition.op === "present") {
    return value !== undefined && value !== null && value !== "";
  }
  if (condition.op === "non_empty") {
    return (
      (typeof value === "string" && value.length > 0) ||
      (Array.isArray(value) && value.length > 0)
    );
  }
  if (condition.op === "eq") return Object.is(value, condition.value);
  if (condition.op === "neq") return !Object.is(value, condition.value);
  if (condition.op === "in") {
    return condition.values.some((candidate) => Object.is(value, candidate));
  }
  return (
    Array.isArray(value) &&
    value.some((candidate) => Object.is(candidate, condition.value))
  );
}

function isFieldTemplate(value: unknown): value is RoutingFieldTemplateV1 {
  return isRecord(value) && typeof value.$field === "string";
}

function isCatalogTemplate(
  value: unknown,
): value is RoutingCatalogTemplateV1 {
  return (
    isRecord(value) &&
    typeof value.$catalog === "string" &&
    "key" in value
  );
}

function isConcatTemplate(value: unknown): value is RoutingConcatTemplateV1 {
  return isRecord(value) && Array.isArray(value.$concat);
}

function isJoinCatalogTemplate(
  value: unknown,
): value is RoutingJoinCatalogTemplateV1 {
  return isRecord(value) && isRecord(value.$joinCatalog);
}

function renderTemplateV1(
  template: RoutingTemplateV1,
  input: unknown,
  catalogs: RoutingRuleSetV1["catalogs"],
  depth: number,
): RoutingTemplateV1 {
  if (depth > 30) {
    throw new Error("Превышена допустимая глубина шаблона rules_v1.");
  }
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
      renderTemplateV1(item, input, catalogs, depth + 1),
    );
  }
  if (isFieldTemplate(template)) {
    const value = fieldValue(input, template.$field);
    if (
      value === undefined ||
      typeof value === "function" ||
      typeof value === "symbol" ||
      typeof value === "bigint"
    ) {
      throw new Error(`Поле ${template.$field} отсутствует или не является JSON-значением.`);
    }
    return value as RoutingTemplateV1;
  }
  if (isCatalogTemplate(template)) {
    const key = renderTemplateV1(template.key, input, catalogs, depth + 1);
    if (typeof key !== "string") {
      throw new Error(`Ключ каталога ${template.$catalog} должен быть строкой.`);
    }
    const catalog = catalogs[template.$catalog];
    const value = catalog?.[key];
    if (value === undefined) {
      throw new Error(`В каталоге ${template.$catalog} нет значения ${key}.`);
    }
    return renderTemplateV1(value, input, catalogs, depth + 1);
  }
  if (isConcatTemplate(template)) {
    return template.$concat
      .map((item) => renderTemplateV1(item, input, catalogs, depth + 1))
      .map((item) => {
        if (
          typeof item !== "string" &&
          typeof item !== "number" &&
          typeof item !== "boolean"
        ) {
          throw new Error("$concat поддерживает только строковые и скалярные значения.");
        }
        return String(item);
      })
      .join("");
  }
  if (isJoinCatalogTemplate(template)) {
    const directive = template.$joinCatalog;
    const values = fieldValue(input, directive.field);
    if (!Array.isArray(values)) {
      throw new Error(`Поле ${directive.field} должно быть массивом для $joinCatalog.`);
    }
    const catalog = catalogs[directive.catalog];
    if (!catalog) {
      throw new Error(`Каталог ${directive.catalog} не найден.`);
    }
    const excluded = directive.exclude ?? [];
    const joined = values
      .filter(
        (value) =>
          !excluded.some((excludedValue) => Object.is(value, excludedValue)),
      )
      .map((value) => {
        const key = String(value);
        const templateValue = catalog[key];
        if (templateValue === undefined) return key;
        const rendered = renderTemplateV1(
          templateValue,
          input,
          catalogs,
          depth + 1,
        );
        if (
          typeof rendered !== "string" &&
          typeof rendered !== "number" &&
          typeof rendered !== "boolean"
        ) {
          throw new Error(`Каталог ${directive.catalog} должен содержать скаляры.`);
        }
        return String(rendered);
      })
      .join(directive.separator);
    return `${directive.prefix ?? ""}${joined}${directive.suffix ?? ""}`;
  }

  return Object.fromEntries(
    Object.entries(template).map(([key, value]) => [
      key,
      renderTemplateV1(value, input, catalogs, depth + 1),
    ]),
  );
}

export function evaluateRoutingRuleSetV1(
  ruleSet: RoutingRuleSetV1,
  input: unknown,
): RoutingRuleEvaluationV1 | null {
  const rule = [...ruleSet.rules]
    .sort((left, right) => left.priority - right.priority)
    .find((candidate) => matchesRoutingConditionV1(candidate.when, input));

  if (!rule) return null;
  return {
    ruleId: rule.id,
    priority: rule.priority,
    result: renderTemplateV1(rule.result, input, ruleSet.catalogs, 0),
  };
}

function isJsonPrimitive(value: unknown): value is RoutingJsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function validateConditionV1(
  value: unknown,
  path: string,
  issues: RoutingRuleSetValidationIssue[],
  depth: number,
) {
  if (depth > 20) {
    issues.push({ path, message: "Слишком глубокое условие." });
    return;
  }
  if (!isRecord(value) || typeof value.op !== "string") {
    issues.push({ path, message: "Условие должно быть объектом с оператором." });
    return;
  }

  if (value.op === "all" || value.op === "any") {
    if (!Array.isArray(value.conditions) || value.conditions.length === 0) {
      issues.push({ path: `${path}.conditions`, message: "Нужен непустой список условий." });
      return;
    }
    value.conditions.forEach((condition, index) =>
      validateConditionV1(
        condition,
        `${path}.conditions[${index}]`,
        issues,
        depth + 1,
      ),
    );
    return;
  }

  if (value.op === "not") {
    validateConditionV1(value.condition, `${path}.condition`, issues, depth + 1);
    return;
  }

  if (typeof value.field !== "string" || value.field.trim().length === 0) {
    issues.push({ path: `${path}.field`, message: "Нужно указать поле состояния." });
  }
  if (value.op === "present" || value.op === "non_empty") return;

  if (value.op === "eq" || value.op === "neq" || value.op === "includes") {
    if (!isJsonPrimitive(value.value)) {
      issues.push({ path: `${path}.value`, message: "Значение должно быть JSON-скаляром." });
    }
    return;
  }

  if (value.op === "in") {
    if (
      !Array.isArray(value.values) ||
      value.values.length === 0 ||
      !value.values.every(isJsonPrimitive)
    ) {
      issues.push({ path: `${path}.values`, message: "Нужен непустой список JSON-скаляров." });
    }
    return;
  }

  issues.push({ path: `${path}.op`, message: `Неизвестный оператор ${value.op}.` });
}

export function validateRoutingConditionV1(
  value: unknown,
  path = "condition",
): RoutingRuleSetValidationIssue[] {
  const issues: RoutingRuleSetValidationIssue[] = [];
  validateConditionV1(value, path, issues, 0);
  return issues;
}

function validateTemplateV1(
  value: unknown,
  path: string,
  issues: RoutingRuleSetValidationIssue[],
  depth: number,
) {
  if (depth > 30) {
    issues.push({ path, message: "Слишком глубокий шаблон результата." });
    return;
  }
  if (isJsonPrimitive(value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateTemplateV1(item, `${path}[${index}]`, issues, depth + 1),
    );
    return;
  }
  if (!isRecord(value)) {
    issues.push({ path, message: "Шаблон должен содержать только JSON-значения." });
    return;
  }
  if ("$field" in value) {
    if (typeof value.$field !== "string" || value.$field.length === 0) {
      issues.push({ path: `${path}.$field`, message: "Нужно указать поле состояния." });
    }
    return;
  }
  if ("$catalog" in value) {
    if (typeof value.$catalog !== "string" || value.$catalog.length === 0) {
      issues.push({ path: `${path}.$catalog`, message: "Нужно указать каталог." });
    }
    if (!("key" in value)) {
      issues.push({ path: `${path}.key`, message: "Нужно указать ключ каталога." });
    } else {
      validateTemplateV1(value.key, `${path}.key`, issues, depth + 1);
    }
    return;
  }
  if ("$concat" in value) {
    if (!Array.isArray(value.$concat) || value.$concat.length === 0) {
      issues.push({ path: `${path}.$concat`, message: "Нужен непустой список частей строки." });
    } else {
      value.$concat.forEach((item, index) =>
        validateTemplateV1(
          item,
          `${path}.$concat[${index}]`,
          issues,
          depth + 1,
        ),
      );
    }
    return;
  }
  if ("$joinCatalog" in value) {
    if (!isRecord(value.$joinCatalog)) {
      issues.push({
        path: `${path}.$joinCatalog`,
        message: "Директива должна быть объектом.",
      });
      return;
    }
    const directive = value.$joinCatalog;
    if (typeof directive.field !== "string" || directive.field.length === 0) {
      issues.push({ path: `${path}.$joinCatalog.field`, message: "Нужно указать поле-массив." });
    }
    if (typeof directive.catalog !== "string" || directive.catalog.length === 0) {
      issues.push({ path: `${path}.$joinCatalog.catalog`, message: "Нужно указать каталог." });
    }
    if (typeof directive.separator !== "string") {
      issues.push({ path: `${path}.$joinCatalog.separator`, message: "Нужно указать разделитель." });
    }
    if (directive.prefix !== undefined && typeof directive.prefix !== "string") {
      issues.push({ path: `${path}.$joinCatalog.prefix`, message: "Префикс должен быть строкой." });
    }
    if (directive.suffix !== undefined && typeof directive.suffix !== "string") {
      issues.push({ path: `${path}.$joinCatalog.suffix`, message: "Суффикс должен быть строкой." });
    }
    if (
      directive.exclude !== undefined &&
      (!Array.isArray(directive.exclude) ||
        !directive.exclude.every(isJsonPrimitive))
    ) {
      issues.push({ path: `${path}.$joinCatalog.exclude`, message: "Исключения должны быть JSON-скалярами." });
    }
    return;
  }

  Object.entries(value).forEach(([key, item]) => {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      issues.push({ path: `${path}.${key}`, message: "Запрещённое имя свойства." });
      return;
    }
    validateTemplateV1(item, `${path}.${key}`, issues, depth + 1);
  });
}

export function validateRoutingRuleSetV1(
  value: unknown,
): RoutingRuleSetValidationIssue[] {
  const issues: RoutingRuleSetValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "$", message: "Набор правил должен быть объектом." }];
  }
  if (value.schemaVersion !== ROUTING_RULES_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `Поддерживается только rules_v1 версии ${ROUTING_RULES_SCHEMA_VERSION}.`,
    });
  }
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ path: "id", message: "Нужен идентификатор набора правил." });
  }
  if (typeof value.profileId !== "string" || value.profileId.length === 0) {
    issues.push({ path: "profileId", message: "Нужен идентификатор профиля." });
  }
  if (!isRecord(value.catalogs)) {
    issues.push({ path: "catalogs", message: "Каталоги должны быть объектом." });
  } else {
    Object.entries(value.catalogs).forEach(([catalogId, catalog]) => {
      if (!isRecord(catalog)) {
        issues.push({
          path: `catalogs.${catalogId}`,
          message: "Каталог должен быть объектом.",
        });
        return;
      }
      Object.entries(catalog).forEach(([key, item]) =>
        validateTemplateV1(
          item,
          `catalogs.${catalogId}.${key}`,
          issues,
          0,
        ),
      );
    });
  }

  const rules = Array.isArray(value.rules) ? value.rules : [];
  if (!Array.isArray(value.rules) || rules.length === 0) {
    issues.push({ path: "rules", message: "Нужна хотя бы одна ветка." });
  }

  const ids = new Set<string>();
  const priorities = new Set<number>();
  rules.forEach((rule, index) => {
    if (!isRecord(rule)) {
      issues.push({
        path: `rules[${index}]`,
        message: "Ветка должна быть объектом.",
      });
      return;
    }
    if (typeof rule.id !== "string" || rule.id.trim().length === 0) {
      issues.push({
        path: `rules[${index}].id`,
        message: "Нужен идентификатор ветки.",
      });
    } else if (ids.has(rule.id)) {
      issues.push({
        path: `rules[${index}].id`,
        message: `Повторяется идентификатор ${rule.id}.`,
      });
    } else {
      ids.add(rule.id);
    }
    if (
      typeof rule.priority !== "number" ||
      !Number.isInteger(rule.priority) ||
      rule.priority < 1
    ) {
      issues.push({
        path: `rules[${index}].priority`,
        message: "Приоритет должен быть положительным целым числом.",
      });
    } else if (priorities.has(rule.priority)) {
      issues.push({
        path: `rules[${index}].priority`,
        message: `Повторяется приоритет ${rule.priority}.`,
      });
    } else {
      priorities.add(rule.priority);
    }
    validateConditionV1(rule.when, `rules[${index}].when`, issues, 0);
    if (!("result" in rule)) {
      issues.push({
        path: `rules[${index}].result`,
        message: "У ветки должен быть шаблон результата.",
      });
    } else {
      validateTemplateV1(rule.result, `rules[${index}].result`, issues, 0);
    }
  });
  return issues;
}

export function assertRoutingRuleSetV1(
  value: unknown,
): asserts value is RoutingRuleSetV1 {
  const issues = validateRoutingRuleSetV1(value);
  if (issues.length > 0) {
    throw new Error(
      `Некорректный набор rules_v1:\n${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
}

export function parseRoutingRuleSetV1(serialized: string): RoutingRuleSetV1 {
  const value: unknown = JSON.parse(serialized);
  assertRoutingRuleSetV1(value);
  return value;
}
