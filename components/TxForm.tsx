"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, useFetch, type Category, type Kind, type Meta, type Named, type Tx } from "@/lib/client";
import { nowHm, todayYmd, won } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { CategoryTile, ErrorNote, iconBtn } from "./ui";
import PlacePicker, { EMPTY_PLACE, type PlaceValue } from "./PlacePicker";

const METHODS = ["card", "cash", "transfer"] as const;

const QUICK = [1000, 5000, 10000, 50000];
const VISIBLE_CATEGORIES = 7; // the 8th grid cell is "More"

/** One line of the details card: icon column + content. */
function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line py-3 last:border-0">
      <span className="w-6 shrink-0 pt-1 text-center text-base text-muted" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="sr-only">{label}</div>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? "border-accent bg-accent-soft font-semibold text-accent-ink" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function InlineAdd({ label, value, onChange, onAdd, onCancel }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        className="field"
        autoFocus
        maxLength={60}
        placeholder={label}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // add the item instead of submitting the whole entry
            onAdd();
          }
        }}
      />
      <button type="button" onClick={onAdd} disabled={!value.trim()} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {t("addItem")}
      </button>
      <button type="button" onClick={onCancel} className="shrink-0 px-1 text-sm text-ink2">
        {t("cancel")}
      </button>
    </div>
  );
}

