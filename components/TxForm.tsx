"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, useFetch, type Category, type Kind, type Meta, type Named, type Tx } from "@/lib/client";
import { nowHm, todayYmd } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import PlacePicker, { type PlaceValue } from "./PlacePicker";

const METHODS = ["card", "cash", "transfer"] as const;

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-sm font-medium text-ink2">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-accent bg-accent-soft font-semibold text-accent-ink" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export default function TxForm({ initial, defaultDate }: { initial?: Tx; defaultDate?: string }) {
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
  const [place, setPlace] = useState<PlaceValue | null>(
    initial?.place_name
      ? { name: initial.place_name, address: initial.place_address, lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [receipt, setReceipt] = useState<string | null>(initial?.receipt_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const categories: Category[] = (meta.data?.categories ?? []).filter((c) => c.kind === kind);
  const merge = (a: Named[], b: Named[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  const allPeople = merge(meta.data?.people ?? [], extraPeople);
  const allEvents = merge(extraEvents, meta.data?.events ?? []);

  const done = () => (window.history.length > 1 ? router.back() : router.push("/transactions"));

  async function createNamed(type: "people" | "events", promptKey: "newPersonPrompt" | "newEventPrompt") {
    const name = window.prompt(t(promptKey))?.trim();
    if (!name) return null;
    try {
      return await api<Named>(`/api/meta/${type}`, { method: "POST", body: { name } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        return (type === "people" ? allPeople : allEvents).find((x) => x.name === name) ?? null;
      }
      setError(t("error"));
      return null;
    }
  }

  async function addPerson() {
    const p = await createNamed("people", "newPersonPrompt");
    if (!p) return;
    setExtraPeople((xs) => merge(xs, [p]));
    setPeople((ids) => (ids.includes(p.id) ? ids : [...ids, p.id]));
  }

  async function onEventChange(v: string) {
    if (v !== "new") return setEventId(v ? Number(v) : null);
    const ev = await createNamed("events", "newEventPrompt");
    if (!ev) return;
    setExtraEvents((xs) => merge([ev], xs));
    setEventId(ev.id);
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
      setError(err instanceof Error && err.message !== "error" ? err.message : t("error"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value) return setError(t("required"));
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
          place_name: place?.name ?? null,
          place_address: place?.address ?? null,
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          receipt_path: receipt,
        },
      });
      done();
    } catch (err) {
      setError(err instanceof Error && err.message !== "error" ? err.message : t("error"));
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await api(`/api/transactions/${initial.id}`, { method: "DELETE" });
      done();
    } catch {
      setError(t("error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-wash p-1" role="group">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-lg py-2 text-sm font-semibold ${kind === k ? "bg-surface shadow-sm" : "text-ink2"}`}
          >
            {t(k)}
          </button>
        ))}
      </div>

      <div>
        <Label>{t("amount")}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-muted">₩</span>
          <input
            className="field !pl-10 !text-2xl font-semibold tabular-nums"
            inputMode="numeric"
            placeholder="0"
            aria-label={t("amount")}
            autoFocus={!initial}
            value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("date")}</Label>
          <input type="date" required className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>{t("time")}</Label>
          <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>{t("category")}</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
              {c.icon} {c.name}
            </Chip>
          ))}
          {meta.loading && !meta.data && <span className="text-sm text-muted">{t("loading")}</span>}
        </div>
      </div>

      <div>
        <Label>{t("forWhat")}</Label>
        <input
          className="field"
          placeholder={t("notePlaceholder")}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {kind === "expense" && (
        <div>
          <Label>{t("method")}</Label>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                {t(m)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>{t("withWho")}</Label>
        <div className="flex flex-wrap gap-2">
          {allPeople.map((p) => (
            <Chip
              key={p.id}
              active={people.includes(p.id)}
              onClick={() => setPeople((ids) => (ids.includes(p.id) ? ids.filter((i) => i !== p.id) : [...ids, p.id]))}
            >
              {p.name}
            </Chip>
          ))}
          <button type="button" onClick={addPerson} className="rounded-full border border-dashed border-baseline px-3 py-1.5 text-sm text-ink2">
            {t("newPerson")}
          </button>
        </div>
      </div>

      <div>
        <Label>{t("where")}</Label>
        <PlacePicker value={place} onChange={setPlace} />
      </div>

      <div>
        <Label>{t("event")}</Label>
        <select className="field" value={eventId ?? ""} onChange={(e) => onEventChange(e.target.value)}>
          <option value="">{t("noEvent")}</option>
          {allEvents.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
          <option value="new">{t("newEvent")}</option>
        </select>
      </div>

      <div>
        <Label>{t("receipt")}</Label>
        {receipt ? (
          <div className="flex items-start gap-3">
            <a href={`/api/receipts/${receipt}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/receipts/${receipt}`} alt={t("receipt")} className="h-32 w-24 rounded-lg border border-line object-cover" />
            </a>
            <button type="button" className="text-sm text-critical" onClick={() => setReceipt(null)}>
              {t("removeReceipt")}
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-baseline py-4 text-sm text-ink2">
            {uploading ? t("uploading") : `🧾 ${t("addReceipt")}`}
            <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={onFile} />
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {initial && (
          <button type="button" onClick={remove} disabled={busy} className="rounded-xl border border-line px-4 py-3 font-medium text-critical">
            {t("delete")}
          </button>
        )}
        <button type="button" onClick={done} className="rounded-xl border border-line px-4 py-3 font-medium text-ink2">
          {t("cancel")}
        </button>
        <button disabled={busy || uploading} className="flex-1 rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50">
          {busy ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
