import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Heading } from "@/components/ui";
import { EventManager } from "@/components/event-manager";
import { ParticipantManager } from "@/components/participant-manager";
import { ArrowLeft, Award, FileText, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FolderWorkspacePage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const db = await createClient();
  const { data: folder, error: folderError } = await db.from("event_folders")
    .select("id,name,description,created_at").eq("id", folderId).maybeSingle();
  if (folderError) throw new Error(folderError.message);
  if (!folder) notFound();

  const { data: events, error: eventsError } = await db.from("events")
    .select("id,name,starts_at,ends_at,folder_id").eq("folder_id", folderId)
    .order("created_at", { ascending: false });
  if (eventsError) throw new Error(eventsError.message);

  const eventIds = (events || []).map((event) => event.id);
  const [participantResult, certificateResult, templateResult] = eventIds.length ? await Promise.all([
    db.from("participants").select("id,full_name,email,event_id,created_at").in("event_id", eventIds).order("created_at", { ascending: false }).limit(500),
    db.from("certificates").select("id,certificate_id,participant_id,event_id,status,issue_date").in("event_id", eventIds).order("issued_at", { ascending: false }).limit(500),
    db.from("templates").select("id,name,created_at").order("created_at", { ascending: false }).limit(100),
  ]) : [
    { data: [], error: null },
    { data: [], error: null },
    await db.from("templates").select("id,name,created_at").order("created_at", { ascending: false }).limit(100),
  ];
  if (participantResult.error) throw new Error(participantResult.error.message);
  if (certificateResult.error) throw new Error(certificateResult.error.message);
  if (templateResult.error) throw new Error(templateResult.error.message);

  const eventNames = new Map((events || []).map((event) => [event.id, event.name]));
  const participantNames = new Map((participantResult.data || []).map((person) => [person.id, person.full_name]));
  const issuedCount = (certificateResult.data || []).filter((certificate) => certificate.status === "valid").length;

  return (
    <>
      <div className="mb-5">
        <Link href="/folders" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"><ArrowLeft size={14} /> All event folders</Link>
      </div>
      <Heading eyebrow="Event folder workspace" title={folder.name} desc={folder.description || "Manage this event folder, its participants and issued certificates."} />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-400"><FileText size={15}/><span className="text-[10px] font-semibold uppercase tracking-wide">Events</span></div><p className="mt-2 text-2xl font-bold tabular-nums">{events?.length || 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-400"><Users size={15}/><span className="text-[10px] font-semibold uppercase tracking-wide">Participants</span></div><p className="mt-2 text-2xl font-bold tabular-nums">{participantResult.data?.length || 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-400"><Award size={15}/><span className="text-[10px] font-semibold uppercase tracking-wide">Issued</span></div><p className="mt-2 text-2xl font-bold tabular-nums">{issuedCount}</p></div>
      </div>

      <div className="space-y-5">
        <EventManager events={events || []} folders={[{ id: folder.id, name: folder.name }]} defaultFolderId={folder.id} />
        <ParticipantManager
          events={(events || []).map((event) => ({ id: event.id, name: event.name }))}
          participants={(participantResult.data || []).map((person) => ({ ...person, email: person.email || null }))}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Issued certificates</h2><p className="mt-1 text-xs text-slate-500">Certificate records belonging to this folder</p></div><Link href="/certificates" className="text-xs font-semibold text-blue-700">Open certificate manager →</Link></div>
          {!certificateResult.data?.length ? <p className="py-8 text-center text-sm text-slate-400">No certificates have been issued in this folder yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Certificate ID</th><th>Participant</th><th>Event</th><th>Status</th><th>PDF</th></tr></thead><tbody className="divide-y">{certificateResult.data.map((certificate) => <tr key={certificate.id}><td className="py-3 font-semibold">{certificate.certificate_id}</td><td>{participantNames.get(certificate.participant_id) || "—"}</td><td>{eventNames.get(certificate.event_id) || "—"}</td><td><span className={certificate.status === "valid" ? "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700" : "rounded-full bg-rose-50 px-2 py-1 text-rose-700"}>{certificate.status}</span></td><td>{certificate.status === "valid" ? <a href={`/api/certificates/${certificate.id}/pdf`} className="font-semibold text-blue-700">Download</a> : <span className="text-slate-400">Unavailable</span>}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Certificate template</h2><p className="mt-1 text-xs text-slate-500">{templateResult.data?.length || 0} saved templates available to this workspace</p></div><Link href="/templates" className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white">Open Template Designer</Link></div>
          {templateResult.data?.length ? <div className="mt-4 divide-y">{templateResult.data.slice(0, 4).map((template) => <div key={template.id} className="py-2.5 text-xs"><span className="font-semibold">{template.name}</span><span className="ml-2 text-slate-400">{new Date(template.created_at).toLocaleDateString()}</span></div>)}</div> : <p className="mt-4 text-xs text-slate-400">Create your first reusable certificate layout in the template designer.</p>}
        </section>
      </div>
    </>
  );
}
