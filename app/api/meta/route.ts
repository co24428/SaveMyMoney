import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { loadMeta } from "@/lib/queries";

// Categories, people and events in one request.
export const GET = route(async (_req: Request) => NextResponse.json(await loadMeta()));
