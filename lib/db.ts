import postgres from "postgres";
import { DEFAULT_CATEGORIES, SCHEMA_SQL } from "./schema";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __smmSql?: Sql; __smmReady?: Promise<void> };

function client(): Sql {
  if (!g.__smmSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__smmSql = postgres(url, {
      prepare: false, // required for Supabase's transaction pooler
      max: 3,
      idle_timeout: 20,
      ssl: local ? false : "require",
      onnotice: () => {},
    });
  }
  return g.__smmSql;
}

async function init(sql: Sql) {
  await sql.unsafe(SCHEMA_SQL);
  const [{ n }] = await sql`select count(*)::int as n from categories`;
  if (n === 0) {
    const rows = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sort: i }));
    await sql`insert into categories ${sql(rows, "kind", "name", "icon", "sort")}`;
  }
}

/** Returns the SQL client, making sure the schema exists first. */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!g.__smmReady) {
    g.__smmReady = init(sql).catch((e) => {
      g.__smmReady = undefined;
      throw e;
    });
  }
  await g.__smmReady;
  return sql;
}
