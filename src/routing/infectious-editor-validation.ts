import { INFECTIOUS_TERRITORIES_V1 } from "./infectious-rules-v1.js";
import type { RoutingQuestionDescriptor } from "./content-schema.js";
import { buildRoutingQuestionnaireScenarioMatrix } from "./questionnaire-analysis.js";
import {
  evaluateRoutingRuleSetV1,
  validateRoutingRuleSetV1,
  type RoutingConditionV1,
  type RoutingRuleSetV1,
  type RoutingRuleSetValidationIssue,
  type RoutingTemplateV1,
} from "./rules-v1.js";

type Scenario = {
  id: string;
  state: Record<string, unknown>;
};

const DEFAULT_ALLOWED_FIELDS = new Set([
  "territory",
  "infectionGroup",
  "lifeThreats",
  "admissionCriteria",
  "transportable",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateConditionFields(
  condition: RoutingConditionV1,
  path: string,
  issues: RoutingRuleSetValidationIssue[],
  questions?: readonly RoutingQuestionDescriptor[],
) {
  if (condition.op === "all" || condition.op === "any") {
    condition.conditions.forEach((child, index) =>
      validateConditionFields(
        child,
        `${path}.conditions[${index}]`,
        issues,
        questions,
      ),
    );
    return;
  }
  if (condition.op === "not") {
    validateConditionFields(
      condition.condition,
      `${path}.condition`,
      issues,
      questions,
    );
    return;
  }
  const question = questions?.find((item) => item.id === condition.field);
  const allowed = questions
    ? questions.some((item) => item.id === condition.field)
    : DEFAULT_ALLOWED_FIELDS.has(condition.field);
  if (!allowed) {
    issues.push({
      path: `${path}.field`,
      message: `Поле ${condition.field} не существует в инфекционном опроснике.`,
    });
  }
  const arrayField = question
    ? question.kind === "multiple_choice"
    : condition.field === "lifeThreats" ||
      condition.field === "admissionCriteria";
  if (arrayField && condition.op !== "includes" && condition.op !== "non_empty") {
    issues.push({
      path: `${path}.op`,
      message: `Для поля ${condition.field} разрешены только «список содержит» и «список не пуст».`,
    });
  }
  if (
    !arrayField &&
    (condition.op === "includes" || condition.op === "non_empty")
  ) {
    issues.push({
      path: `${path}.op`,
      message: `Оператор ${condition.op} предназначен только для полей со множественным выбором.`,
    });
  }
  if (question?.options && question.options.length > 0) {
    const configured = question.options.map((option) => option.value);
    const referenced =
      condition.op === "in"
        ? condition.values
        : condition.op === "eq" ||
            condition.op === "neq" ||
            condition.op === "includes"
          ? [condition.value]
          : [];
    referenced.forEach((value) => {
      if (!configured.some((option) => Object.is(option, value))) {
        issues.push({
          path: `${path}.value`,
          message: `Значение ${String(value)} отсутствует среди ответов вопроса ${condition.field}.`,
        });
      }
    });
  }
}

function validateTemplateFields(
  value: RoutingTemplateV1,
  path: string,
  allowedFields: ReadonlySet<string>,
  issues: RoutingRuleSetValidationIssue[],
) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateTemplateFields(item, `${path}[${index}]`, allowedFields, issues),
    );
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.$field === "string") {
    if (!allowedFields.has(record.$field)) {
      issues.push({
        path: `${path}.$field`,
        message: `Поле ${record.$field} отсутствует в инфекционном опроснике.`,
      });
    }
    return;
  }
  if (
    isRecord(record.$joinCatalog) &&
    typeof record.$joinCatalog.field === "string"
  ) {
    if (!allowedFields.has(record.$joinCatalog.field)) {
      issues.push({
        path: `${path}.$joinCatalog.field`,
        message: `Поле ${record.$joinCatalog.field} отсутствует в инфекционном опроснике.`,
      });
    }
    return;
  }
  Object.entries(record).forEach(([key, child]) =>
    validateTemplateFields(
      child as RoutingTemplateV1,
      `${path}.${key}`,
      allowedFields,
      issues,
    ),
  );
}

function requiredScenarios(): Scenario[] {
  return INFECTIOUS_TERRITORIES_V1.flatMap((territory) => {
    const base = { territory: territory.name };
    return [
      ...(["general", "flu_orvi_vp", "covid"] as const).map((infectionGroup) => ({
        id: `${territory.name}:life:${infectionGroup}`,
        state: {
          ...base,
          infectionGroup,
          lifeThreats: ["respiratory_failure"],
          admissionCriteria: [],
        },
      })),
      {
        id: `${territory.name}:outpatient:general`,
        state: {
          ...base,
          infectionGroup: "general",
          lifeThreats: ["none"],
          admissionCriteria: ["none"],
        },
      },
      {
        id: `${territory.name}:inpatient:general`,
        state: {
          ...base,
          infectionGroup: "general",
          lifeThreats: ["none"],
          admissionCriteria: ["moderate"],
        },
      },
      {
        id: `${territory.name}:severe:transportable`,
        state: {
          ...base,
          infectionGroup: "general",
          lifeThreats: ["none"],
          admissionCriteria: ["severe"],
          transportable: true,
        },
      },
      {
        id: `${territory.name}:severe:nontransportable`,
        state: {
          ...base,
          infectionGroup: "general",
          lifeThreats: ["none"],
          admissionCriteria: ["severe"],
          transportable: false,
        },
      },
      ...(["flu_orvi_vp", "covid"] as const).flatMap((infectionGroup) => [
        {
          id: `${territory.name}:outpatient:${infectionGroup}`,
          state: {
            ...base,
            infectionGroup,
            lifeThreats: ["none"],
            admissionCriteria: ["none"],
          },
        },
        {
          id: `${territory.name}:inpatient:${infectionGroup}`,
          state: {
            ...base,
            infectionGroup,
            lifeThreats: ["none"],
            admissionCriteria: ["resp_pneumonia"],
          },
        },
      ]),
    ];
  });
}

