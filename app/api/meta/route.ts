import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/api";

// Categories, people and events in one request.
export const GET = route(async () => {
  const sql = await db();
  // One query on purpose: Supabase's transaction pooler does not handle several
  // queries sent at once on the same connection.
  const [row] = await sql`
    select
      coalesce((select json_agg(json_build_object('id', id, 'kind', kind, 'name', name, 'icon', icon)
                               order by kind, sort, id) from categories), '[]'::json) as categories,
      coalesce((select json_agg(json_build_object('id', id, 'name', name) order by name)
                from people), '[]'::json) as people,
      coalesce((select json_agg(json_build_object('id', id, 'name', name) order by created_at desc, id desc)
                from events), '[]'::json) as events
  `;
  const { categories, people, events } = row;
  return NextResponse.json({ categories, people, events });
});
