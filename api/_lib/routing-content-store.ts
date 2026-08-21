import { neon } from "@neondatabase/serverless";
import {
  approveRoutingContent,
  archiveRoutingContent,
  assertRoutingContentDocument,
  assertRoutingRuleSetV1,
  createRoutingContentDraft,
  hydrateLegacyInfectiousQuestions,
  routingContentDocuments,
  routingRuleSetRegistry,
  submitRoutingContentForReview,
  validateInfectiousPublicationReadiness,
  validateInfectiousRuleSetForEditor,
  type RoutingProfileContentDocument,
  type RoutingProfileId,
  type RoutingRuleSetV1,
} from "../../src/routing/index.js";

export class DatabaseNotConfiguredError extends Error {}
export class RoutingVersionConflictError extends Error {}
export class RoutingContentInputError extends Error {}

export type StoredRoutingVersionSummary = {
  id: string;
  profileId: RoutingProfileId;
  contentVersion: string;
  status: RoutingProfileContentDocument["status"];
  revision: number;
  basedOnVersionId: string | null;
  basedOnContentVersion: string | null;
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

export type EffectiveRoutingVersion = {
  kind: "approved" | "bundled";
  id: string;
  profileId: RoutingProfileId;
  contentVersion: string;
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
};

type DatabaseRow = Record<string, unknown>;

function database() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new DatabaseNotConfiguredError("DATABASE_URL is not configured.");
  }
  return neon(databaseUrl);
}

function routingProfileId(value: unknown): RoutingProfileId {
  const profile = routingContentDocuments.find(
    (document) => document.profileId === value,
  );
  if (!profile) {
    throw new RoutingContentInputError("Неизвестный профиль маршрутизации.");
  }
  return profile.profileId;
}

function numberValue(value: unknown, field: string): number {
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`База вернула некорректное поле ${field}.`);
  }
  return result;
}

function dateValue(value: unknown, field: string): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new Error(`База вернула некорректное поле ${field}.`);
}

function summaryFromRow(row: DatabaseRow): StoredRoutingVersionSummary {
  return {
    id: String(row.id),
    profileId: routingProfileId(row.profile_id),
    contentVersion: String(row.content_version),
    status: String(row.status) as RoutingProfileContentDocument["status"],
    revision: numberValue(row.revision, "revision"),
    basedOnVersionId:
      row.based_on_version_id === null || row.based_on_version_id === undefined
        ? null
        : String(row.based_on_version_id),
    basedOnContentVersion:
      typeof row.based_on_content_version === "string"
        ? row.based_on_content_version
        : null,
    questionCount: numberValue(row.question_count, "question_count"),
    branchCount: numberValue(row.branch_count, "branch_count"),
    sourceCount: numberValue(row.source_count, "source_count"),
    createdAt: dateValue(row.created_at, "created_at"),
    updatedAt: dateValue(row.updated_at, "updated_at"),
  };
}

function parseBundle(
  document: unknown,
  ruleSet: unknown,
): {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
} {
  try {
    assertRoutingContentDocument(document);
    assertRoutingRuleSetV1(ruleSet);
  } catch (reason) {
    throw new RoutingContentInputError(
      reason instanceof Error ? reason.message : "Некорректное содержимое версии.",
    );
  }
  const normalizedDocument = hydrateLegacyInfectiousQuestions(document, ruleSet);
  try {
    assertRoutingContentDocument(normalizedDocument);
  } catch (reason) {
    throw new RoutingContentInputError(
      reason instanceof Error ? reason.message : "Некорректные вопросы версии.",
    );
  }
  if (normalizedDocument.execution.kind !== "rules_v1") {
    throw new RoutingContentInputError("Редактор поддерживает только rules_v1.");
  }
  if (
    normalizedDocument.profileId !== ruleSet.profileId ||
    normalizedDocument.execution.ruleSetId !== ruleSet.id
  ) {
    throw new RoutingContentInputError(
      "Документ и набор правил относятся к разным профилям.",
    );
  }
  if (normalizedDocument.profileId === "infectious") {
    const issues = validateInfectiousRuleSetForEditor(
      ruleSet,
      normalizedDocument.questions,
    );
    if (issues.length > 0) {
      throw new RoutingContentInputError(
        `Инфекционный черновик не прошёл контроль сценариев:\n${issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("\n")}`,
      );
    }
  }
  return { document: normalizedDocument, ruleSet };
}

