import type { RoutingProfileId } from "../routing";
import type {
  DocumentStatus,
  FeedbackCategory,
  FeedbackRecipient,
  FeedbackStatus,
  NormativeDocument,
  RoutingFeedback,
  UsageEventType,
  UsageStat,
} from "./types";

type ErrorBody = { error?: string; message?: string };

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
    database_not_configured: "Neon не подключён к этому окружению.",
    database_not_initialized: "В Neon ещё не применена новая миграция.",
    blob_not_configured: "Vercel Blob ещё не подключён к проекту.",
    conflict: "Такая запись уже существует.",
  };
  throw new Error(
    error.message ?? messages[error.error ?? ""] ?? "Не удалось выполнить операцию.",
  );
}

async function adminGet<T>(section: string, query = ""): Promise<T> {
  const response = await fetch(
    `/api/admin/operations?section=${encodeURIComponent(section)}${query}`,
    { credentials: "same-origin", headers: { Accept: "application/json" } },
  );
  return bodyOrError<T>(response);
}

async function adminAction<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/admin/operations", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return bodyOrError<T>(response);
}

export async function submitRoutingFeedback(input: {
  category: FeedbackCategory;
  message: string;
  profileId?: RoutingProfileId;
  contentVersion?: string;
  resultId?: string;
  ruleId?: string;
  website?: string;
}): Promise<{ id: string }> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  return bodyOrError<{ accepted: true; id: string }>(response);
}

export async function loadPublicDocuments(
  profileId: RoutingProfileId,
): Promise<NormativeDocument[]> {
  const response = await fetch(
    `/api/documents?profileId=${encodeURIComponent(profileId)}`,
    { headers: { Accept: "application/json" } },
  );
  const body = await bodyOrError<{ documents: NormativeDocument[] }>(response);
  return body.documents;
}

export function recordUsageEvent(input: {
  profileId: RoutingProfileId;
  contentVersion?: string;
  eventType: UsageEventType;
  dimension?: string;
}) {
  void fetch("/api/analytics/event", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}

export async function listAdminFeedback(): Promise<RoutingFeedback[]> {
  return (await adminGet<{ feedback: RoutingFeedback[] }>("feedback")).feedback;
}

export async function updateAdminFeedback(input: {
  id: string;
  status: FeedbackStatus;
  adminNote: string;
}): Promise<RoutingFeedback> {
  return (
    await adminAction<{ feedback: RoutingFeedback }>({
      action: "update_feedback",
      ...input,
    })
  ).feedback;
}

export async function listAdminRecipients(): Promise<FeedbackRecipient[]> {
  return (await adminGet<{ recipients: FeedbackRecipient[] }>("recipients"))
    .recipients;
}

export async function saveAdminRecipient(input: {
  id?: string;
  email: string;
  label: string;
  enabled: boolean;
}): Promise<FeedbackRecipient> {
  return (
    await adminAction<{ recipient: FeedbackRecipient }>({
      action: "save_recipient",
      ...input,
    })
  ).recipient;
}

export async function deleteAdminRecipient(id: string): Promise<void> {
  await adminAction({ action: "delete_recipient", id });
}

export async function listAdminDocuments(): Promise<NormativeDocument[]> {
  return (await adminGet<{ documents: NormativeDocument[] }>("documents"))
    .documents;
}

export async function saveAdminDocument(input: {
  id?: string;
  code: string;
  title: string;
  issuer: string;
  documentNumber: string;
  issuedOn: string;
  status: DocumentStatus;
  officialUrl: string;
  notes: string;
  verified: boolean;
}): Promise<NormativeDocument> {
  return (
    await adminAction<{ document: NormativeDocument }>({
      action: "save_document",
      ...input,
    })
  ).document;
}

export async function saveAdminDocumentReference(input: {
  id?: string;
  documentId: string;
  profileId: RoutingProfileId;
  sourceId: string;
  branchId: string;
  referenceLabel: string;
}): Promise<void> {
  await adminAction({ action: "save_document_reference", ...input });
}

export async function deleteAdminDocumentReference(id: string): Promise<void> {
  await adminAction({ action: "delete_document_reference", id });
}

export async function listAdminStats(days = 30): Promise<UsageStat[]> {
  return (
    await adminGet<{ stats: UsageStat[] }>("stats", `&days=${days}`)
  ).stats;
}