export default function TxForm({ initial, defaultDate, title }: { initial?: Tx; defaultDate?: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const meta = useFetch<Meta>("/api/meta");
  // Items created inline, shown before the next /api/meta load.
  const [extraPeople, setExtraPeople] = useState<Named[]>([]);
  const [extraEvents, setExtraEvents] = useState<Named[]>([]);

  const [kind, setKind] = useState<Kind>(initial?.kind ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayYmd());
  const [time, setTime] = useState(initial ? (initial.time ?? "") : nowHm());
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
  const [method, setMethod] = useState<string>(initial?.method ?? "card");
  const [people, setPeople] = useState<number[]>(initial?.people.map((p) => p.id) ?? []);
  const [eventId, setEventId] = useState<number | null>(initial?.event_id ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [place, setPlace] = useState<PlaceValue>(
    initial
      ? { name: initial.place_name ?? "", address: initial.place_address, lat: initial.lat, lng: initial.lng }
      : EMPTY_PLACE,
  );
  const [receipt, setReceipt] = useState<string | null>(initial?.receipt_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // null = closed; a string = the inline "add new" input is open.
  const [newPerson, setNewPerson] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  const categories: Category[] = (meta.data?.categories ?? []).filter((c) => c.kind === kind);
  const merge = (a: Named[], b: Named[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  const allPeople = merge(meta.data?.people ?? [], extraPeople);
  const allEvents = merge(extraEvents, meta.data?.events ?? []);

  const done = () => (window.history.length > 1 ? router.back() : router.push("/transactions"));

  const fail = (err: unknown) => setError(`${t("error")} ${err instanceof Error ? err.message : ""}`);

  async function createNamed(type: "people" | "events", raw: string): Promise<Named | null> {
    const name = raw.trim();
    if (!name) return null;
    setError("");
    try {
      return await api<Named>(`/api/meta/${type}`, { method: "POST", body: { name } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const existing = (type === "people" ? allPeople : allEvents).find((x) => x.name === name);
        if (existing) return existing;
      }
      fail(e);
      return null;
    }
  }

  async function addPerson() {
    const p = await createNamed("people", newPerson ?? "");
    if (!p) return;
    setExtraPeople((xs) => merge(xs, [p]));
    setPeople((ids) => (ids.includes(p.id) ? ids : [...ids, p.id]));
    setNewPerson(null);
  }

  async function addEvent() {
    const ev = await createNamed("events", newEvent ?? "");
    if (!ev) return;
    setExtraEvents((xs) => merge([ev], xs));
    setEventId(ev.id);
    setNewEvent(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", await compressImage(file), "receipt.jpg");
      const { path } = await api<{ path: string }>("/api/receipts", { method: "POST", body: form });
      setReceipt(path);
    } catch (err) {
      fail(err);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount === "") return setError(t("required"));
    const value = Number(amount);
    setBusy(true);
    setError("");
    try {
      await api(initial ? `/api/transactions/${initial.id}` : "/api/transactions", {
        method: initial ? "PUT" : "POST",
        body: {
          kind,
          amount: value,
          date,
          time: time || null,
          category_id: categories.some((c) => c.id === categoryId) ? categoryId : null,
          method: kind === "expense" ? method : null,
          people,
          event_id: eventId,
          note,
          place_name: place.name.trim() || null,
          place_address: place.address,
          lat: place.lat,
          lng: place.lng,
          receipt_path: receipt,
        },
      });
      done();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await api(`/api/transactions/${initial.id}`, { method: "DELETE" });
      done();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  const bump = (n: number) => setAmount((a) => String(Math.min((Number(a) || 0) + n, 2_000_000_000)));
  const shown = amount === "" ? "" : Number(amount).toLocaleString("ko-KR");
  const selectedIndex = categories.findIndex((c) => c.id === categoryId);
  const expanded = showAllCats || selectedIndex >= VISIBLE_CATEGORIES || categories.length <= VISIBLE_CATEGORIES + 1;
  const visibleCats = expanded ? categories : categories.slice(0, VISIBLE_CATEGORIES);
  const pill = "pill";
  const plain = "w-full bg-transparent py-1 outline-none placeholder:text-muted";

  return (
    <form onSubmit={submit}>
      <div className="mb-4 flex min-h-10 items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        <button type="button" onClick={done} aria-label={t("close")} className={iconBtn}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-wash p-1" role="group">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-xl py-2 text-sm font-semibold ${kind === k ? "bg-surface text-ink shadow-card" : "text-ink2"}`}
          >
            {t(k)}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-baseline justify-center gap-1">
        <span className="text-[28px] font-medium text-muted">₩</span>
        <input
          className="min-w-[2ch] max-w-full bg-transparent text-center text-[42px] font-bold tracking-tight tabular-nums outline-none placeholder:text-baseline"
          style={{ width: `${Math.max(shown.length, 1) + 0.6}ch` }}
          inputMode="numeric"
          placeholder="0"
          aria-label={t("amount")}
          aria-describedby="amount-hint"
          autoFocus={!initial}
          value={shown}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10))}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {QUICK.map((n) => (
          <button key={n} type="button" onClick={() => bump(n)} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink2 shadow-card hover:text-accent-ink">
            +{n.toLocaleString("ko-KR")}
          </button>
        ))}
        {amount !== "" && (
          <button type="button" onClick={() => setAmount("")} className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink">
            {t("clear")}
          </button>
        )}
      </div>
      <p id="amount-hint" className="mt-2 text-center text-[11px] text-muted">
        {t("zeroHint")}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <label className={pill}>
          <span aria-hidden>📅</span>
          <span className="sr-only">{t("date")}</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className={pill}>
          <span aria-hidden>🕒</span>
          <span className="sr-only">{t("time")}</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        {kind === "expense" && (
          <label className={pill}>
            <span aria-hidden>💳</span>
            <span className="sr-only">{t("method")}</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(m)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <section className="mt-4 rounded-[20px] bg-surface p-4 shadow-card" aria-label={t("category")}>
        {meta.error ? (
          <ErrorNote detail={meta.error} />
        ) : !meta.data ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : (
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {visibleCats.map((c) => {
              const on = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategoryId(on ? null : c.id)}
                  className={`flex flex-col items-center gap-1 text-[11.5px] ${on ? "font-bold text-ink" : "text-ink2"}`}
                >
                  <span className={`rounded-[18px] ${on ? "ring-[2.5px] ring-accent ring-offset-2 ring-offset-surface" : ""}`}>
                    <CategoryTile icon={c.icon} id={c.id} size="lg" />
                  </span>
                  <span className="max-w-full truncate">{c.name}</span>
                </button>
              );
            })}
            {categories.length > VISIBLE_CATEGORIES + 1 && selectedIndex < VISIBLE_CATEGORIES && (
              <button type="button" onClick={() => setShowAllCats((v) => !v)} className="flex flex-col items-center gap-1 text-[11.5px] text-ink2">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wash text-xl text-muted">{expanded ? "−" : "⋯"}</span>
                {expanded ? t("less") : t("more")}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="mt-3 rounded-[20px] bg-surface px-4 py-1 shadow-card">
        <Row icon="✎" label={t("forWhat")}>
          <input className={plain} placeholder={t("notePlaceholder")} aria-label={t("forWhat")} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Row>

        <Row icon="👥" label={t("withWho")}>
          <div className="flex flex-wrap gap-1.5">
            {allPeople.map((p) => (
              <Chip
                key={p.id}
                active={people.includes(p.id)}
                onClick={() => setPeople((ids) => (ids.includes(p.id) ? ids.filter((i) => i !== p.id) : [...ids, p.id]))}
              >
                {p.name}
              </Chip>
            ))}
            {newPerson === null && (
              <button type="button" onClick={() => setNewPerson("")} className="rounded-full border border-dashed border-baseline px-3 py-1 text-sm text-ink2">
                {t("newPerson")}
              </button>
            )}
          </div>
          {newPerson !== null && (
            <InlineAdd label={t("newPersonPrompt")} value={newPerson} onChange={setNewPerson} onAdd={addPerson} onCancel={() => setNewPerson(null)} />
          )}
        </Row>

        <Row icon="📍" label={t("where")}>
          <PlacePicker value={place} onChange={setPlace} />
        </Row>

        <Row icon="🏷" label={t("event")}>
          <select
            className={`${plain} appearance-none`}
            aria-label={t("event")}
            value={newEvent !== null ? "new" : (eventId ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              setNewEvent(v === "new" ? "" : null);
              if (v !== "new") setEventId(v ? Number(v) : null);
            }}
          >
            <option value="">
              {t("event")}: {t("noEvent")}
            </option>
            {allEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
            <option value="new">{t("newEvent")}</option>
          </select>
          {newEvent !== null && (
            <InlineAdd label={t("newEventPrompt")} value={newEvent} onChange={setNewEvent} onAdd={addEvent} onCancel={() => setNewEvent(null)} />
          )}
        </Row>

        <Row icon="🧾" label={t("receipt")}>
          {receipt ? (
            <div className="flex items-start gap-3">
              <a href={`/api/receipts/${receipt}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/receipts/${receipt}`} alt={t("receipt")} className="h-28 w-20 rounded-xl border border-line object-cover" />
              </a>
              <button type="button" className="text-sm text-critical" onClick={() => setReceipt(null)}>
                {t("removeReceipt")}
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer py-1 text-muted">
              {uploading ? t("uploading") : t("addReceipt")}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={onFile} />
            </label>
          )}
        </Row>
      </section>

      {initial && (
        <button type="button" onClick={remove} disabled={busy} className="mx-auto mt-5 block text-sm font-medium text-critical">
          {t("deleteEntry")}
        </button>
      )}

      <div className="sticky bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-4 bg-gradient-to-t from-page from-60% to-transparent px-4 pb-2 pt-5 md:bottom-0">
        {error && (
          <div className="mb-2 rounded-xl bg-surface px-3 py-2 shadow-card">
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          </div>
        )}
        <button
          disabled={busy || uploading}
          className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(42,120,214,0.35)] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--hero-mid), var(--hero-to))" }}
        >
          {busy ? t("saving") : amount === "" ? t("save") : t("saveAmount", { a: won(Number(amount)) })}
        </button>
      </div>
    </form>
  );
}
