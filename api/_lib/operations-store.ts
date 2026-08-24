import { neon } from "@neondatabase/serverless";

export class OperationsDatabaseNotConfiguredError extends Error {}
export class OperationsInputError extends Error {}

export const OPERATIONS_PROFILE_IDS = [
  "obgyn",
  "oncology",
  "bsk",
  "dermatology",
  "infectious",
  "road_accident",
] as const;

export type OperationsProfileId = (typeof OPERATIONS_PROFILE_IDS)[number];
export type FeedbackCategory =
  | "routing_error"
  | "address_outdated"
  | "document_outdated"
  | "suggestion"
  | "other";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "rejected";
export type DocumentStatus =
  | "active"
  | "needs_confirmation"
  | "expired"
  | "replaced"
  | "archived";
export type UsageEventType =
  | "profile_opened"
  | "route_completed"
  | "document_opened"
  | "feedback_submitted";

export type FeedbackRecipient = {
  id: string;
  email: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoutingFeedback = {
  id: string;
  category: FeedbackCategory;
  message: string;
  profileId: OperationsProfileId | null;
  contentVersion: string | null;
  resultId: string | null;
  ruleId: string | null;
  status: FeedbackStatus;
  adminNote: string;
  notificationStatus: "pending" | "sent" | "not_configured" | "failed";
  notificationError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NormativeReference = {
  id: string;
  profileId: OperationsProfileId;
  sourceId: string | null;
  branchId: string | null;
  referenceLabel: string;
};

export type NormativeDocument = {
  id: string;
  code: string;
  title: string;
  issuer: string;
  documentNumber: string;
  issuedOn: string | null;
  status: DocumentStatus;
  officialUrl: string | null;
  storageProvider: "vercel_blob" | "external" | null;
  storageKey: string | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  notes: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  references: NormativeReference[];
};

export type UsageStat = {
  eventDate: string;
  profileId: OperationsProfileId;
  contentVersion: string;
  eventType: UsageEventType;
  dimension: string;
  eventCount: number;
};

type DatabaseRow = Record<string, unknown>;

const FEEDBACK_CATEGORIES = new Set<FeedbackCategory>([
  "routing_error",
  "address_outdated",
  "document_outdated",
  "suggestion",
  "other",
]);
const FEEDBACK_STATUSES = new Set<FeedbackStatus>([
  "new",
  "in_progress",
  "resolved",
  "rejected",
]);
const DOCUMENT_STATUSES = new Set<DocumentStatus>([
  "active",
  "needs_confirmation",
  "expired",
  "replaced",
  "archived",
]);
const USAGE_EVENT_TYPES = new Set<UsageEventType>([
  "profile_opened",
  "route_completed",
  "document_opened",
  "feedback_submitted",
]);
const PROFILE_IDS = new Set<OperationsProfileId>(OPERATIONS_PROFILE_IDS);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,79}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function database() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new OperationsDatabaseNotConfiguredError(
      "DATABASE_URL is not configured.",
    );
  }
  return neon(databaseUrl);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`База вернула некорректное поле ${field}.`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field);
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`База вернула некорректное поле ${field}.`);
  }
  return value;
}

function number(value: unknown, field: string): number {
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`База вернула некорректное поле ${field}.`);
  }
  return result;
}

function date(value: unknown, field: string): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new Error(`База вернула некорректное поле ${field}.`);
}

function dateOnly(value: unknown, field: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  throw new Error(`База вернула некорректное поле ${field}.`);
}

function profileId(value: unknown, optional = false): OperationsProfileId | null {
  if (optional && (value === null || value === undefined || value === "")) {
    return null;
  }
  if (typeof value !== "string" || !PROFILE_IDS.has(value as OperationsProfileId)) {
    throw new OperationsInputError("Неизвестный профиль маршрутизации.");
  }
  return value as OperationsProfileId;
}

function identifier(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new OperationsInputError(`Некорректный идентификатор ${field}.`);
  }
  return value;
}

function trimmedString(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string") {
    throw new OperationsInputError(`Поле «${field}» должно быть строкой.`);
  }
  const result = value.trim();
  if (result.length < minimum || result.length > maximum) {
    throw new OperationsInputError(
      `Поле «${field}» должно содержать от ${minimum} до ${maximum} символов.`,
    );
  }
  return result;
}

