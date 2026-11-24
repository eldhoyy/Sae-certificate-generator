"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { issueOneCertificate } from "@/app/actions";

type Participant = { id: string; full_name: string; event_id: string; event_name: string };
type Certificate = { id: string; certificate_id: string; participant_id: string; event_id: string; status: string; issue_date: string };

export function CertificateManager({ participants, certificates, events }: {
  participants: Participant[];
  certificates: Certificate[];
  events: { id: string; name: string }[];
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eventId, setEventId] = useState("all");
  const router = useRouter();

  async function issue(participant: Participant) {
    setBusy(participant.id);
    setError("");
    setNotice("");
    try {
      const result = await issueOneCertificate({
        eventId: participant.event_id,
        participantId: participant.id,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(`${result.certificateId} issued. Opening PDF…`);
      window.open(`/api/certificates/${result.id}/pdf`, "_blank", "noopener,noreferrer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue certificate.");
    } finally {
      setBusy("");
    }
  }

  const visible = certificates.filter((item) => eventId === "all" || item.event_id === eventId);
  const issuedParticipantIds = new Set(certificates.map((item) => item.participant_id));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Ready to issue</h2><p className="mt-1 text-xs text-slate-500">Issue one certificate per participant. Existing issuances are preserved.</p></div>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border px-3 py-2 text-xs">
            <option value="all">All events</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
        </div>
        {participants.filter((p) => eventId === "all" || p.event_id === eventId).length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No participants in this selection yet.</p>
        ) : (
          <div className="divide-y">
            {participants.filter((p) => eventId === "all" || p.event_id === eventId).map((p) => {
              const existing = certificates.find((c) => c.participant_id === p.id && c.event_id === p.event_id);
              return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-semibold">{p.full_name}</p><p className="mt-1 text-[11px] text-slate-400">{p.event_name}</p></div>
                {existing ? <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Issued · {existing.certificate_id}</span> : <button disabled={!!busy} onClick={() => issue(p)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === p.id ? "Issuing…" : "Issue & download PDF"}</button>}
              </div>;
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Issued certificates</h2><p className="mt-1 text-xs text-slate-500">{visible.length} records</p></div><Award size={19} className="text-blue-700" /></div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No certificates issued yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Certificate ID</th><th>Participant</th><th>Issued</th><th>Status</th><th /></tr></thead><tbody className="divide-y">{visible.map((c) => <tr key={c.id}><td className="py-3 font-semibold">{c.certificate_id}</td><td>{participants.find((p) => p.id === c.participant_id)?.full_name || "—"}</td><td>{c.issue_date}</td><td><span className={c.status === "valid" ? "text-emerald-700" : "text-rose-700"}>{c.status}</span></td><td><a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700"><Download size={13} /> PDF</a></td></tr>)}</tbody></table></div>}
      </section>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={14} className="mr-1 inline" />{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline" />{notice}</p>}
    </div>
  );
}
