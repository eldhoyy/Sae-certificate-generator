"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createParticipant, bulkCreateParticipants } from "@/app/actions";
import { readParticipantFile, type ImportRow } from "@/lib/imports";

type EventOption = { id: string; name: string };
type Participant = { id: string; full_name: string; email: string | null; event_id: string; created_at: string };

export function ParticipantManager({ events, participants }: { events: EventOption[]; participants: Participant[] }) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [event, setEvent] = useState(events[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [nameField, setNameField] = useState("");
  const [emailField, setEmailField] = useState("");
  const [customFieldHeaders, setCustomFieldHeaders] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const router = useRouter();

  const pageSize = 20;
  const filteredParticipants = useMemo(() => participants.filter((p) => !search.trim() || `${p.full_name} ${p.email || ""} ${events.find((event) => event.id === p.event_id)?.name || ""}`.toLowerCase().includes(search.trim().toLowerCase())), [participants, events, search]);
  const pageCount = Math.max(1, Math.ceil(filteredParticipants.length / pageSize));
  const visibleParticipants = filteredParticipants.slice(page * pageSize, (page + 1) * pageSize);

  const prepared = useMemo(() => rows.map((row) => ({
    full_name: String(row[nameField] ?? "").trim(),
    email: emailField ? String(row[emailField] ?? "").trim() : "",
    custom_fields: Object.fromEntries(customFieldHeaders.map((header): [string, string] => [header, String(row[header] ?? "").trim()]).filter(([, value]) => value.length > 0)),
  })).filter((row) => row.full_name), [rows, nameField, emailField, customFieldHeaders]);

  const existingEmails = useMemo(() => new Set(participants.filter((p) => p.event_id === event && p.email).map((p) => p.email!.toLowerCase())), [participants, event]);
  const duplicateEmails = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const row of prepared) {
      const key = row.email.toLowerCase();
      if (!key) continue;
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    }
    return duplicates;
  }, [prepared]);
  const invalidEmailRows = useMemo(() => prepared.filter((row) => row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)).length, [prepared]);
  const readyRows = useMemo(() => prepared.filter((row) => {
    const key = row.email.toLowerCase();
    return (!key || (!duplicateEmails.has(key) && !existingEmails.has(key))) &&
      (!key || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email));
  }), [prepared, duplicateEmails, existingEmails]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createParticipant({ full_name: name, email, event_id: event });
      setName(""); setEmail(""); setOpen(false); router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to save participant");
    } finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setImportMessage("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Import file must be 10 MB or smaller.");
      const parsed = await readParticipantFile(file);
      if (parsed.rows.length > 5000) throw new Error("Import is limited to 5,000 rows per file.");
      if (!parsed.headers.length || !parsed.rows.length) throw new Error("The file has no participant rows.");
      setFileName(file.name); setHeaders(parsed.headers); setRows(parsed.rows); setCustomFieldHeaders([]);
      const nameHeader = parsed.headers.find((h) => /name|participant|student/i.test(h)) || parsed.headers[0];
      const emailHeader = parsed.headers.find((h) => /email|e-mail/i.test(h)) || "";
      setNameField(nameHeader); setEmailField(emailHeader); setImportOpen(true);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not read this file.");
    } finally { setBusy(false); }
  }

  async function runImport() {
    setBusy(true); setError(""); setImportMessage("");
    try {
      const payload = readyRows.map((row) => ({ full_name: row.full_name, email: row.email || null, custom_fields: row.custom_fields }));
      if (!event) throw new Error("Choose an event first.");
      if (!payload.length) throw new Error("No valid, non-duplicate rows are ready to import.");
      const result = await bulkCreateParticipants({ eventId: event, participants: payload });
      setImportMessage(`Imported ${result.inserted} participants. Skipped ${prepared.length - payload.length + result.skipped} duplicate or invalid rows.`);
      setImportOpen(false); setRows([]); setFileName(""); router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Import failed.");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Participants</h2><p className="mt-1 text-xs text-slate-500">{filteredParticipants.length} matching records · latest 500 loaded</p></div>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold">Import CSV / Excel
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={!events.length || busy} onChange={(e) => chooseFile(e.target.files?.[0])} />
          </label>
          <button disabled={!events.length} onClick={() => setOpen(!open)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">+ Add participant</button>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-slate-500"><Search size={14}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search participant, email or event" className="min-w-0 flex-1 outline-none"/></label>
      {!events.length && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Create an event before adding participants.</p>}
      {open && <form onSubmit={submit} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <input required maxLength={180} value={name} onChange={(e) => setName(e.target.value)} placeholder="Participant full name" className="rounded-lg border p-3 text-sm" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="rounded-lg border p-3 text-sm" />
        <select required value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-lg border p-3 text-sm sm:col-span-2">{events.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-slate-900 p-3 text-xs font-semibold text-white sm:col-span-2">{busy ? "Saving…" : "Save record only"}</button>
      </form>}

      {importOpen && <div className="mb-5 space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div><h3 className="text-sm font-bold">Import preview</h3><p className="mt-1 text-xs text-slate-500">{fileName} · {rows.length} source rows · {prepared.length} rows with a name</p></div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-xs">Target event<select value={event} onChange={(e) => setEvent(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2">{events.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label className="text-xs">Name column<select value={nameField} onChange={(e) => setNameField(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2">{headers.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
          <label className="text-xs">Email column<select value={emailField} onChange={(e) => setEmailField(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">No email column</option>{headers.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
          <label className="text-xs">Custom fields (optional)<select multiple value={customFieldHeaders} onChange={(e) => setCustomFieldHeaders(Array.from(e.target.selectedOptions, (option) => option.value).filter((value) => value !== nameField && value !== emailField).slice(0, 40))} className="mt-1 h-20 w-full rounded-lg border bg-white p-2">{headers.filter((h) => h !== nameField && h !== emailField).map((h) => <option key={h} value={h}>{h}</option>)}</select><span className="mt-1 block text-[10px] text-slate-400">Select extra columns to store for certificate fields.</span></label>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Participant</th><th className="p-2">Email</th><th className="p-2">Review</th></tr></thead><tbody className="divide-y">{prepared.slice(0, 12).map((row, i) => <tr key={i}><td className="p-2">{i + 1}</td><td className="p-2">{row.full_name}</td><td className="p-2">{row.email || "—"}</td><td className="p-2">{row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ? <span className="text-rose-600">Invalid email</span> : row.email && existingEmails.has(row.email.toLowerCase()) ? <span className="text-rose-600">Already in event</span> : row.email && duplicateEmails.has(row.email.toLowerCase()) ? <span className="text-rose-600">Duplicate in file</span> : <span className="text-emerald-700">Ready</span>}</td></tr>)}</tbody></table></div>
        <p className="text-[11px] text-slate-500">Ready to import: {readyRows.length} · Invalid email rows: {invalidEmailRows} · Custom columns: {customFieldHeaders.length}. Preview shows the first 12 valid-name rows. Existing emails, repeated emails in the file and malformed email addresses are excluded. Names without email are allowed.</p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex flex-wrap gap-2"><button disabled={busy || !readyRows.length} onClick={runImport} className="rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Importing…" : `Import ${readyRows.length} rows`}</button><button onClick={() => setImportOpen(false)} className="rounded-lg border bg-white px-4 py-2.5 text-xs">Cancel</button></div>
      </div>}

      {error && !open && !importOpen && <p role="alert" className="mb-3 text-xs text-rose-600">{error}</p>}
      {importMessage && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{importMessage}</p>}
      {filteredParticipants.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No matching participants found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Name</th><th>Email</th><th>Event</th><th>Added</th></tr></thead><tbody className="divide-y">{visibleParticipants.map((p) => <tr key={p.id}><td className="py-3 font-semibold">{p.full_name}</td><td>{p.email || "—"}</td><td>{events.find((e) => e.id === p.event_id)?.name || "—"}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
      {filteredParticipants.length > pageSize && <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {page + 1} of {pageCount}</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
    </section>
  );
}
