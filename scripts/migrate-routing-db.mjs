import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Не задана DATABASE_URL. Подключите Neon к Vercel и выполните vercel env pull .env.local.",
  );
}

const migrationUrl = new URL(
  "../db/migrations/001_routing_content.sql",
  import.meta.url,
);
const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
const statements = migration
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);
const sql = neon(databaseUrl);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Применена миграция: ${statements.length} SQL-команд.`);
