"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Page state kept in the URL, so Back returns to the same month / day / filters. */
export function useQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname],
  );
  return { get: (k: string) => params.get(k), set };
}

export const validMonth = (m: string | null, fallback: string) =>
  m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : fallback;
