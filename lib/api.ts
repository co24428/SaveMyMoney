import { NextResponse } from "next/server";

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
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      const message = e instanceof Error ? e.message : "Server error";
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
