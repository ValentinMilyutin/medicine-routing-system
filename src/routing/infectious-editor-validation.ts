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
import {
  prepareRoutingEvaluationState,
  routingDerivedFieldIds,
} from "./evaluation-state.js";

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
  derivedFields: ReadonlySet<string> = new Set(),
) {
  if (condition.op === "all" || condition.op === "any") {
    condition.conditions.forEach((child, index) =>
      validateConditionFields(
        child,
        `${path}.conditions[${index}]`,
        issues,
        questions,
        derivedFields,
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
      derivedFields,
    );
    return;
  }
  const question = questions?.find((item) => item.id === condition.field);
  const allowed = questions
    ? questions.some((item) => item.id === condition.field) || derivedFields.has(condition.field)
    : DEFAULT_ALLOWED_FIELDS.has(condition.field);
  if (!allowed) {
    issues.push({
      path: `${path}.field`,
      message: `Поле ${condition.field} не существует в опроснике профиля.`,
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
        message: `Поле ${record.$field} отсутствует в опроснике профиля.`,
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
        message: `Поле ${record.$joinCatalog.field} отсутствует в опроснике профиля.`,
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
  profileId: string,
): RoutingRuleSetValidationIssue[] {
  if (!isRecord(value)) {
    return [{ path, message: "Результат маршрута должен быть объектом." }];
  }
  const result = value as Record<string, unknown>;
  const issues: RoutingRuleSetValidationIssue[] = [];
  const requiredTextFields = profileId === "obgyn"
    ? ["transport"] as const
    : profileId === "oncology"
    ? ["routeTitle", "target", "transport"] as const
    : profileId === "infectious" || profileId === "dermatology"
    ? ["title", "targetLabel", "urgency", "transport"] as const
    : profileId === "road_accident"
      ? ["title", "targetLabel", "urgency"] as const
      : ["title", "urgency"] as const;
  for (const field of requiredTextFields) {
    if (typeof result[field] !== "string" || result[field].trim().length === 0) {
      issues.push({ path: `${path}.${field}`, message: "Ожидается непустой текст." });
    }
  }
  const targetValue = profileId === "oncology"
    ? result.locationPrimaryHospital
    : result.target;
  if (!isRecord(targetValue)) {
    issues.push({ path: `${path}.target`, message: "Не определён пункт назначения." });
  } else {
    const target = targetValue as Record<string, unknown>;
    const facilityFields = profileId === "oncology" || profileId === "obgyn" ? ["name", "address"] as const : ["name", "role", "address"] as const;
    for (const field of facilityFields) {
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
    if (profileId === "road_accident") {
      if (typeof target.id !== "string" || target.id.trim().length === 0) {
        issues.push({
          path: `${path}.target.id`,
          message: "У травмоцентра должен быть идентификатор.",
        });
      }
      if (target.level !== "I" && target.level !== "II" && target.level !== "III") {
        issues.push({
          path: `${path}.target.level`,
          message: "У травмоцентра должен быть уровень I, II или III.",
        });
      }
    }
    if (profileId === "obgyn" && (typeof target.id !== "string" || target.id.trim().length === 0)) {
      issues.push({ path: `${path}.target.id`, message: "У медицинской организации должен быть идентификатор." });
    }
  }
  if (result.nextTarget !== undefined) {
    if (!isRecord(result.nextTarget)) {
      issues.push({
        path: `${path}.nextTarget`,
        message: "Следующий этап должен быть медицинской организацией.",
      });
    } else {
      const nextTarget = result.nextTarget as Record<string, unknown>;
      for (const field of ["name", "role", "address"] as const) {
        if (typeof nextTarget[field] !== "string" || nextTarget[field].trim().length === 0) {
          issues.push({
            path: `${path}.nextTarget.${field}`,
            message: "У следующего пункта не заполнено обязательное поле.",
          });
        }
      }
      if (
        profileId === "road_accident" &&
        (typeof nextTarget.id !== "string" ||
          (nextTarget.level !== "I" && nextTarget.level !== "II" && nextTarget.level !== "III"))
      ) {
        issues.push({
          path: `${path}.nextTarget`,
          message: "У следующего травмоцентра нужны идентификатор и уровень.",
        });
      }
    }
  }
  if (["infectious", "road_accident", "dermatology"].includes(profileId)) {
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
  }
  if (profileId === "oncology") {
    for (const field of ["callouts", "sources"] as const) {
      if (!Array.isArray(result[field]) || result[field].length === 0 || !result[field].every((item: unknown) => typeof item === "string" && item.trim().length > 0)) {
        issues.push({ path: `${path}.${field}`, message: "Нужен непустой список текстовых пунктов." });
      }
    }
  }
  if (profileId === "obgyn") {
    for (const field of ["callouts", "sources"] as const) {
      if (!Array.isArray(result[field]) || result[field].length === 0 || !result[field].every((item: unknown) => typeof item === "string" && item.trim().length > 0)) {
        issues.push({ path: `${path}.${field}`, message: "Нужен непустой список текстовых пунктов." });
      }
    }
  }
  if (profileId === "infectious" || profileId === "dermatology") {
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
  } else if (profileId === "bsk" || profileId === "oncology" || profileId === "obgyn") {
    if (
      !Array.isArray(result.sources) ||
      result.sources.length === 0 ||
      !result.sources.every(
        (source: unknown) => typeof source === "string" && source.trim().length > 0,
      )
    ) {
      issues.push({
        path: `${path}.sources`,
        message: "Нужно хотя бы одно заполненное нормативное основание.",
      });
    }
  } else if (
    typeof result.sourceReference !== "string" ||
    result.sourceReference.trim().length === 0
  ) {
    issues.push({
      path: `${path}.sourceReference`,
      message: "Нужно заполнить нормативное основание результата.",
    });
  }
  return issues;
}

export function validateRoutingRuleSetForEditor(
  ruleSet: RoutingRuleSetV1,
  questions?: readonly RoutingQuestionDescriptor[],
  expectedProfileId = ruleSet.profileId,
): RoutingRuleSetValidationIssue[] {
  const structural = validateRoutingRuleSetV1(ruleSet);
  if (structural.length > 0) return structural;

  const issues: RoutingRuleSetValidationIssue[] = [];
  if (ruleSet.profileId !== expectedProfileId) {
    return [{
      path: "profileId",
      message: `Конструктор профиля ${expectedProfileId} получил набор правил ${ruleSet.profileId}.`,
    }];
  }
  ruleSet.rules.forEach((rule, index) =>
    validateConditionFields(
      rule.when,
      `rules[${index}].when`,
      issues,
      questions,
      new Set(routingDerivedFieldIds(ruleSet.profileId)),
    ),
  );
  const allowedTemplateFields = new Set(
    [
      ...(questions?.map((question) => question.id) ?? [...DEFAULT_ALLOWED_FIELDS]),
      ...routingDerivedFieldIds(ruleSet.profileId),
    ],
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
  if (issues.length > 0 || !questions) return issues;

  const matrix = buildRoutingQuestionnaireScenarioMatrix(
    questions,
    ruleSet.profileId === "obgyn"
      ? 1_000
      : ruleSet.profileId === "bsk" || ruleSet.profileId === "oncology"
        ? 2_000
        : 20_000,
  );
  for (const [index, state] of matrix.states.entries()) {
    try {
      const evaluation = evaluateRoutingRuleSetV1(
        ruleSet,
        prepareRoutingEvaluationState(ruleSet.profileId, state),
      );
      if (!evaluation) {
        issues.push({
          path: `scenarios.questionnaire:${index + 1}`,
          message: "Ни одна ветка не определяет маршрут.",
        });
      } else {
        issues.push(
          ...renderedResultIssues(
            evaluation.result,
            `scenarios.questionnaire:${index + 1}.result`,
            ruleSet.profileId,
          ),
        );
      }
    } catch (reason) {
      issues.push({
        path: `scenarios.questionnaire:${index + 1}`,
        message: reason instanceof Error
          ? reason.message
          : "Расчёт маршрута завершился ошибкой.",
      });
    }
    if (issues.length >= 30) break;
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
          ruleSet.profileId,
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
