import type { RoutingProfileId } from "./types.js";
import type {
  RoutingConditionV1,
  RoutingJsonPrimitive,
} from "./rules-v1.js";
import { validateRoutingConditionV1 } from "./rules-v1.js";

export const ROUTING_CONTENT_SCHEMA_VERSION = 1 as const;

export type RoutingContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "archived";

export type RoutingSourceVerificationStatus =
  | "verified"
  | "needs_confirmation"
  | "season_expired";

export type RoutingQuestionKind =
  | "boolean"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "text";

export type RoutingQuestionRequirement =
  | "always"
  | "conditional"
  | "optional";

export type RoutingQuestionOption = {
  value: RoutingJsonPrimitive;
  label: string;
  helpText?: string;
  exclusive?: boolean;
  visibility?: RoutingConditionV1;
};

export type RoutingQuestionDescriptor = {
  id: string;
  label: string;
  kind: RoutingQuestionKind;
  requirement: RoutingQuestionRequirement;
  optionCatalog?: string;
  helpText?: string;
  placeholder?: string;
  visibility?: RoutingConditionV1;
  options?: readonly RoutingQuestionOption[];
};

export type RoutingSourceDescriptor = {
  id: string;
  label: string;
  authority: "federal" | "regional";
  official: true;
  verificationStatus: RoutingSourceVerificationStatus;
  url?: string;
};

export type RoutingBranchDescriptor = {
  id: string;
  title: string;
  priority: number;
  conditionSummary: string;
  outcomeSummary: string;
  sourceIds: readonly string[];
  curatorQuestionIds: readonly string[];
};

export type RoutingExecutionDescriptor =
  | {
      kind: "typescript";
      evaluator: string;
      migrationNote: string;
    }
  | {
      kind: "rules_v1";
      ruleSetId: string;
    };

export type RoutingContentApproval = {
  approvedAt: string;
  approvedBy: string;
  decisionDocument: string;
};

export type RoutingProfileContentDocument = {
  schemaVersion: typeof ROUTING_CONTENT_SCHEMA_VERSION;
  contentVersion: string;
  status: RoutingContentStatus;
  profileId: RoutingProfileId;
  audience: "adults" | "children" | "all" | "obstetric";
  updatedAt: string;
  changeSummary: string;
  officialSourcesOnly: true;
  questions: readonly RoutingQuestionDescriptor[];
  branches: readonly RoutingBranchDescriptor[];
  sources: readonly RoutingSourceDescriptor[];
  blockingCuratorQuestionIds: readonly string[];
  execution: RoutingExecutionDescriptor;
  approval?: RoutingContentApproval;
};

export type RoutingContentValidationIssue = {
  path: string;
  message: string;
};

const PROFILE_IDS = new Set<RoutingProfileId>([
  "obgyn",
  "oncology",
  "bsk",
  "dermatology",
  "infectious",
  "road_accident",
]);

const CONTENT_STATUSES = new Set<RoutingContentStatus>([
  "draft",
  "in_review",
  "approved",
  "archived",
]);

const QUESTION_KINDS = new Set<RoutingQuestionKind>([
  "boolean",
  "single_choice",
  "multiple_choice",
  "number",
  "text",
]);

const QUESTION_REQUIREMENTS = new Set<RoutingQuestionRequirement>([
  "always",
  "conditional",
  "optional",
]);
const SOURCE_VERIFICATION_STATUSES = new Set<RoutingSourceVerificationStatus>([
  "verified",
  "needs_confirmation",
  "season_expired",
]);

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const QUESTION_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushRequiredString(
  value: unknown,
  path: string,
  issues: RoutingContentValidationIssue[],
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Ожидается непустая строка." });
  }
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function conditionFields(
  condition: RoutingConditionV1,
  fields: string[] = [],
): string[] {
  if (condition.op === "all" || condition.op === "any") {
    condition.conditions.forEach((child) => conditionFields(child, fields));
  } else if (condition.op === "not") {
    conditionFields(condition.condition, fields);
  } else {
    fields.push(condition.field);
  }
  return fields;
}