function optionalTrimmedString(
  value: unknown,
  field: string,
  maximum: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return trimmedString(value, field, 1, maximum);
}

function recipientFromRow(row: DatabaseRow): FeedbackRecipient {
  return {
    id: String(row.id),
    email: text(row.email, "email"),
    label: text(row.label, "label"),
    enabled: bool(row.enabled, "enabled"),
    createdAt: date(row.created_at, "created_at"),
    updatedAt: date(row.updated_at, "updated_at"),
  };
}

function feedbackFromRow(row: DatabaseRow): RoutingFeedback {
  return {
    id: String(row.id),
    category: text(row.category, "category") as FeedbackCategory,
    message: text(row.message, "message"),
    profileId: profileId(row.profile_id, true),
    contentVersion: optionalText(row.content_version, "content_version"),
    resultId: optionalText(row.result_id, "result_id"),
    ruleId: optionalText(row.rule_id, "rule_id"),
    status: text(row.status, "status") as FeedbackStatus,
    adminNote: text(row.admin_note, "admin_note"),
    notificationStatus: text(
      row.notification_status,
      "notification_status",
    ) as RoutingFeedback["notificationStatus"],
    notificationError: optionalText(
      row.notification_error,
      "notification_error",
    ),
    createdAt: date(row.created_at, "created_at"),
    updatedAt: date(row.updated_at, "updated_at"),
  };
}

function references(value: unknown): NormativeReference[] {
  if (typeof value === "string") {
    try {
      return references(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }
    const row = item as DatabaseRow;
    const parsedProfile = profileId(row.profileId ?? row.profile_id, true);
    if (!parsedProfile) return [];
    return [
      {
        id: String(row.id),
        profileId: parsedProfile,
        sourceId: optionalText(row.sourceId ?? row.source_id, "source_id"),
        branchId: optionalText(row.branchId ?? row.branch_id, "branch_id"),
        referenceLabel: text(
          row.referenceLabel ?? row.reference_label,
          "reference_label",
        ),
      },
    ];
  });
}

function documentFromRow(row: DatabaseRow): NormativeDocument {
  return {
    id: String(row.id),
    code: text(row.code, "code"),
    title: text(row.title, "title"),
    issuer: text(row.issuer, "issuer"),
    documentNumber: text(row.document_number, "document_number"),
    issuedOn:
      row.issued_on === null || row.issued_on === undefined
        ? null
        : dateOnly(row.issued_on, "issued_on"),
    status: text(row.status, "status") as DocumentStatus,
    officialUrl: optionalText(row.official_url, "official_url"),
    storageProvider: optionalText(
      row.storage_provider,
      "storage_provider",
    ) as NormativeDocument["storageProvider"],
    storageKey: optionalText(row.storage_key, "storage_key"),
    fileUrl: optionalText(row.file_url, "file_url"),
    downloadUrl: optionalText(row.download_url, "download_url"),
    originalFilename: optionalText(
      row.original_filename,
      "original_filename",
    ),
    mimeType: optionalText(row.mime_type, "mime_type"),
    sizeBytes:
      row.size_bytes === null || row.size_bytes === undefined
        ? null
        : number(row.size_bytes, "size_bytes"),
    sha256: optionalText(row.sha256, "sha256"),
    notes: text(row.notes, "notes"),
    verifiedAt:
      row.verified_at === null || row.verified_at === undefined
        ? null
        : date(row.verified_at, "verified_at"),
    createdAt: date(row.created_at, "created_at"),
    updatedAt: date(row.updated_at, "updated_at"),
    references: references(row.references),
  };
}

const FEEDBACK_COLUMNS = `
  id::text, category, message, profile_id, content_version, result_id, rule_id,
  status, admin_note, notification_status, notification_error, created_at, updated_at
`;

const DOCUMENT_SELECT = `
  SELECT d.*,
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id', r.id::text,
               'profileId', r.profile_id,
               'sourceId', r.source_id,
               'branchId', r.branch_id,
               'referenceLabel', r.reference_label
             ) ORDER BY r.id
           ) FILTER (WHERE r.id IS NOT NULL),
           '[]'::jsonb
         ) AS references
    FROM normative_documents d
    LEFT JOIN normative_document_references r ON r.document_id = d.id
`;

