import type {
  RoutingContentStatus,
  RoutingProfileContentDocument,
  RoutingProfileId,
  RoutingRuleSetV1,
} from "../routing";

export type StoredRoutingVersionSummary = {
  id: string;
  profileId: RoutingProfileId;
  contentVersion: string;
  status: RoutingContentStatus;
  revision: number;
  questionCount: number;
  branchCount: number;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StoredRoutingVersion = StoredRoutingVersionSummary & {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
};

type ErrorBody = {
  error?: string;
  message?: string;
};

async function bodyOrError<T>(response: Response): Promise<T> {
  let body: T | ErrorBody;
  try {
    body = (await response.json()) as T | ErrorBody;
  } catch {
    throw new Error("Сервер вернул некорректный ответ.");
  }
  if (response.ok) return body as T;
  const error = body as ErrorBody;
  const messages: Record<string, string> = {
    unauthorized: "Сессия администратора завершена. Войдите повторно.",
    database_not_configured: "Neon ещё не подключён к этому окружению.",
    database_not_initialized: "В Neon ещё не применена схема маршрутизации.",
    version_conflict:
      "Черновик уже изменился. Обновите версию перед повторным сохранением.",
  };
  throw new Error(
    error.message ??
      messages[error.error ?? ""] ??
      "Не удалось выполнить операцию с черновиком.",
  );
}

export async function listAdminRoutingVersions(): Promise<
  StoredRoutingVersionSummary[]
> {
  const response = await fetch("/api/admin/content", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = await bodyOrError<{ versions: StoredRoutingVersionSummary[] }>(
    response,
  );
  return body.versions;
}

export async function getAdminRoutingVersion(
  id: string,
): Promise<StoredRoutingVersion> {
  const response = await fetch(`/api/admin/content?id=${encodeURIComponent(id)}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = await bodyOrError<{ version: StoredRoutingVersion }>(response);
  return body.version;
}

export async function createAdminRoutingDraft(input: {
  profileId: RoutingProfileId;
  contentVersion: string;
  changeSummary: string;
}): Promise<StoredRoutingVersion> {
  const response = await fetch("/api/admin/content", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "create_draft", ...input }),
  });
  const body = await bodyOrError<{ version: StoredRoutingVersion }>(response);
  return body.version;
}

export async function saveAdminRoutingDraft(
  version: StoredRoutingVersion,
): Promise<StoredRoutingVersion> {
  const response = await fetch("/api/admin/content", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "save_draft",
      id: version.id,
      expectedRevision: version.revision,
      document: version.document,
      ruleSet: version.ruleSet,
    }),
  });
  const body = await bodyOrError<{ version: StoredRoutingVersion }>(response);
  return body.version;
}

async function transitionAdminRoutingVersion(input: {
  action: "submit_review" | "approve" | "archive";
  version: StoredRoutingVersion;
  decisionDocument?: string;
}): Promise<StoredRoutingVersion> {
  const response = await fetch("/api/admin/content", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: input.action,
      id: input.version.id,
      expectedRevision: input.version.revision,
      decisionDocument: input.decisionDocument,
    }),
  });
  const body = await bodyOrError<{ version: StoredRoutingVersion }>(response);
  return body.version;
}

export function submitAdminRoutingVersionForReview(
  version: StoredRoutingVersion,
): Promise<StoredRoutingVersion> {
  return transitionAdminRoutingVersion({ action: "submit_review", version });
}

export function approveAdminRoutingVersion(
  version: StoredRoutingVersion,
  decisionDocument: string,
): Promise<StoredRoutingVersion> {
  return transitionAdminRoutingVersion({
    action: "approve",
    version,
    decisionDocument,
  });
}

export function archiveAdminRoutingVersion(
  version: StoredRoutingVersion,
): Promise<StoredRoutingVersion> {
  return transitionAdminRoutingVersion({ action: "archive", version });
}
