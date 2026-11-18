"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Key } from "@/lib/i18n";

const ICONS: Record<string, string> = {
  home: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  history: "M4 6h16M4 12h16M4 18h10",
  calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  mapLogs: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
};

// Five slots with the add button in the middle.
const TABS: { href: string; key: Key }[] = [
  { href: "/", key: "home" },
  { href: "/transactions", key: "history" },
  { href: "/add", key: "add" },
  { href: "/calendar", key: "calendar" },
  { href: "/map", key: "mapLogs" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl">
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0"
      >
        <ul className="mx-auto grid h-[62px] max-w-3xl grid-cols-5 items-center">
          {TABS.map((tab) => {
            const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
            if (tab.key === "add") {
              return (
                <li key={tab.href} className="flex justify-center">
                  <Link
                    href="/add"
                    aria-label={t("addEntry")}
                    className="press group -mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-page text-3xl leading-none text-white shadow-[0_6px_16px_rgba(42,120,214,0.4)] hover:shadow-[0_8px_22px_rgba(42,120,214,0.55)] md:mt-0 md:h-11 md:w-11 md:border-0 md:text-2xl"
                    style={{ background: "linear-gradient(135deg, var(--hero-mid), var(--hero-to))" }}
                  >
                    <span className="transition-transform duration-300 group-hover:rotate-90">+</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press group flex flex-col items-center gap-0.5 whitespace-nowrap py-1 text-[11px] md:flex-row md:justify-center md:gap-2 md:text-sm ${
                    active ? "font-bold text-accent-ink" : "text-ink2 hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300 md:w-9 ${
                      active ? "bg-accent-soft" : "group-hover:bg-wash"
                    }`}
                  >
                  <svg key={String(active)} className={active ? "pop" : ""} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONS[tab.key]} />
                  </svg>
                  </span>
                  {t(tab.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="px-4 pb-28 pt-5 md:pb-10">{children}</main>
    </div>
  );
}
