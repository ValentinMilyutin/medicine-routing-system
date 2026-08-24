import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Не задана DATABASE_URL.");
}

const sql = neon(databaseUrl);

async function queryWithRetry(query) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await sql.query(query);
    } catch (reason) {
      lastError = reason;
      const retryable =
        reason instanceof Error &&
        (reason.message.includes("Error connecting to database") ||
          reason.message.includes("fetch failed"));
      if (!retryable || attempt === 5) throw reason;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

const tables = await queryWithRetry(`
  SELECT table_name
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'schema_migrations',
       'routing_content_versions',
       'routing_content_revisions',
       'routing_admin_audit_log',
       'feedback_recipients',
       'routing_feedback',
       'normative_documents',
       'normative_document_references',
       'normative_document_relations',
       'usage_daily_stats',
       'operations_admin_audit_log'
     )
   ORDER BY table_name
`);
const counts = await queryWithRetry(`
  SELECT
    (SELECT count(*)::integer FROM routing_content_versions) AS versions,
    (SELECT count(*)::integer FROM routing_content_revisions) AS revisions,
    (SELECT count(*)::integer FROM routing_admin_audit_log) AS audit_events,
    (SELECT count(*)::integer FROM normative_documents) AS documents,
    (SELECT count(*)::integer FROM routing_feedback) AS feedback,
    (SELECT count(*)::integer FROM feedback_recipients) AS recipients
`);

if (tables.length !== 11) {
  throw new Error(`Ожидались 11 таблиц, обнаружено: ${tables.length}.`);
}

console.log(
  `Neon готов: 11 таблиц; версии=${counts[0].versions}, ревизии=${counts[0].revisions}, аудит=${counts[0].audit_events}, документы=${counts[0].documents}, обращения=${counts[0].feedback}, получатели=${counts[0].recipients}.`,
);
