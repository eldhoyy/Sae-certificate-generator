"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions";

type Folder = { id: string; name: string };
type EventRow = { id: string; name: string; starts_at: string | null; ends_at: string | null; folder_id: string | null };

export function EventManager({ events, folders, defaultFolderId }: { events: EventRow[]; folders: Folder[]; defaultFolderId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState(defaultFolderId || "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createEvent({ name, folder_id: defaultFolderId || folder || null, starts_at: start ? new Date(start).toISOString() : null, ends_at: end ? new Date(end).toISOString() : null });
      setName("");
      setStart("");
      setEnd("");
      setOpen(false);
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to create event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.025)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">Events in this folder</h2><p className="mt-1 text-xs text-slate-500">{events.length} events</p></div>
        <button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white">+ Add event</button>
      </div>
      {open && (
        <form onSubmit={submit} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">Event name <span className="text-rose-600">*</span><input required maxLength={180} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter event name" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal normal-case tracking-normal text-slate-900" /></label>
          {!defaultFolderId && <label className="text-xs text-slate-500 sm:col-span-2">Folder<select value={folder} onChange={(e) => setFolder(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 text-sm"><option value="">No folder</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
          <label className="text-xs text-slate-500">Start date<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 text-sm" /></label>
          <label className="text-xs text-slate-500">End date<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 block w-full rounded-lg border p-3 text-sm" /></label>
          {error && <p className="text-xs text-rose-600 sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border bg-white px-4 py-2.5 text-xs">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Create event"}</button></div>
        </form>
      )}
      {events.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No events in this folder yet. Add an event to start managing participants.</p> : (
        <div className="divide-y">{events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{event.name}</p><p className="mt-1 text-xs text-slate-500">{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : "Date not set"}{event.ends_at ? ` – ${new Date(event.ends_at).toLocaleDateString()}` : ""}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">In this folder</span></div>)}</div>
      )}
    </section>
  );
}