export async function listFeedbackRecipients(
  enabledOnly = false,
): Promise<FeedbackRecipient[]> {
  const rows = await database().query(
    `SELECT id::text, email, label, enabled, created_at, updated_at
       FROM feedback_recipients
      ${enabledOnly ? "WHERE enabled = true" : ""}
      ORDER BY enabled DESC, lower(email)`,
  );
  return rows.map((row) => recipientFromRow(row as DatabaseRow));
}

export async function saveFeedbackRecipient(input: {
  id?: unknown;
  email: unknown;
  label?: unknown;
  enabled?: unknown;
}): Promise<FeedbackRecipient> {
  const email = trimmedString(input.email, "Электронная почта", 3, 320).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new OperationsInputError("Некорректный адрес электронной почты.");
  }
  const label = optionalTrimmedString(input.label, "Подпись", 160) ?? "";
  const enabled = typeof input.enabled === "boolean" ? input.enabled : true;
  const id = input.id === undefined ? null : identifier(input.id, "получателя");
  const rows = id
    ? await database().query(
        `WITH changed AS (
           UPDATE feedback_recipients
              SET email = $2, label = $3, enabled = $4, updated_at = now()
            WHERE id = $1
        RETURNING id::text, email, label, enabled, created_at, updated_at
         ), audit AS (
           INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
           SELECT 'recipient', id::bigint, 'update', jsonb_build_object('email', email)
             FROM changed
         )
         SELECT * FROM changed`,
        [id, email, label, enabled],
      )
    : await database().query(
        `WITH created AS (
           INSERT INTO feedback_recipients (email, label, enabled)
           VALUES ($1, $2, $3)
           RETURNING id::text, email, label, enabled, created_at, updated_at
         ), audit AS (
           INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
           SELECT 'recipient', id::bigint, 'create', jsonb_build_object('email', email)
             FROM created
         )
         SELECT * FROM created`,
        [email, label, enabled],
      );
  if (rows.length === 0) throw new OperationsInputError("Получатель не найден.");
  return recipientFromRow(rows[0] as DatabaseRow);
}

export async function deleteFeedbackRecipient(idValue: unknown): Promise<void> {
  const id = identifier(idValue, "получателя");
  const rows = await database().query(
    `WITH deleted AS (
       DELETE FROM feedback_recipients WHERE id = $1 RETURNING id, email
     )
     INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
     SELECT 'recipient', id, 'delete', jsonb_build_object('email', email)
       FROM deleted
     RETURNING id`,
    [id],
  );
  if (rows.length === 0) throw new OperationsInputError("Получатель не найден.");
}

export async function createRoutingFeedback(input: {
  category: unknown;
  message: unknown;
  profileId?: unknown;
  contentVersion?: unknown;
  resultId?: unknown;
  ruleId?: unknown;
}): Promise<RoutingFeedback> {
  if (
    typeof input.category !== "string" ||
    !FEEDBACK_CATEGORIES.has(input.category as FeedbackCategory)
  ) {
    throw new OperationsInputError("Неизвестная категория обращения.");
  }
  const message = trimmedString(input.message, "Сообщение", 10, 4000);
  const parsedProfileId = profileId(input.profileId, true);
  const contentVersion = optionalTrimmedString(
    input.contentVersion,
    "Версия",
    100,
  );
  const resultId = optionalTrimmedString(input.resultId, "Результат", 160);
  const ruleId = optionalTrimmedString(input.ruleId, "Правило", 160);
  const rows = await database().query(
    `INSERT INTO routing_feedback (
       category, message, profile_id, content_version, result_id, rule_id
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${FEEDBACK_COLUMNS}`,
    [
      input.category,
      message,
      parsedProfileId,
      contentVersion,
      resultId,
      ruleId,
    ],
  );
  return feedbackFromRow(rows[0] as DatabaseRow);
}

