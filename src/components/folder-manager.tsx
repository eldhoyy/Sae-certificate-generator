"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFolder } from "@/app/actions";
import { ArrowUpRight, FolderKanban, Plus } from "lucide-react";

export function FolderManager({ folders }: { folders: { id: string; name: string; description: string | null; created_at: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createFolder({ name, description });
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to create folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.025)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Your event folders</h2>
          <p className="mt-1 text-xs text-slate-500">{folders.length} workspaces</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-800">
          <Plus size={15} /> Create Event Folder
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Event / Competition Name <span className="text-rose-600">*</span></label>
            <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SAE Design Challenge 2026" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></label>
            <input maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description of this event workspace" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400" />
          </div>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create Folder"}</button>
          </div>
        </form>
      )}

      {folders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
          <FolderKanban className="mx-auto mb-3 text-slate-300" size={28} />
          <p className="text-sm font-semibold text-slate-700">No event folders yet</p>
          <p className="mt-1 text-xs text-slate-500">Create your first folder to keep an event’s participants and certificates together.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => router.push(`/folders/${encodeURIComponent(folder.id)}`)}
              aria-label={`Open ${folder.name} folder`}
              className="group w-full touch-manipulation cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><FolderKanban size={20} /></span>
                <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-blue-700" />
              </div>
              <p className="font-semibold text-slate-900">{folder.name}</p>
              <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-5 text-slate-500">{folder.description || "Open this workspace to manage its events and certificates."}</p>
              <p className="mt-4 text-[10px] text-slate-400">Created {new Date(folder.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
