"use client";

import { useCallback, useEffect, useState } from "react";

export type Kind = "expense" | "income";
export type Category = { id: number; kind: Kind; name: string; icon: string };
export type Named = { id: number; name: string };
export type Meta = { categories: Category[]; people: Named[]; events: Named[] };
export type Tx = {
  id: number;
  kind: Kind;
  amount: number;
  date: string;
  time: string | null;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  event_id: number | null;
  event_name: string | null;
  method: string | null;
  note: string;
  place_name: string | null;
  place_address: string | null;
  lat: number | null;
  lng: number | null;
  receipt_path: string | null;
  people: Named[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const isForm = init?.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: isForm ? (init!.body as FormData) : init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(isForm ? 60000 : 25000),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    throw new ApiError(0, timedOut ? "The server did not answer in time." : "Could not reach the server.");
  }
  if (res.status === 401 && path !== "/api/login") {
    window.location.href = "/login";
    throw new ApiError(401, "unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

/** Fetches JSON whenever `path` changes. `path = null` skips the request. */
export function useFetch<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({
    path: null,
    data: null,
    error: null,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path)
      .then((data) => live && setState({ path, data, error: null }))
      .catch((e: Error) => live && setState({ path, data: null, error: e.message }));
    return () => {
      live = false;
    };
  }, [path, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const current = state.path === path;
  return {
    data: state.data, // keeps the previous result on screen while the next one loads
    error: current ? state.error : null,
    loading: !!path && !current,
    reload,
  };
}
