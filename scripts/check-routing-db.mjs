import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Не задана DATABASE_URL.");
}

const sql = neon(databaseUrl);
const tables = await sql`
  SELECT table_name
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'routing_content_versions',
       'routing_content_revisions',
       'routing_admin_audit_log'
     )
   ORDER BY table_name
`;
const counts = await sql`
  SELECT
    (SELECT count(*)::integer FROM routing_content_versions) AS versions,
    (SELECT count(*)::integer FROM routing_content_revisions) AS revisions,
    (SELECT count(*)::integer FROM routing_admin_audit_log) AS audit_events
`;

if (tables.length !== 3) {
  throw new Error(`Ожидались 3 таблицы, обнаружено: ${tables.length}.`);
}

console.log(
  `Neon готов: 3 таблицы; версии=${counts[0].versions}, ревизии=${counts[0].revisions}, аудит=${counts[0].audit_events}.`,
);
