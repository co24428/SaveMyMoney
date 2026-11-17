"use client";

import { useState } from "react";
import { Card, PageTitle } from "@/components/ui";
import { ApiError, api, useFetch, type Kind, type Meta } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

type Item = { id: number; name: string; icon?: string };

function ListManager({ type, items, kind, onChanged }: {
  type: "categories" | "people" | "events";
  items: Item[];
  kind?: Kind;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const withIcon = type === "categories";
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? t("alreadyExists") : t("error"));
      return false;
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await run(() => api(`/api/meta/${type}`, { method: "POST", body: { name, icon, kind } }))) {
      setName("");
      setIcon("");
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    if (await run(() => api(`/api/meta/${type}/${editing.id}`, { method: "PUT", body: editing }))) setEditing(null);
  }

  const small = "rounded-lg px-2 py-1 text-sm";
  return (
    <div>
      <ul className="divide-y divide-line">
        {items.map((it) =>
          editing?.id === it.id ? (
            <li key={it.id}>
              <form onSubmit={saveEdit} className="flex items-center gap-2 py-1.5">
                {withIcon && (
                  <input className="field !w-14 text-center" aria-label={t("icon")} value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
                )}
                <input className="field" aria-label={t("name")} autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <button className={`${small} font-semibold text-accent-ink`}>{t("save")}</button>
                <button type="button" className={`${small} text-ink2`} onClick={() => setEditing(null)}>
                  {t("cancel")}
                </button>
              </form>
            </li>
          ) : (
            <li key={it.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate">
                {it.icon ? `${it.icon} ` : ""}
                {it.name}
              </span>
              <button className={`${small} text-accent-ink`} onClick={() => setEditing(it)}>
                {t("edit")}
              </button>
              <button
                className={`${small} text-critical`}
                onClick={() => {
                  if (window.confirm(t("confirmDeleteItem", { name: it.name }))) {
                    run(() => api(`/api/meta/${type}/${it.id}`, { method: "DELETE" }));
                  }
                }}
              >
                {t("delete")}
              </button>
            </li>
          ),
        )}
      </ul>
      <form onSubmit={add} className="mt-2 flex items-center gap-2">
        {withIcon && (
          <input className="field !w-14 text-center" placeholder="🙂" aria-label={t("icon")} value={icon} onChange={(e) => setIcon(e.target.value)} />
        )}
        <input className="field" placeholder={t("name")} aria-label={t("name")} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!name.trim()}>
          {t("addItem")}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const meta = useFetch<Meta>("/api/meta");
  const m = meta.data;

  async function logout() {
    await api("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <PageTitle>{t("settings")}</PageTitle>
      <div className="space-y-4">
        <Card title={t("language")}>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-wash p-1">
            {(["en", "ko"] as const).map((l) => (
              <button
                key={l}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`rounded-lg py-2 text-sm font-semibold ${lang === l ? "bg-surface shadow-sm" : "text-ink2"}`}
              >
                {l === "en" ? "English" : "한국어"}
              </button>
            ))}
          </div>
        </Card>
        {meta.error ? (
          <p className="text-sm text-critical">{t("error")}</p>
        ) : !m ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : (
          <>
            <Card title={t("expenseCategories")}>
              <ListManager type="categories" kind="expense" items={m.categories.filter((c) => c.kind === "expense")} onChanged={meta.reload} />
            </Card>
            <Card title={t("incomeCategories")}>
              <ListManager type="categories" kind="income" items={m.categories.filter((c) => c.kind === "income")} onChanged={meta.reload} />
            </Card>
            <Card title={t("people")}>
              <ListManager type="people" items={m.people} onChanged={meta.reload} />
            </Card>
            <Card title={t("events")}>
              <ListManager type="events" items={m.events} onChanged={meta.reload} />
            </Card>
          </>
        )}
        <button onClick={logout} className="w-full rounded-xl border border-line bg-surface py-3 font-medium text-critical">
          {t("logout")}
        </button>
      </div>
    </>
  );
}