function versionFromRow(row: DatabaseRow): StoredRoutingVersion {
  const { document, ruleSet } = parseBundle(row.document, row.rule_set);
  return {
    ...summaryFromRow(row),
    document,
    ruleSet,
  };
}

const VERSION_COLUMNS = `
  id::text,
  profile_id,
  content_version,
  status,
  revision,
  based_on_version_id,
  based_on_content_version,
  jsonb_array_length(document->'questions') AS question_count,
  jsonb_array_length(document->'branches') AS branch_count,
  jsonb_array_length(document->'sources') AS source_count,
  created_at,
  updated_at
`;

export async function listStoredRoutingVersions(): Promise<
  StoredRoutingVersionSummary[]
> {
  const rows = await database().query(
    `SELECT ${VERSION_COLUMNS}
       FROM routing_content_versions
      ORDER BY profile_id, updated_at DESC`,
  );
  return rows.map((row) => summaryFromRow(row as DatabaseRow));
}

export async function getStoredRoutingVersion(
  id: string,
): Promise<StoredRoutingVersion | null> {
  if (!/^\d+$/.test(id)) {
    throw new RoutingContentInputError("Некорректный идентификатор версии.");
  }
  const rows = await database().query(
    `SELECT ${VERSION_COLUMNS}, document, rule_set
       FROM routing_content_versions
      WHERE id = $1`,
    [id],
  );
  return rows[0] ? versionFromRow(rows[0] as DatabaseRow) : null;
}

export async function getPublishedRoutingVersion(
  profileIdValue: unknown,
): Promise<StoredRoutingVersion | null> {
  const profileId = routingProfileId(profileIdValue);
  const rows = await database().query(
    `SELECT ${VERSION_COLUMNS}, document, rule_set
       FROM routing_content_versions
      WHERE profile_id = $1
        AND status = 'approved'
      ORDER BY updated_at DESC
      LIMIT 1`,
    [profileId],
  );
  return rows[0] ? versionFromRow(rows[0] as DatabaseRow) : null;
}

export async function getEffectiveRoutingVersion(
  profileIdValue: unknown,
): Promise<EffectiveRoutingVersion> {
  const profileId = routingProfileId(profileIdValue);
  const published = await getPublishedRoutingVersion(profileId);
  if (published) {
    return {
      kind: "approved",
      id: published.id,
      profileId,
      contentVersion: published.contentVersion,
      document: published.document,
      ruleSet: published.ruleSet,
    };
  }
  const baseline = bundledVersion(profileId);
  const normalized = parseBundle(baseline.document, baseline.ruleSet);
  return {
    kind: "bundled",
    id: `bundled:${profileId}`,
    profileId,
    contentVersion: normalized.document.contentVersion,
    document: normalized.document,
    ruleSet: normalized.ruleSet,
  };
}

function bundledVersion(profileId: RoutingProfileId): {
  document: RoutingProfileContentDocument;
  ruleSet: RoutingRuleSetV1;
} {
  const document = routingContentDocuments.find(
    (item) => item.profileId === profileId,
  );
  if (!document || document.execution.kind !== "rules_v1") {
    throw new RoutingContentInputError(
      "Для профиля нет исходной версии rules_v1.",
    );
  }
  const ruleSet = routingRuleSetRegistry[
    document.execution.ruleSetId as keyof typeof routingRuleSetRegistry
  ];
  if (!ruleSet) {
    throw new RoutingContentInputError("Для профиля не найден набор правил.");
  }
  return { document, ruleSet };
}

