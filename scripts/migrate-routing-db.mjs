import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Не задана DATABASE_URL. Подключите Neon к Vercel и выполните vercel env pull .env.local.",
  );
}

const sql = neon(databaseUrl);

function retryableConnectionError(reason) {
  return (
    reason instanceof Error &&
    (reason.message.includes("Error connecting to database") ||
      reason.message.includes("fetch failed"))
  );
}

async function queryWithRetry(query, parameters = []) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await sql.query(query, parameters);
    } catch (reason) {
      lastError = reason;
      if (!retryableConnectionError(reason) || attempt === 5) throw reason;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

await queryWithRetry(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const migrationDirectory = fileURLToPath(
  new URL("../db/migrations/", import.meta.url),
);
const migrationFiles = (await readdir(migrationDirectory))
  .filter((filename) => /^\d+_.+\.sql$/.test(filename))
  .sort();
let applied = 0;
let statementCount = 0;

for (const filename of migrationFiles) {
  const existing = await queryWithRetry(
    "SELECT 1 FROM schema_migrations WHERE filename = $1",
    [filename],
  );
  if (existing.length > 0) continue;
  const migration = await readFile(join(migrationDirectory, filename), "utf8");
  const statements = migration
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await queryWithRetry(statement);
    statementCount += 1;
  }
  await queryWithRetry(
    "INSERT INTO schema_migrations (filename) VALUES ($1)",
    [filename],
  );
  applied += 1;
}

console.log(
  `Миграции готовы: применено файлов=${applied}, SQL-команд=${statementCount}.`,
);
