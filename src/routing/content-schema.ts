import type { RoutingProfileId } from "./types.js";

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

export type RoutingQuestionDescriptor = {
  id: string;
  label: string;
  kind: RoutingQuestionKind;
  requirement: RoutingQuestionRequirement;
  optionCatalog?: string;
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

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

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
    if (source.official !== true) {
      issues.push({
        path: `sources[${index}].official`,
        message: "Источник должен быть официальным.",
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
