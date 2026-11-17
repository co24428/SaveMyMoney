import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/api";

// Categories, people and events in one request.
export const GET = route(async () => {
  const sql = await db();
  const [categories, people, events] = await Promise.all([
    sql`select id, kind, name, icon from categories order by kind, sort, id`,
    sql`select id, name from people order by name`,
    sql`select id, name from events order by created_at desc, id desc`,
  ]);
  return NextResponse.json({ categories, people, events });
});
