import { INFECTIOUS_TERRITORIES_V1 } from "./infectious-rules-v1.js";
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
  state: {
    territory: string;
    infectionGroup: string;
    lifeThreats: string[];
    admissionCriteria: string[];
    transportable?: boolean;
  };
};

const ALLOWED_FIELDS = new Set([
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
) {
  if (condition.op === "all" || condition.op === "any") {
    condition.conditions.forEach((child, index) =>
      validateConditionFields(child, `${path}.conditions[${index}]`, issues),
    );
    return;
  }
  if (condition.op === "not") {
    validateConditionFields(condition.condition, `${path}.condition`, issues);
    return;
  }
  if (!ALLOWED_FIELDS.has(condition.field)) {
    issues.push({
      path: `${path}.field`,
      message: `Поле ${condition.field} не существует в инфекционном опроснике.`,
    });
  }
  const arrayField =
    condition.field === "lifeThreats" || condition.field === "admissionCriteria";
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
    validateConditionFields(rule.when, `rules[${index}].when`, issues),
  );
  if (issues.length > 0) return issues;

  for (const scenario of requiredScenarios()) {
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
