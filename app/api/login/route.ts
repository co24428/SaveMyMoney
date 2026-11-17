import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, checkPassword, makeToken, passwordConfigured } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/api";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

export const POST = route(async (req: Request) => {
  if (!passwordConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const sql = await db();
  const [{ n }] = await sql`
    select count(*)::int as n from login_attempts
    where ip = ${ip} and at > now() - make_interval(mins => ${WINDOW_MIN})
  `;
  if (n >= MAX_FAILS) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  if (!(await checkPassword(body?.password))) {
    await sql`insert into login_attempts (ip) values (${ip})`;
    await sql`delete from login_attempts where at < now() - interval '1 day'`;
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
});