function validateQuestionCondition(
  value: unknown,
  path: string,
  availableQuestions: ReadonlyMap<string, RoutingQuestionDescriptor>,
  issues: RoutingContentValidationIssue[],
) {
  const conditionIssues = validateRoutingConditionV1(value, path);
  issues.push(...conditionIssues);
  if (conditionIssues.length > 0) return;

  conditionFields(value as RoutingConditionV1).forEach((field) => {
    if (!availableQuestions.has(field)) {
      issues.push({
        path,
        message: `Условие ссылается на недоступный или следующий вопрос ${field}.`,
      });
    }
  });
  const inspectOperators = (condition: RoutingConditionV1) => {
    if (condition.op === "all" || condition.op === "any") {
      condition.conditions.forEach(inspectOperators);
      return;
    }
    if (condition.op === "not") {
      inspectOperators(condition.condition);
      return;
    }
    const question = availableQuestions.get(condition.field);
    if (!question) return;
    const multiple = question.kind === "multiple_choice";
    if (
      multiple &&
      condition.op !== "includes" &&
      condition.op !== "non_empty"
    ) {
      issues.push({
        path,
        message: `Для множественного вопроса ${condition.field} разрешены условия «список содержит» и «список не пуст».`,
      });
    }
    if (
      !multiple &&
      (condition.op === "includes" || condition.op === "non_empty")
    ) {
      issues.push({
        path,
        message: `Для одиночного вопроса ${condition.field} нельзя использовать оператор списка.`,
      });
    }
    if (question.options && question.options.length > 0) {
      const configured = question.options.map((option) => option.value);
      const referenced =
        condition.op === "in"
          ? condition.values
          : condition.op === "eq" ||
              condition.op === "neq" ||
              condition.op === "includes"
            ? [condition.value]
            : [];
      referenced.forEach((candidate) => {
        if (!configured.some((option) => Object.is(option, candidate))) {
          issues.push({
            path,
            message: `Значение ${String(candidate)} отсутствует среди вариантов вопроса ${condition.field}.`,
          });
        }
      });
    }
  };
  inspectOperators(value as RoutingConditionV1);
}

