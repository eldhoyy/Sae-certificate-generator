"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Type, Upload, ZoomIn, ZoomOut, Save, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveTemplate } from "@/app/actions";

type Item = {
  id: number;
  label: string;
  token: string;
  x: number;
  y: number;
  size: number;
  color: string;
  bold: boolean;
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
  align: "left" | "center" | "right";
  italic: boolean;
  width: number;
};

const initial: Item[] = [
  { id: 1, label: "Participant name", token: "{{participant_name}}", x: 28, y: 42, size: 28, color: "#17264b", bold: true, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
  { id: 2, label: "Event name", token: "{{event_name}}", x: 28, y: 61, size: 15, color: "#475569", bold: false, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
  { id: 3, label: "Certificate ID", token: "{{certificate_id}}", x: 28, y: 80, size: 11, color: "#64748b", bold: false, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
  { id: 4, label: "Verification QR", token: "{{qr_code}}", x: 87, y: 76, size: 11, color: "#17264b", bold: false, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
  { id: 5, label: "Issue date", token: "{{issue_date}}", x: 72, y: 88, size: 10, color: "#64748b", bold: false, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
  { id: 6, label: "Achievement title", token: "{{achievement_title}}", x: 28, y: 70, size: 16, color: "#17264b", bold: true, fontFamily: "Helvetica", align: "left", italic: false, width: 75 },
];

export function TemplateEditor() {
  const [items, setItems] = useState<Item[]>(initial);
  const [selected, setSelected] = useState(1);
  const [scale, setScale] = useState(1);
  const [background, setBackground] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [templateName, setTemplateName] = useState("Certificate template");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const router = useRouter();
  const current = items.find((item) => item.id === selected);

  function patch(id: number, changes: Partial<Item>) {
    setItems((value) => value.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function removeField(id: number) {
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    setSelected(remaining[0]?.id ?? 0);
  }

  function add() {
    const id = Math.max(0, ...items.map((item) => item.id)) + 1;
    setItems((value) => [...value, {
      id, label: "Custom text", token: "Custom text",
      x: 40, y: 52, size: 18, color: "#17264b", bold: false, fontFamily: "Helvetica", align: "left", italic: false, width: 75,
    }]);
    setSelected(id);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (drag === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    patch(drag, {
      x: Math.max(0, Math.min(90, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(90, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  }

  function chooseBackground(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type)) {
      setError("Choose a PNG, JPG or PDF background.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Background file must be 10 MB or smaller.");
      return;
    }
    setError("");
    setBackground(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function persist() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!background) throw new Error("Upload a PNG, JPG or PDF certificate background first.");
      if (!templateName.trim()) throw new Error("Enter a template name.");
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in before saving a template.");

      const extension = background.type === "image/png" ? "png" : background.type === "application/pdf" ? "pdf" : "jpg";
      const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("certificate-templates")
        .upload(path, background, { contentType: background.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      try {
        await saveTemplate({
          name: templateName.trim(),
          background_path: path,
          background_mime: background.type,
          layout_json: { version: 1, fields: items },
        });
      } catch (saveError) {
        await client.storage.from("certificate-templates").remove([path]);
        throw saveError;
      }

      setMessage("Template saved to your workspace.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save template.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold">
            <Upload size={14} /> Upload background
            <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => chooseBackground(event.target.files?.[0])} />
          </label>
          <div className="flex gap-2">
            <button onClick={() => setPreview((value) => !value)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700">{preview ? <EyeOff size={13} className="mr-1 inline" /> : <Eye size={13} className="mr-1 inline" />}{preview ? "Edit layout" : "Preview sample"}</button>
            <button onClick={add} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white"><Plus size={13} className="mr-1 inline" />Add field</button>
            <button onClick={() => setScale((value) => Math.max(.7, value - .1))} className="rounded-lg bg-white p-2" aria-label="Zoom out"><ZoomOut size={14} /></button>
            <button onClick={() => setScale((value) => Math.min(1.2, value + .1))} className="rounded-lg bg-white p-2" aria-label="Zoom in"><ZoomIn size={14} /></button>
          </div>
        </div>
        <div className="overflow-auto">
          <div
            onPointerMove={move}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
            className="relative mx-auto aspect-[1.414/1] w-full max-w-[760px] touch-none select-none overflow-hidden border border-slate-300 bg-white shadow-lg"
            style={{
              backgroundImage: previewUrl && background?.type !== "application/pdf" ? `url("${previewUrl}")` : "linear-gradient(135deg,#fff,#f1f5f9)",
              backgroundSize: "cover",
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              touchAction: "none",
            }}
          >
            {previewUrl && background?.type === "application/pdf" && <object data={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf" aria-label="PDF template background preview" className="pointer-events-none absolute inset-0 h-full w-full" />}
            <div className="pointer-events-none absolute inset-[4%] border border-dashed border-slate-200" />
            <p className="pointer-events-none absolute top-[16%] w-full text-center text-[9px] font-bold uppercase tracking-[.35em] text-slate-300">Certificate of achievement</p>
            {items.map((field) => (
              <button
                key={field.id}
                type="button"
                onPointerDown={(event) => {
                  if (preview) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDrag(field.id);
                  setSelected(field.id);
                }}
                onClick={() => { if (!preview) setSelected(field.id); }}
                className={`absolute max-w-[80%] cursor-move whitespace-nowrap rounded px-2 py-1 text-left ${selected === field.id ? "ring-2 ring-blue-500 ring-offset-2" : "hover:ring-1 hover:ring-blue-300"}`}
                style={{ left: `${field.x}%`, top: `${field.y}%`, fontSize: field.size, color: field.color, fontWeight: field.bold ? 700 : 400, fontFamily: field.fontFamily === "TimesRoman" ? "Georgia, serif" : field.fontFamily === "Courier" ? "monospace" : "Arial, sans-serif", fontStyle: field.italic ? "italic" : "normal", textAlign: field.align, width: `${field.width}%`, whiteSpace: "normal", cursor: preview ? "default" : "move" }}
              >
                {preview ? (field.token === "{{participant_name}}" ? "Alex Johnson" : field.token === "{{event_name}}" ? "Annual Technical Symposium 2026" : field.token === "{{certificate_id}}" ? "CERT-20261124-8A2F…" : field.token === "{{issue_date}}" ? "24 Nov 2026" : field.token === "{{achievement_title}}" ? "Certificate of Participation" : field.token.startsWith("{{custom:") ? "Sample value" : field.token === "{{qr_code}}" ? "▦ VERIFY" : field.token) : field.token}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[10px] text-slate-400">{preview ? "Sample preview · Values shown are examples and will be replaced with each participant’s details." : "Drag fields to position them · Landscape canvas · PNG, JPG and PDF backgrounds"}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">Template details</h3>
          <label className="block text-[11px]">Template name
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border p-2 text-xs" />
          </label>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">Design elements</h3>
          {items.map((field) => (
            <div key={field.id} className={`flex items-center gap-1 rounded-lg px-1 ${selected === field.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <button type="button" onClick={() => setSelected(field.id)} className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-xs ${selected === field.id ? "text-blue-700" : "text-slate-600"}`}>
                <Type size={14} /><span className="truncate">{field.label || "Untitled field"}</span>
              </button>
              <button type="button" onClick={() => removeField(field.id)} aria-label={`Delete ${field.label || "field"}`} title="Delete field" className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={add} className="mt-3 w-full rounded-lg border border-dashed py-2 text-xs">+ Add text field</button>
        </div>
        {current && (
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex justify-between">
              <h3 className="text-sm font-bold">Field properties</h3>
              <button onClick={() => removeField(selected)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50" aria-label="Delete field"><Trash2 size={13} /> Delete field</button>
            </div>
            <label className="mb-3 block text-[11px]">Label
              <input value={current.label} onChange={(event) => patch(current.id, { label: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" />
            </label>
            <label className="mb-3 block text-[11px]">Dynamic token
              <input value={current.token} onChange={(event) => patch(current.id, { token: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" />
            </label>
            <label className="mb-3 block text-[11px]">Font size · {current.size}px
              <input type="range" min="9" max="52" value={current.size} onChange={(event) => patch(current.id, { size: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <label className="mb-3 flex items-center justify-between text-[11px]">Text colour
              <input type="color" value={current.color} onChange={(event) => patch(current.id, { color: event.target.value })} />
            </label>
            <label className="mb-3 block text-[11px]">Field width · {current.width}%<input type="range" min="10" max="100" value={current.width} onChange={(event) => patch(current.id, { width: Number(event.target.value) })} className="mt-2 w-full"/></label>
            <label className="mb-3 block text-[11px]">Text alignment<select value={current.align} onChange={(event) => patch(current.id, { align: event.target.value as Item["align"] })} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label className="mb-3 block text-[11px]">Font family<select value={current.fontFamily} onChange={(event) => patch(current.id, { fontFamily: event.target.value as Item["fontFamily"] })} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label>
            <label className="mb-2 flex gap-2 text-xs"><input type="checkbox" checked={current.bold} onChange={(event) => patch(current.id, { bold: event.target.checked })} /> Bold</label>
            <label className="flex gap-2 text-xs"><input type="checkbox" checked={current.italic} onChange={(event) => patch(current.id, { italic: event.target.checked })} /> Italic</label>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">Custom participant values use tokens like {"{{custom:department}}"}; map the matching column during CSV/Excel import.</p>
          </div>
        )}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline" />{message}</p>}
        <button disabled={busy} onClick={persist} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">
          <Save size={14} className="mr-2 inline" />{busy ? "Saving template…" : "Save reusable template"}
        </button>
      </div>
    </div>
  );
}
