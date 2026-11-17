import { NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";
import { loadMeta, loadStats } from "@/lib/queries";
import { listTx } from "@/lib/tx";
import { checkStorage } from "@/lib/storage";

type Step = { name: string; ok: boolean; ms: number; detail: string };

// Runs each server-side step separately and reports which ones fail.
// Never returns secret values, only whether they are set.
export async function GET() {
  const steps: Step[] = [];
  const run = async (name: string, fn: () => Promise<string>) => {
    const t0 = Date.now();
    try {
      const detail = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out after 15s")), 15000)),
      ]);
      steps.push({ name, ok: true, ms: Date.now() - t0, detail });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      steps.push({
        name,
        ok: false,
        ms: Date.now() - t0,
        detail: `${code ? `[${code}] ` : ""}${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  let dbTarget = "not set";
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    dbTarget = `${u.hostname}:${u.port || "5432"}`;
  } catch {
    if (process.env.DATABASE_URL) dbTarget = "set, but not a valid URL";
  }
  const month = new Date().toISOString().slice(0, 7);

  await withDb(async () => {
    await run("Database connection", async () => {
      const sql = await db();
      const [r] = await sql`select current_user as u, current_setting('server_version') as v`;
      return `user ${r.u}, Postgres ${r.v}`;
    });
    await run("Tables", async () => {
      const sql = await db();
      const [r] = await sql`
        select (select count(*) from categories)::int as categories,
               (select count(*) from people)::int as people,
               (select count(*) from events)::int as events,
               (select count(*) from transactions)::int as transactions
      `;
      return `categories ${r.categories}, people ${r.people}, events ${r.events}, entries ${r.transactions}`;
    });
    await run("Load categories / people / events", async () => {
      const m = await loadMeta();
      return `${m.categories.length} categories, ${m.people.length} people, ${m.events.length} events`;
    });
    await run("Load entries", async () => `${(await listTx({ limit: 5 })).length} rows`);
    await run("Load dashboard statistics", async () => {
      const s = await loadStats(month);
      return `${s.trend.length} months, ${s.daily.length} days, ${s.byCategory.length} categories`;
    });
  });
  await run("Receipt storage", checkStorage);

  return NextResponse.json({
    version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    region: process.env.VERCEL_REGION ?? "local",
    database: dbTarget,
    configured: {
      APP_PASSWORD: !!process.env.APP_PASSWORD,
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NAVER_CLIENT_ID: !!process.env.NAVER_CLIENT_ID,
      NAVER_CLIENT_SECRET: !!process.env.NAVER_CLIENT_SECRET,
    },
    steps,
  });
}
