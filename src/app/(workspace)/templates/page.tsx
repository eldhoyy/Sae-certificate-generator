import { Heading, Card } from "@/components/ui";
import { TemplateEditor } from "@/components/template-editor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createClient();
  const { data: templates, error } = await db.from("templates")
    .select("id,name,background_mime,version,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return <>
    <Heading eyebrow="Certificate studio" title="Template designer" desc="Upload a background, position dynamic fields and save reusable certificate layouts." />
    <TemplateEditor />
    <Card className="mt-6">
      <div className="mb-4"><h2 className="text-sm font-bold">Saved templates</h2><p className="mt-1 text-xs text-slate-500">Choose a saved template when issuing certificates.</p></div>
      {templates?.length ? <div className="divide-y">{templates.map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{template.name}</p><p className="mt-1 text-[11px] text-slate-400">Version {template.version} · {template.background_mime === "image/png" ? "PNG background" : template.background_mime === "image/jpeg" ? "JPG background" : "PDF background"} · {new Date(template.created_at).toLocaleDateString()}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">Saved</span></div>)}</div> : <p className="py-8 text-center text-xs text-slate-400">No saved templates yet. Create one using the designer above.</p>}
    </Card>
  </>;
}