export async function createStoredRoutingDraft(input: {
  profileId: unknown;
  contentVersion: string;
  changeSummary: string;
}): Promise<StoredRoutingVersion> {
  const profileId = routingProfileId(input.profileId);
  const sql = database();
  const previousRows = await sql.query(
    `SELECT id::text, document, rule_set
       FROM routing_content_versions
      WHERE profile_id = $1
        AND status = 'approved'
      LIMIT 1`,
    [profileId],
  );
  const previous = previousRows[0] as DatabaseRow | undefined;
  const baseline = previous
    ? { document: previous.document, ruleSet: previous.rule_set }
    : bundledVersion(profileId);
  const validatedBaseline = parseBundle(baseline.document, baseline.ruleSet);

  let document: RoutingProfileContentDocument;
  try {
    document = createRoutingContentDraft(validatedBaseline.document, {
      contentVersion: input.contentVersion,
      changeSummary: input.changeSummary,
      updatedAt: new Date().toISOString(),
    });
  } catch (reason) {
    throw new RoutingContentInputError(
      reason instanceof Error ? reason.message : "Не удалось создать черновик.",
    );
  }
  const ruleSet = validatedBaseline.ruleSet;
  const rows = await sql.query(
    `WITH inserted AS (
       INSERT INTO routing_content_versions (
         profile_id, content_version, status, document, rule_set,
         based_on_version_id, based_on_content_version
       ) VALUES ($1, $2, 'draft', $3::jsonb, $4::jsonb, $5, $6)
       RETURNING *
     ), revision AS (
       INSERT INTO routing_content_revisions (
         version_id, revision, document, rule_set
       )
       SELECT id, revision, document, rule_set FROM inserted
     ), audit AS (
       INSERT INTO routing_admin_audit_log (
         version_id, profile_id, action, details
       )
       SELECT id, profile_id, 'create_draft',
              jsonb_build_object('contentVersion', content_version)
         FROM inserted
     )
     SELECT ${VERSION_COLUMNS}, document, rule_set FROM inserted`,
    [
      profileId,
      document.contentVersion,
      JSON.stringify(document),
      JSON.stringify(ruleSet),
      previous ? String(previous.id) : null,
      validatedBaseline.document.contentVersion,
    ],
  );
  return versionFromRow(rows[0] as DatabaseRow);
}

export async function saveStoredRoutingDraft(input: {
  id: string;
  expectedRevision: number;
  document: unknown;
  ruleSet: unknown;
}): Promise<StoredRoutingVersion> {
  if (!/^\d+$/.test(input.id)) {
    throw new RoutingContentInputError("Некорректный идентификатор версии.");
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    throw new RoutingContentInputError("Некорректный номер ревизии.");
  }
  const bundle = parseBundle(input.document, input.ruleSet);
  if (bundle.document.status !== "draft") {
    throw new RoutingContentInputError("Изменять можно только черновик.");
  }
  const document: RoutingProfileContentDocument = {
    ...bundle.document,
    updatedAt: new Date().toISOString(),
  };
  assertRoutingContentDocument(document);

  const rows = await database().query(
    `WITH updated AS (
       UPDATE routing_content_versions
          SET document = $3::jsonb,
              rule_set = $4::jsonb,
              revision = revision + 1,
              updated_at = now()
        WHERE id = $1
          AND revision = $2
          AND status = 'draft'
          AND profile_id = $5
          AND content_version = $6
       RETURNING *
     ), revision AS (
       INSERT INTO routing_content_revisions (
         version_id, revision, document, rule_set
       )
       SELECT id, revision, document, rule_set FROM updated
     ), audit AS (
       INSERT INTO routing_admin_audit_log (
         version_id, profile_id, action, details
       )
       SELECT id, profile_id, 'save_draft',
              jsonb_build_object('revision', revision)
         FROM updated
     )
     SELECT ${VERSION_COLUMNS}, document, rule_set FROM updated`,
    [
      input.id,
      input.expectedRevision,
      JSON.stringify(document),
      JSON.stringify(bundle.ruleSet),
      document.profileId,
      document.contentVersion,
    ],
  );
  if (!rows[0]) {
    throw new RoutingVersionConflictError(
      "Черновик уже изменён, удалён или больше не доступен для редактирования.",
    );
  }
  return versionFromRow(rows[0] as DatabaseRow);
}

