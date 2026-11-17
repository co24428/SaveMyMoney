import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { DEFAULT_CATEGORIES, SCHEMA_SQL } from "./schema";

type Sql = ReturnType<typeof postgres>;

// One short-lived connection per request. Serverless hosts pause the process
// between requests, and a connection kept open across that pause can go dead
// without notice, which makes the next query hang. So nothing is reused.
const requestScope = new AsyncLocalStorage<{ sql?: Sql }>();
const g = globalThis as unknown as { __smmReady?: Promise<void> };

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    prepare: false, // required for Supabase's transaction pooler
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    ssl: local ? false : "require",
    onnotice: () => {},
  });
}

/** Creates tables and default categories, only if they are missing. */
async function init(sql: Sql) {
  const [{ ready, strict_amount }] = await sql`
    select to_regclass('public.transactions') is not null
       and to_regclass('public.login_attempts') is not null as ready,
           exists (
             select 1 from pg_constraint
             where conname = 'transactions_amount_check'
               and pg_get_constraintdef(oid) like '%> 0%'
           ) as strict_amount
  `;
  if (!ready) {
    await sql.begin(async (tx) => {
      // Serialises concurrent first requests so the schema is created once.
      await tx`select pg_advisory_xact_lock(727274)`;
      await tx.unsafe(SCHEMA_SQL);
    });
  }
  // Seed the default categories whenever the list is empty (also repairs a
  // first run that was interrupted after the tables were created).
  if (strict_amount) {
    // Upgrade older databases: zero-amount entries (e.g. a free meal) are allowed.
    await sql`
      alter table transactions
        drop constraint transactions_amount_check,
        add constraint transactions_amount_check check (amount >= 0)
    `;
  }
  const [{ n }] = await sql`select count(*)::int as n from categories`;
  if (n === 0) {
    const rows = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sort: i }));
    await sql`insert into categories ${sql(rows, "kind", "name", "icon", "sort")}`;
  }
}

/** Runs a request handler with its own database connection, closed afterwards. */
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  const scope: { sql?: Sql } = {};
  try {
    return await requestScope.run(scope, fn);
  } finally {
    await scope.sql?.end({ timeout: 2 }).catch(() => {});
  }
}

/** The current request's SQL client. Must be called inside `withDb` (see `route`). */
export async function db(): Promise<Sql> {
  const scope = requestScope.getStore();
  if (!scope) throw new Error("db() called outside a request");
  const sql = (scope.sql ??= connect());
  if (!g.__smmReady) {
    g.__smmReady = init(sql).catch((e) => {
      g.__smmReady = undefined;
      throw e;
    });
  }
  await g.__smmReady;
  return sql;
}