export function validateRoutingContentDocument(
  value: unknown,
): RoutingContentValidationIssue[] {
  const issues: RoutingContentValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "$", message: "Документ должен быть объектом." }];
  }

  if (value.schemaVersion !== ROUTING_CONTENT_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `Поддерживается только версия схемы ${ROUTING_CONTENT_SCHEMA_VERSION}.`,
    });
  }

  if (
    typeof value.contentVersion !== "string" ||
    !SEMVER_PATTERN.test(value.contentVersion)
  ) {
    issues.push({
      path: "contentVersion",
      message: "Версия содержимого должна соответствовать SemVer.",
    });
  }

  if (
    typeof value.profileId !== "string" ||
    !PROFILE_IDS.has(value.profileId as RoutingProfileId)
  ) {
    issues.push({ path: "profileId", message: "Неизвестный профиль." });
  }

  if (
    typeof value.status !== "string" ||
    !CONTENT_STATUSES.has(value.status as RoutingContentStatus)
  ) {
    issues.push({ path: "status", message: "Неизвестный статус публикации." });
  }

  pushRequiredString(value.updatedAt, "updatedAt", issues);
  if (
    typeof value.updatedAt === "string" &&
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    issues.push({ path: "updatedAt", message: "Некорректная дата обновления." });
  }
  pushRequiredString(value.changeSummary, "changeSummary", issues);

  if (value.officialSourcesOnly !== true) {
    issues.push({
      path: "officialSourcesOnly",
      message: "Для проекта разрешены только официальные источники.",
    });
  }

  const questions = Array.isArray(value.questions) ? value.questions : [];
  if (!Array.isArray(value.questions) || questions.length === 0) {
    issues.push({ path: "questions", message: "Нужен хотя бы один вопрос." });
  }
  const questionIds = questions
    .filter(isRecord)
    .map((question) => question.id)
    .filter((id): id is string => typeof id === "string");
  duplicateValues(questionIds).forEach((id) =>
    issues.push({ path: "questions", message: `Повторяется идентификатор ${id}.` }),
  );
  const availableQuestions = new Map<string, RoutingQuestionDescriptor>();
  questions.forEach((question, index) => {
    if (!isRecord(question)) {
      issues.push({
        path: `questions[${index}]`,
        message: "Вопрос должен быть объектом.",
      });
      return;
    }
    pushRequiredString(question.id, `questions[${index}].id`, issues);
    if (
      typeof question.id === "string" &&
      !QUESTION_ID_PATTERN.test(question.id)
    ) {
      issues.push({
        path: `questions[${index}].id`,
        message: "Идентификатор вопроса: латинские буквы, цифры и подчёркивание; первый символ — буква.",
      });
    }
    pushRequiredString(question.label, `questions[${index}].label`, issues);
    if (
      typeof question.kind !== "string" ||
      !QUESTION_KINDS.has(question.kind as RoutingQuestionKind)
    ) {
      issues.push({
        path: `questions[${index}].kind`,
        message: "Неизвестный тип вопроса.",
      });
    }
    if (
      typeof question.requirement !== "string" ||
      !QUESTION_REQUIREMENTS.has(
        question.requirement as RoutingQuestionRequirement,
      )
    ) {
      issues.push({
        path: `questions[${index}].requirement`,
        message: "Неизвестное правило обязательности.",
      });
    }
    if (question.visibility !== undefined) {
      validateQuestionCondition(
        question.visibility,
        `questions[${index}].visibility`,
        availableQuestions,
        issues,
      );
    }
    if (
      Array.isArray(question.options) &&
      question.requirement === "conditional" &&
      question.visibility === undefined
    ) {
      issues.push({
        path: `questions[${index}].visibility`,
        message: "Для условного динамического вопроса нужно задать условие показа.",
      });
    }

    const options = Array.isArray(question.options) ? question.options : [];
    const choiceQuestion =
      question.kind === "boolean" ||
      question.kind === "single_choice" ||
      question.kind === "multiple_choice";
    if (choiceQuestion && Array.isArray(question.options) && options.length === 0) {
      issues.push({
        path: `questions[${index}].options`,
        message: "Список вариантов ответа не должен быть пустым.",
      });
    }
    if (!choiceQuestion && options.length > 0) {
      issues.push({
        path: `questions[${index}].options`,
        message: "Текстовый и числовой вопросы не должны содержать варианты ответа.",
      });
    }
    const optionValues: string[] = [];
    options.forEach((option, optionIndex) => {
      if (!isRecord(option)) {
        issues.push({
          path: `questions[${index}].options[${optionIndex}]`,
          message: "Вариант ответа должен быть объектом.",
        });
        return;
      }
      if (
        option.value !== null &&
        typeof option.value !== "string" &&
        typeof option.value !== "number" &&
        typeof option.value !== "boolean"
      ) {
        issues.push({
          path: `questions[${index}].options[${optionIndex}].value`,
          message: "Значение варианта должно быть JSON-скаляром.",
        });
      } else {
        optionValues.push(JSON.stringify(option.value));
      }
      pushRequiredString(
        option.label,
        `questions[${index}].options[${optionIndex}].label`,
        issues,
      );
      if (option.visibility !== undefined) {
        validateQuestionCondition(
          option.visibility,
          `questions[${index}].options[${optionIndex}].visibility`,
          availableQuestions,
          issues,
        );
      }
    });
    duplicateValues(optionValues).forEach((value) =>
      issues.push({
        path: `questions[${index}].options`,
        message: `Повторяется значение варианта ${value}.`,
      }),
    );
    if (typeof question.id === "string" && question.id.trim().length > 0) {
      availableQuestions.set(
        question.id,
        question as unknown as RoutingQuestionDescriptor,
      );
    }
  });

  const branches = Array.isArray(value.branches) ? value.branches : [];
  if (!Array.isArray(value.branches) || branches.length === 0) {
    issues.push({ path: "branches", message: "Нужна хотя бы одна ветка." });
  }
  const branchRecords = branches.filter(isRecord);
  const branchIds = branchRecords
    .map((branch) => branch.id)
    .filter((id): id is string => typeof id === "string");
  duplicateValues(branchIds).forEach((id) =>
    issues.push({ path: "branches", message: `Повторяется идентификатор ${id}.` }),
  );
  const priorities = branchRecords
    .map((branch) => branch.priority)
    .filter((priority): priority is number => typeof priority === "number");
  duplicateValues(priorities.map(String)).forEach((priority) =>
    issues.push({
      path: "branches",
      message: `Повторяется приоритет ${priority}; порядок должен быть однозначным.`,
    }),
  );

  const sources = Array.isArray(value.sources) ? value.sources : [];
  if (!Array.isArray(value.sources) || sources.length === 0) {
    issues.push({ path: "sources", message: "Нужен хотя бы один источник." });
  }
  const sourceRecords = sources.filter(isRecord);
  const sourceIds = sourceRecords
    .map((source) => source.id)
    .filter((id): id is string => typeof id === "string");
  duplicateValues(sourceIds).forEach((id) =>
    issues.push({ path: "sources", message: `Повторяется идентификатор ${id}.` }),
  );
  sourceRecords.forEach((source, index) => {
    pushRequiredString(source.id, `sources[${index}].id`, issues);
    pushRequiredString(source.label, `sources[${index}].label`, issues);
    if (source.authority !== "federal" && source.authority !== "regional") {
      issues.push({
        path: `sources[${index}].authority`,
        message: "Источник должен быть федеральным или региональным.",
      });
    }
    if (source.official !== true) {
      issues.push({
        path: `sources[${index}].official`,
        message: "Источник должен быть официальным.",
      });
    }
    if (
      typeof source.verificationStatus !== "string" ||
      !SOURCE_VERIFICATION_STATUSES.has(
        source.verificationStatus as RoutingSourceVerificationStatus,
      )
    ) {
      issues.push({
        path: `sources[${index}].verificationStatus`,
        message: "Неизвестный статус проверки источника.",
      });
    }
    if (source.url !== undefined && typeof source.url !== "string") {
      issues.push({
        path: `sources[${index}].url`,
        message: "Ссылка на источник должна быть строкой.",
      });
    }
  });

  const knownSourceIds = new Set(sourceIds);
  branchRecords.forEach((branch, index) => {
    if (typeof branch.priority !== "number" || branch.priority < 1) {
      issues.push({
        path: `branches[${index}].priority`,
        message: "Приоритет должен быть положительным числом.",
      });
    }
    if (!Array.isArray(branch.sourceIds) || branch.sourceIds.length === 0) {
      issues.push({
        path: `branches[${index}].sourceIds`,
        message: "У ветки должно быть нормативное основание.",
      });
    } else {
      branch.sourceIds.forEach((sourceId) => {
        if (typeof sourceId !== "string" || !knownSourceIds.has(sourceId)) {
          issues.push({
            path: `branches[${index}].sourceIds`,
            message: `Неизвестный источник ${String(sourceId)}.`,
          });
        }
      });
    }
  });

  const blockingIds = Array.isArray(value.blockingCuratorQuestionIds)
    ? value.blockingCuratorQuestionIds.filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  duplicateValues(blockingIds).forEach((id) =>
    issues.push({
      path: "blockingCuratorQuestionIds",
      message: `Повторяется вопрос ${id}.`,
    }),
  );
  const knownBlockingIds = new Set(blockingIds);
  branchRecords.forEach((branch, index) => {
    if (!Array.isArray(branch.curatorQuestionIds)) return;
    branch.curatorQuestionIds.forEach((questionId) => {
      if (
        typeof questionId !== "string" ||
        !knownBlockingIds.has(questionId)
      ) {
        issues.push({
          path: `branches[${index}].curatorQuestionIds`,
          message: `Вопрос ${String(questionId)} не объявлен блокирующим для профиля.`,
        });
      }
    });
  });

  if (value.status === "approved") {
    if (blockingIds.length > 0) {
      issues.push({
        path: "blockingCuratorQuestionIds",
        message: "Нельзя утвердить версию с открытыми блокирующими вопросами.",
      });
    }
    if (!isRecord(value.approval)) {
      issues.push({
        path: "approval",
        message: "Для утверждённой версии нужны реквизиты согласования.",
      });
    }
    sourceRecords.forEach((source, index) => {
      if (source.verificationStatus !== "verified") {
        issues.push({
          path: `sources[${index}].verificationStatus`,
          message: "Утверждённая версия не может ссылаться на непроверенный источник.",
        });
      }
    });
  }

  if (!isRecord(value.execution)) {
    issues.push({ path: "execution", message: "Не задан механизм выполнения." });
  } else if (
    value.execution.kind !== "typescript" &&
    value.execution.kind !== "rules_v1"
  ) {
    issues.push({ path: "execution.kind", message: "Неизвестный механизм выполнения." });
  } else if (
    value.execution.kind === "typescript" &&
    (typeof value.execution.evaluator !== "string" ||
      value.execution.evaluator.length === 0)
  ) {
    issues.push({ path: "execution.evaluator", message: "Не указан TypeScript-обработчик." });
  } else if (
    value.execution.kind === "rules_v1" &&
    (typeof value.execution.ruleSetId !== "string" ||
      value.execution.ruleSetId.length === 0)
  ) {
    issues.push({ path: "execution.ruleSetId", message: "Не указан набор rules_v1." });
  }

  return issues;
}