function renderedResultIssues(
  value: RoutingTemplateV1,
  path: string,
): RoutingRuleSetValidationIssue[] {
  if (!isRecord(value)) {
    return [{ path, message: "Результат маршрута должен быть объектом." }];
  }
  const result = value as Record<string, unknown>;
  const issues: RoutingRuleSetValidationIssue[] = [];
  for (const field of ["title", "targetLabel", "urgency", "transport"] as const) {
    if (typeof result[field] !== "string" || result[field].trim().length === 0) {
      issues.push({ path: `${path}.${field}`, message: "Ожидается непустой текст." });
    }
  }
  if (!isRecord(result.target)) {
    issues.push({ path: `${path}.target`, message: "Не определён пункт назначения." });
  } else {
    const target = result.target as Record<string, unknown>;
    for (const field of ["name", "role", "address"] as const) {
      if (
        typeof target[field] !== "string" ||
        target[field].trim().length === 0
      ) {
        issues.push({
          path: `${path}.target.${field}`,
          message: "У пункта назначения не заполнено обязательное поле.",
        });
      }
    }
  }
  for (const field of ["actions", "handoff"] as const) {
    if (
      !Array.isArray(result[field]) ||
      result[field].length === 0 ||
      !result[field].every(
        (item: unknown) => typeof item === "string" && item.trim().length > 0,
      )
    ) {
      issues.push({
        path: `${path}.${field}`,
        message: "Нужен непустой список текстовых пунктов.",
      });
    }
  }
  if (
    !Array.isArray(result.sources) ||
    result.sources.length === 0 ||
    !result.sources.every((source: unknown) => {
      if (!isRecord(source)) return false;
      const label = (source as Record<string, unknown>).label;
      return typeof label === "string" && label.trim().length > 0;
    })
  ) {
    issues.push({
      path: `${path}.sources`,
      message: "Нужно хотя бы одно заполненное нормативное основание.",
    });
  }
  return issues;
}

export function validateInfectiousRuleSetForEditor(
  ruleSet: RoutingRuleSetV1,
  questions?: readonly RoutingQuestionDescriptor[],
): RoutingRuleSetValidationIssue[] {
  const structural = validateRoutingRuleSetV1(ruleSet);
  if (structural.length > 0) return structural;

  const issues: RoutingRuleSetValidationIssue[] = [];
  if (ruleSet.profileId !== "infectious") {
    issues.push({
      path: "profileId",
      message: "Конструктор инфекционного профиля получил другой профиль.",
    });
    return issues;
  }
  ruleSet.rules.forEach((rule, index) =>
    validateConditionFields(
      rule.when,
      `rules[${index}].when`,
      issues,
      questions,
    ),
  );
  const allowedTemplateFields = new Set(
    questions?.map((question) => question.id) ?? [...DEFAULT_ALLOWED_FIELDS],
  );
  Object.entries(ruleSet.catalogs).forEach(([catalogId, catalog]) =>
    Object.entries(catalog).forEach(([key, value]) =>
      validateTemplateFields(
        value,
        `catalogs.${catalogId}.${key}`,
        allowedTemplateFields,
        issues,
      ),
    ),
  );
  ruleSet.rules.forEach((rule, index) =>
    validateTemplateFields(
      rule.result,
      `rules[${index}].result`,
      allowedTemplateFields,
      issues,
    ),
  );
  if (issues.length > 0) return issues;

  const scenarios: Scenario[] = [...requiredScenarios()];
  if (questions) {
    const dynamicMatrix = buildRoutingQuestionnaireScenarioMatrix(
      questions,
      10_000,
    );
    dynamicMatrix.states.forEach((state, index) => {
      scenarios.push({ id: `questionnaire:${index + 1}`, state });
    });
  }

  for (const scenario of scenarios) {
    try {
      const evaluation = evaluateRoutingRuleSetV1(ruleSet, scenario.state);
      if (!evaluation) {
        issues.push({
          path: `scenarios.${scenario.id}`,
          message: "Ни одна ветка не определяет маршрут.",
        });
      } else {
        const resultIssues = renderedResultIssues(
          evaluation.result,
          `scenarios.${scenario.id}.result`,
        );
        issues.push(...resultIssues);
      }
    } catch (reason) {
      issues.push({
        path: `scenarios.${scenario.id}`,
        message:
          reason instanceof Error
            ? reason.message
            : "Расчёт маршрута завершился ошибкой.",
      });
    }
    if (issues.length >= 30) break;
  }
  return issues;
}
