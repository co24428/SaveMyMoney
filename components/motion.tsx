"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Animates a number towards `value` (ease-out), restarting from the last shown value. */
export function useCountUp(value: number, duration = 700): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const duration_ = reduced() ? 0 : duration;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = duration_ ? Math.min((now - start) / duration_, 1) : 1;
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  return <>{format(Math.round(useCountUp(value)))}</>;
}

/** Grey shimmering placeholder blocks shown while data loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 !rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ───────── Toasts ───────── */

type Toast = { id: number; text: string; tone: "good" | "info" };
const TOAST_KEY = "smm_toast";
const ToastContext = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const display = useCallback((text: string, tone: Toast["tone"]) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, tone });
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  const show = useCallback(
    (text: string, tone: Toast["tone"] = "good") => {
      // Also kept briefly in sessionStorage, so it still shows if the next page is a full reload.
      try {
        sessionStorage.setItem(TOAST_KEY, JSON.stringify({ text, tone, at: Date.now() }));
      } catch {}
      display(text, tone);
    },
    [display],
  );
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TOAST_KEY);
      if (!raw) return;
      sessionStorage.removeItem(TOAST_KEY);
      const saved = JSON.parse(raw) as { text: string; tone: Toast["tone"]; at: number };
      if (Date.now() - saved.at < 3000) {
        const id = setTimeout(() => display(saved.text, saved.tone), 0);
        return () => clearTimeout(id);
      }
    } catch {}
  }, [display]);
  useEffect(() => {
    if (!toast) return;
    // Shown: drop the stored copy so it doesn't repeat on a later reload.
    const id = setTimeout(() => {
      try {
        sessionStorage.removeItem(TOAST_KEY);
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        {toast && (
          <div
            key={toast.id}
            className="absolute bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 flex items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-page shadow-lg md:bottom-8"
            style={{ animation: "toast-in 0.3s cubic-bezier(0.22,1,0.36,1) both", transform: "translateX(-50%)" }}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${toast.tone === "good" ? "bg-good" : "bg-accent"}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5 10 17 19 7" strokeDasharray="24" style={{ animation: "check-draw 0.35s 0.1s ease-out both" }} />
              </svg>
            </span>
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Horizontal swipe on touch screens: calls onLeft / onRight after a clear sideways drag. */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? onLeft : onRight)();
    },
  };
}
