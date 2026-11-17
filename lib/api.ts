import { NextResponse } from "next/server";
import { withDb } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps a route handler so thrown errors become JSON responses. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await withDb(() => fn(...args));
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      if ((e as { code?: string })?.code === "23503") {
        // Foreign key: the chosen category, person or event was deleted meanwhile.
        return NextResponse.json({ error: "A selected category, person or event no longer exists." }, { status: 400 });
      }
      console.error(e);
      const code = (e as { code?: string })?.code;
      const message = `${code ? `[${code}] ` : ""}${e instanceof Error ? e.message : "Server error"}`;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function bad(message: string): never {
  throw new HttpError(400, message);
}

export function toId(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Invalid id");
  return n;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