export async function setFeedbackNotification(input: {
  id: string;
  status: RoutingFeedback["notificationStatus"];
  error?: string | null;
}): Promise<void> {
  await database().query(
    `UPDATE routing_feedback
        SET notification_status = $2, notification_error = $3, updated_at = now()
      WHERE id = $1`,
    [input.id, input.status, input.error?.slice(0, 1000) ?? null],
  );
}

export async function listRoutingFeedback(): Promise<RoutingFeedback[]> {
  const rows = await database().query(
    `SELECT ${FEEDBACK_COLUMNS}
       FROM routing_feedback
      ORDER BY created_at DESC
      LIMIT 500`,
  );
  return rows.map((row) => feedbackFromRow(row as DatabaseRow));
}

export async function updateRoutingFeedback(input: {
  id: unknown;
  status: unknown;
  adminNote?: unknown;
}): Promise<RoutingFeedback> {
  const id = identifier(input.id, "обращения");
  if (
    typeof input.status !== "string" ||
    !FEEDBACK_STATUSES.has(input.status as FeedbackStatus)
  ) {
    throw new OperationsInputError("Неизвестный статус обращения.");
  }
  const adminNote = optionalTrimmedString(
    input.adminNote,
    "Комментарий администратора",
    4000,
  ) ?? "";
  const rows = await database().query(
    `WITH changed AS (
       UPDATE routing_feedback
          SET status = $2, admin_note = $3, updated_at = now()
        WHERE id = $1
      RETURNING ${FEEDBACK_COLUMNS}
     ), audit AS (
       INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
       SELECT 'feedback', id::bigint, 'update_status', jsonb_build_object('status', status)
         FROM changed
     )
     SELECT * FROM changed`,
    [id, input.status, adminNote],
  );
  if (rows.length === 0) throw new OperationsInputError("Обращение не найдено.");
  return feedbackFromRow(rows[0] as DatabaseRow);
}

export async function listNormativeDocuments(input: {
  profileId?: OperationsProfileId | null;
  includeArchived?: boolean;
} = {}): Promise<NormativeDocument[]> {
  const conditions: string[] = [];
  const parameters: unknown[] = [];
  if (!input.includeArchived) conditions.push("d.status <> 'archived'");
  if (input.profileId) {
    parameters.push(input.profileId);
    conditions.push(
      `EXISTS (
         SELECT 1 FROM normative_document_references selected_ref
          WHERE selected_ref.document_id = d.id
            AND selected_ref.profile_id = $${parameters.length}
       )`,
    );
  }
  const rows = await database().query(
    `${DOCUMENT_SELECT}
     ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
     GROUP BY d.id
     ORDER BY d.issued_on DESC NULLS LAST, d.document_number`,
    parameters,
  );
  return rows.map((row) => documentFromRow(row as DatabaseRow));
}