async function currentVersionForTransition(input: {
  id: string;
  expectedRevision: number;
}): Promise<StoredRoutingVersion> {
  if (!/^\d+$/.test(input.id)) {
    throw new RoutingContentInputError("Некорректный идентификатор версии.");
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    throw new RoutingContentInputError("Некорректный номер ревизии.");
  }
  const version = await getStoredRoutingVersion(input.id);
  if (!version || version.revision !== input.expectedRevision) {
    throw new RoutingVersionConflictError(
      "Версия уже изменилась или больше не существует.",
    );
  }
  return version;
}

function transformedDocument(
  transform: () => RoutingProfileContentDocument,
): RoutingProfileContentDocument {
  try {
    return transform();
  } catch (reason) {
    throw new RoutingContentInputError(
      reason instanceof Error ? reason.message : "Недопустимый переход версии.",
    );
  }
}

function assertPublicationReady(version: StoredRoutingVersion) {
  if (version.profileId !== "infectious") return;
  const issues = validateInfectiousPublicationReadiness(
    version.document.questions,
    version.ruleSet,
    version.document.controlCases,
  );
  if (issues.length > 0) {
    throw new RoutingContentInputError(
      `Версия не готова к публикации:\n${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
}

export async function submitStoredRoutingVersionForReview(input: {
  id: string;
  expectedRevision: number;
}): Promise<StoredRoutingVersion> {
  const current = await currentVersionForTransition(input);
  assertPublicationReady(current);
  const document = transformedDocument(() =>
    submitRoutingContentForReview(current.document, new Date().toISOString()),
  );
  const rows = await database().query(
    `WITH updated AS (
       UPDATE routing_content_versions
          SET status = 'in_review',
              document = $3::jsonb,
              revision = revision + 1,
              updated_at = now()
        WHERE id = $1
          AND revision = $2
          AND status = 'draft'
       RETURNING *
     ), revision AS (
       INSERT INTO routing_content_revisions (
         version_id, revision, document, rule_set
       )
       SELECT id, revision, document, rule_set FROM updated
     ), audit AS (
       INSERT INTO routing_admin_audit_log (
         version_id, profile_id, action, details
       )
       SELECT id, profile_id, 'submit_review',
              jsonb_build_object('revision', revision)
         FROM updated
     )
     SELECT ${VERSION_COLUMNS}, document, rule_set FROM updated`,
    [input.id, input.expectedRevision, JSON.stringify(document)],
  );
  if (!rows[0]) {
    throw new RoutingVersionConflictError(
      "Черновик уже изменился или больше не доступен для проверки.",
    );
  }
  return versionFromRow(rows[0] as DatabaseRow);
}

export async function approveStoredRoutingVersion(input: {
  id: string;
  expectedRevision: number;
  decisionDocument: string;
}): Promise<StoredRoutingVersion> {
  const decisionDocument = input.decisionDocument.trim();
  if (!decisionDocument || decisionDocument.length > 500) {
    throw new RoutingContentInputError(
      "Укажите реквизиты решения об утверждении (не более 500 символов).",
    );
  }
  const current = await currentVersionForTransition(input);
  if (current.profileId !== "infectious") {
    throw new RoutingContentInputError(
      "Публикация через конструктор пока разрешена только для инфекционного профиля.",
    );
  }
  assertPublicationReady(current);
  const approvedAt = new Date().toISOString();
  const document = transformedDocument(() =>
    approveRoutingContent(current.document, {
      approvedAt,
      approvedBy: "admin",
      decisionDocument,
    }),
  );
  const sql = database();
  const results = await sql.transaction((tx) => [
    tx.query(
      `WITH candidate AS (
         SELECT id
           FROM routing_content_versions
          WHERE id = $1
            AND revision = $2
            AND status = 'in_review'
            AND profile_id = $3
       ), updated AS (
         UPDATE routing_content_versions
            SET status = 'archived',
                document = jsonb_set(
                  jsonb_set(document, '{status}', '"archived"'::jsonb),
                  '{updatedAt}', to_jsonb($4::text)
                ),
                revision = revision + 1,
                updated_at = now()
          WHERE profile_id = $3
            AND status = 'approved'
            AND id <> $1
            AND EXISTS (SELECT 1 FROM candidate)
         RETURNING *
       ), revision AS (
         INSERT INTO routing_content_revisions (
           version_id, revision, document, rule_set
         )
         SELECT id, revision, document, rule_set FROM updated
       ), audit AS (
         INSERT INTO routing_admin_audit_log (
           version_id, profile_id, action, details
         )
         SELECT id, profile_id, 'archive',
                jsonb_build_object('replacedByVersionId', $1)
           FROM updated
       )
       SELECT id::text FROM updated`,
      [input.id, input.expectedRevision, current.profileId, approvedAt],
    ),
    tx.query(
      `WITH updated AS (
         UPDATE routing_content_versions
            SET status = 'approved',
                document = $3::jsonb,
                revision = revision + 1,
                updated_at = now()
          WHERE id = $1
            AND revision = $2
            AND status = 'in_review'
         RETURNING *
       ), revision AS (
         INSERT INTO routing_content_revisions (
           version_id, revision, document, rule_set
         )
         SELECT id, revision, document, rule_set FROM updated
       ), audit AS (
         INSERT INTO routing_admin_audit_log (
           version_id, profile_id, action, details
         )
         SELECT id, profile_id, 'approve',
                jsonb_build_object(
                  'revision', revision,
                  'decisionDocument', $4::text
                )
           FROM updated
       )
       SELECT ${VERSION_COLUMNS}, document, rule_set FROM updated`,
      [
        input.id,
        input.expectedRevision,
        JSON.stringify(document),
        decisionDocument,
      ],
    ),
  ]);
  const rows = results[1];
  if (!rows?.[0]) {
    throw new RoutingVersionConflictError(
      "Версия уже изменилась или больше не ожидает утверждения.",
    );
  }
  return versionFromRow(rows[0] as DatabaseRow);
}

export async function archiveStoredRoutingVersion(input: {
  id: string;
  expectedRevision: number;
}): Promise<StoredRoutingVersion> {
  const current = await currentVersionForTransition(input);
  const document = transformedDocument(() =>
    archiveRoutingContent(current.document, new Date().toISOString()),
  );
  const rows = await database().query(
    `WITH updated AS (
       UPDATE routing_content_versions
          SET status = 'archived',
              document = $3::jsonb,
              revision = revision + 1,
              updated_at = now()
        WHERE id = $1
          AND revision = $2
          AND status = 'approved'
       RETURNING *
     ), revision AS (
       INSERT INTO routing_content_revisions (
         version_id, revision, document, rule_set
       )
       SELECT id, revision, document, rule_set FROM updated
     ), audit AS (
       INSERT INTO routing_admin_audit_log (
         version_id, profile_id, action, details
       )
       SELECT id, profile_id, 'archive',
              jsonb_build_object('revision', revision)
         FROM updated
     )
     SELECT ${VERSION_COLUMNS}, document, rule_set FROM updated`,
    [input.id, input.expectedRevision, JSON.stringify(document)],
  );
  if (!rows[0]) {
    throw new RoutingVersionConflictError(
      "Утверждённая версия уже изменилась или была архивирована.",
    );
  }
  return versionFromRow(rows[0] as DatabaseRow);
}

export const routingContentStoreTestUtils = {
  parseBundle,
  summaryFromRow,
};