export function assertRoutingContentDocument(
  value: unknown,
): asserts value is RoutingProfileContentDocument {
  const issues = validateRoutingContentDocument(value);
  if (issues.length > 0) {
    throw new Error(
      `Некорректный документ маршрутизации:\n${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
}

export function parseRoutingContentDocument(
  serialized: string,
): RoutingProfileContentDocument {
  const value: unknown = JSON.parse(serialized);
  assertRoutingContentDocument(value);
  return value;
}

export function publicationBlockers(
  document: RoutingProfileContentDocument,
): string[] {
  const blockers = [...document.blockingCuratorQuestionIds];
  document.sources.forEach((source) => {
    if (source.verificationStatus !== "verified") {
      blockers.push(`Источник ${source.id}: ${source.verificationStatus}`);
    }
  });
  return blockers;
}

export type NewRoutingContentDraft = {
  contentVersion: string;
  updatedAt: string;
  changeSummary: string;
};

export function createRoutingContentDraft(
  document: RoutingProfileContentDocument,
  next: NewRoutingContentDraft,
): RoutingProfileContentDocument {
  if (next.contentVersion === document.contentVersion) {
    throw new Error("Новая редакция должна получить новую версию содержимого.");
  }

  const draft: RoutingProfileContentDocument = {
    ...document,
    contentVersion: next.contentVersion,
    status: "draft",
    updatedAt: next.updatedAt,
    changeSummary: next.changeSummary,
    approval: undefined,
  };
  assertRoutingContentDocument(draft);
  return draft;
}

export function submitRoutingContentForReview(
  document: RoutingProfileContentDocument,
  updatedAt: string,
): RoutingProfileContentDocument {
  if (document.status !== "draft") {
    throw new Error("На проверку можно отправить только черновик.");
  }

  const review: RoutingProfileContentDocument = {
    ...document,
    status: "in_review",
    updatedAt,
  };
  assertRoutingContentDocument(review);
  return review;
}

export function approveRoutingContent(
  document: RoutingProfileContentDocument,
  approval: RoutingContentApproval,
): RoutingProfileContentDocument {
  if (document.status !== "in_review") {
    throw new Error("Утвердить можно только версию на проверке.");
  }

  const approved: RoutingProfileContentDocument = {
    ...document,
    status: "approved",
    updatedAt: approval.approvedAt,
    approval,
  };
  assertRoutingContentDocument(approved);
  return approved;
}

export function archiveRoutingContent(
  document: RoutingProfileContentDocument,
  updatedAt: string,
): RoutingProfileContentDocument {
  if (document.status !== "approved") {
    throw new Error("Архивировать можно только утверждённую версию.");
  }

  const archived: RoutingProfileContentDocument = {
    ...document,
    status: "archived",
    updatedAt,
  };
  assertRoutingContentDocument(archived);
  return archived;
}