export async function saveNormativeDocument(input: {
  id?: unknown;
  code: unknown;
  title: unknown;
  issuer: unknown;
  documentNumber: unknown;
  issuedOn?: unknown;
  status: unknown;
  officialUrl?: unknown;
  notes?: unknown;
  verified?: unknown;
}): Promise<NormativeDocument> {
  const code = trimmedString(input.code, "Метка", 3, 80).toUpperCase();
  if (!DOCUMENT_CODE_PATTERN.test(code)) {
    throw new OperationsInputError(
      "Метка может содержать только латинские буквы, цифры, точку, дефис и подчёркивание.",
    );
  }
  const title = trimmedString(input.title, "Название", 5, 1000);
  const issuer = trimmedString(input.issuer, "Издатель", 3, 500);
  const documentNumber = trimmedString(input.documentNumber, "Номер", 1, 100);
  if (
    typeof input.status !== "string" ||
    !DOCUMENT_STATUSES.has(input.status as DocumentStatus)
  ) {
    throw new OperationsInputError("Неизвестный статус документа.");
  }
  const issuedOn = optionalTrimmedString(input.issuedOn, "Дата", 10);
  if (issuedOn && !/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) {
    throw new OperationsInputError("Дата должна быть в формате ГГГГ-ММ-ДД.");
  }
  const officialUrl = optionalTrimmedString(
    input.officialUrl,
    "Официальная ссылка",
    2000,
  );
  if (officialUrl) {
    let parsed: URL;
    try {
      parsed = new URL(officialUrl);
    } catch {
      throw new OperationsInputError("Некорректная официальная ссылка.");
    }
    if (parsed.protocol !== "https:") {
      throw new OperationsInputError("Официальная ссылка должна использовать HTTPS.");
    }
  }
  const notes = optionalTrimmedString(input.notes, "Примечание", 4000) ?? "";
  const verified = input.verified === true;
  const id = input.id === undefined ? null : identifier(input.id, "документа");
  const parameters = [
    code,
    title,
    issuer,
    documentNumber,
    issuedOn,
    input.status,
    officialUrl,
    notes,
    verified,
  ];
  const rows = id
    ? await database().query(
        `WITH changed AS (
           UPDATE normative_documents
              SET code = $2, title = $3, issuer = $4, document_number = $5,
                  issued_on = $6::date, status = $7, official_url = $8,
                  notes = $9,
                  verified_at = CASE WHEN $10::boolean THEN COALESCE(verified_at, now()) ELSE NULL END,
                  updated_at = now()
            WHERE id = $1
        RETURNING id
         ), audit AS (
           INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
           SELECT 'document', id, 'update', jsonb_build_object('code', $2::text)
             FROM changed
         )
         SELECT id::text FROM changed`,
        [id, ...parameters],
      )
    : await database().query(
        `WITH created AS (
           INSERT INTO normative_documents (
             code, title, issuer, document_number, issued_on, status,
             official_url, notes, verified_at
           ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8,
                     CASE WHEN $9::boolean THEN now() ELSE NULL END)
           RETURNING id
         ), audit AS (
           INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
           SELECT 'document', id, 'create', jsonb_build_object('code', $1::text)
             FROM created
         )
         SELECT id::text FROM created`,
        parameters,
      );
  if (rows.length === 0) throw new OperationsInputError("Документ не найден.");
  const documents = await database().query(
    `${DOCUMENT_SELECT}
      WHERE d.id = $1
      GROUP BY d.id`,
    [String((rows[0] as DatabaseRow).id)],
  );
  return documentFromRow(documents[0] as DatabaseRow);
}

export async function saveDocumentReference(input: {
  id?: unknown;
  documentId: unknown;
  profileId: unknown;
  sourceId?: unknown;
  branchId?: unknown;
  referenceLabel?: unknown;
}): Promise<void> {
  const documentId = identifier(input.documentId, "документа");
  const parsedProfileId = profileId(input.profileId);
  const sourceId = optionalTrimmedString(input.sourceId, "Источник", 160);
  const branchId = optionalTrimmedString(input.branchId, "Ветка", 160);
  const referenceLabel = optionalTrimmedString(
    input.referenceLabel,
    "Пояснение ссылки",
    500,
  ) ?? "";
  const id = input.id === undefined ? null : identifier(input.id, "ссылки");
  if (id) {
    const rows = await database().query(
      `UPDATE normative_document_references
          SET profile_id = $2, source_id = $3, branch_id = $4, reference_label = $5
        WHERE id = $1
      RETURNING id`,
      [id, parsedProfileId, sourceId, branchId, referenceLabel],
    );
    if (rows.length === 0) throw new OperationsInputError("Ссылка не найдена.");
  } else {
    await database().query(
      `INSERT INTO normative_document_references (
         document_id, profile_id, source_id, branch_id, reference_label
       ) VALUES ($1, $2, $3, $4, $5)`,
      [documentId, parsedProfileId, sourceId, branchId, referenceLabel],
    );
  }
  await database().query(
    `INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
     VALUES ('document', $1, 'save_reference', jsonb_build_object('profileId', $2::text))`,
    [documentId, parsedProfileId],
  );
}

export async function deleteDocumentReference(idValue: unknown): Promise<void> {
  const id = identifier(idValue, "ссылки");
  const rows = await database().query(
    `DELETE FROM normative_document_references WHERE id = $1 RETURNING document_id`,
    [id],
  );
  if (rows.length === 0) throw new OperationsInputError("Ссылка не найдена.");
  await database().query(
    `INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
     VALUES ('document', $1, 'delete_reference', jsonb_build_object('referenceId', $2::text))`,
    [String((rows[0] as DatabaseRow).document_id), id],
  );
}

