import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())");
const files = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
const migrationCount = await client.query("select count(*)::int as count from public.app_migrations");
const legacyDatabase = await client.query("select to_regclass('public.organizations') is not null as exists");
if (migrationCount.rows[0].count === 0 && legacyDatabase.rows[0].exists) {
  for (const name of files.filter((file) => file < "202608010000")) {
    await client.query("insert into public.app_migrations(name) values($1) on conflict do nothing", [name]);
    console.log(`Baselined ${name}`);
  }
}
for (const name of files) {
  const applied = await client.query("select 1 from public.app_migrations where name=$1", [name]);
  if (applied.rowCount) continue;
  const sql = await readFile(`supabase/migrations/${name}`, "utf8");
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("insert into public.app_migrations(name) values($1)", [name]);
    await client.query("commit");
    console.log(`Applied ${name}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
const result = await client.query("select to_regclass('public.operations') as operations");
console.log(result.rows[0]);
await client.end();
