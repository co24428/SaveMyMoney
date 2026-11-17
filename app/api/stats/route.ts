import { NextResponse } from "next/server";
import { MONTH_RE, bad, route } from "@/lib/api";
import { loadStats } from "@/lib/queries";

// Everything the dashboard needs for one month, in one request.
export const GET = route(async (req: Request) => {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) bad("Invalid month");
  return NextResponse.json(await loadStats(month));
});