export async function attachDocumentFile(input: {
  documentId: unknown;
  pathname: unknown;
  url: unknown;
  downloadUrl?: unknown;
  originalFilename: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
  sha256: unknown;
}): Promise<void> {
  const documentId = identifier(input.documentId, "документа");
  const pathname = trimmedString(input.pathname, "Путь файла", 3, 1000);
  const url = trimmedString(input.url, "Ссылка файла", 10, 2000);
  const downloadUrl = optionalTrimmedString(
    input.downloadUrl,
    "Ссылка скачивания",
    2000,
  );
  const originalFilename = trimmedString(
    input.originalFilename,
    "Имя файла",
    1,
    500,
  );
  const mimeType = trimmedString(input.mimeType, "Тип файла", 3, 200);
  const sizeBytes = Number(input.sizeBytes);
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 25_000_000) {
    throw new OperationsInputError("Размер файла выходит за допустимые пределы.");
  }
  const sha256 = trimmedString(input.sha256, "SHA-256", 64, 64).toLowerCase();
  if (!SHA256_PATTERN.test(sha256)) {
    throw new OperationsInputError("Некорректная контрольная сумма файла.");
  }
  const rows = await database().query(
    `WITH changed AS (
       UPDATE normative_documents
          SET storage_provider = 'vercel_blob', storage_key = $2,
              file_url = $3, download_url = $4, original_filename = $5,
              mime_type = $6, size_bytes = $7, sha256 = $8, updated_at = now()
        WHERE id = $1
      RETURNING id
     ), audit AS (
       INSERT INTO operations_admin_audit_log (area, entity_id, action, details)
       SELECT 'document', id, 'attach_file',
              jsonb_build_object('pathname', $2::text, 'sha256', $8::text)
         FROM changed
     )
     SELECT id FROM changed`,
    [
      documentId,
      pathname,
      url,
      downloadUrl,
      originalFilename,
      mimeType,
      sizeBytes,
      sha256,
    ],
  );
  if (rows.length === 0) throw new OperationsInputError("Документ не найден.");
}

export async function incrementUsageEvent(input: {
  profileId: unknown;
  contentVersion?: unknown;
  eventType: unknown;
  dimension?: unknown;
}): Promise<void> {
  const parsedProfileId = profileId(input.profileId);
  if (
    typeof input.eventType !== "string" ||
    !USAGE_EVENT_TYPES.has(input.eventType as UsageEventType)
  ) {
    throw new OperationsInputError("Неизвестное событие статистики.");
  }
  const contentVersion = optionalTrimmedString(
    input.contentVersion,
    "Версия",
    100,
  ) ?? "";
  const dimension = optionalTrimmedString(input.dimension, "Измерение", 160) ?? "";
  await database().query(
    `INSERT INTO usage_daily_stats (
       event_date, profile_id, content_version, event_type, dimension, event_count
     ) VALUES (CURRENT_DATE, $1, $2, $3, $4, 1)
     ON CONFLICT (event_date, profile_id, content_version, event_type, dimension)
     DO UPDATE SET event_count = usage_daily_stats.event_count + 1`,
    [parsedProfileId, contentVersion, input.eventType, dimension],
  );
}

export async function listUsageStats(daysValue: unknown = 30): Promise<UsageStat[]> {
  const days = Math.min(365, Math.max(1, Number(daysValue) || 30));
  const rows = await database().query(
    `SELECT event_date, profile_id, content_version, event_type, dimension, event_count
       FROM usage_daily_stats
      WHERE event_date >= CURRENT_DATE - ($1::integer - 1)
      ORDER BY event_date DESC, profile_id, event_type, dimension`,
    [days],
  );
  return rows.map((rawRow) => {
    const row = rawRow as DatabaseRow;
    return {
      eventDate: dateOnly(row.event_date, "event_date"),
      profileId: profileId(row.profile_id)!,
      contentVersion: text(row.content_version, "content_version"),
      eventType: text(row.event_type, "event_type") as UsageEventType,
      dimension: text(row.dimension, "dimension"),
      eventCount: number(row.event_count, "event_count"),
    };
  });
}

export const operationsStoreTestUtils = {
  documentFromRow,
  feedbackFromRow,
  profileId,
  recipientFromRow,
};
