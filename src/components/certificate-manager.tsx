"use client";

import JSZip from "jszip";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Award, AlertCircle, CheckCircle2, Package, Search } from "lucide-react";
import { bulkIssueCertificates, issueOneCertificate } from "@/app/actions";

type Participant = { id: string; full_name: string; event_id: string; event_name: string };
type Certificate = { id: string; certificate_id: string; participant_id: string; event_id: string; status: string; issue_date: string };
type Template = { id: string; name: string };

export function CertificateManager({ participants, certificates, events, templates }: {
  participants: Participant[];
  certificates: Certificate[];
  events: { id: string; name: string }[];
  templates: Template[];
}) {
  const [busy, setBusy] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eventId, setEventId] = useState("all");
  const [templateId, setTemplateId] = useState("");
  const [search, setSearch] = useState("");
  const [participantPage, setParticipantPage] = useState(0);
  const [certificatePage, setCertificatePage] = useState(0);
  const router = useRouter();

  const pageSize = 20;
  const selectedParticipants = useMemo(() => participants.filter((p) => (eventId === "all" || p.event_id === eventId) && (!search.trim() || `${p.full_name} ${p.event_name}`.toLowerCase().includes(search.trim().toLowerCase()))), [participants, eventId, search]);
  const participantPageCount = Math.max(1, Math.ceil(selectedParticipants.length / pageSize));
  const participantRows = selectedParticipants.slice(participantPage * pageSize, (participantPage + 1) * pageSize);
  const issuedParticipantIds = new Set(certificates.map((c) => `${c.event_id}:${c.participant_id}`));
  const pending = selectedParticipants.filter((p) => !issuedParticipantIds.has(`${p.event_id}:${p.id}`));

  async function issue(participant: Participant) {
    setBusy(participant.id); setError(""); setNotice("");
    try {
      const result = await issueOneCertificate({
        eventId: participant.event_id, participantId: participant.id,
        templateId: templateId || null, idempotencyKey: crypto.randomUUID(),
      });
      setNotice(`${result.certificateId} issued. Opening PDF…`);
      window.open(`/api/certificates/${result.id}/pdf`, "_blank", "noopener,noreferrer");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not issue certificate."); }
    finally { setBusy(""); }
  }

  async function bulkIssueAndDownload() {
    setBulkBusy(true); setError(""); setNotice("");
    try {
      const zip = new JSZip();
      let added = 0;
      let failedDownloads = 0;
      for (let start = 0; start < pending.length; start += 250) {
        const batch = pending.slice(start, start + 250);
        const result = await bulkIssueCertificates({
          certificates: batch.map((p) => ({ eventId: p.event_id, participantId: p.id })),
          templateId: templateId || null,
        });
        for (const item of result.issued) {
          try {
            const response = await fetch(`/api/certificates/${item.id}/pdf`);
            if (!response.ok) throw new Error("PDF request failed");
            zip.file(`${item.certificateId}.pdf`, await response.blob());
            added++;
          } catch { failedDownloads++; }
        }
        if (result.failures.length) failedDownloads += result.failures.length;
      }
      if (added) {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "certificates.zip";
        anchor.click();
        URL.revokeObjectURL(url);
      }
      setNotice(`Generated ${added} PDF files in the ZIP. ${failedDownloads} issuance or download errors.`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Bulk generation failed."); }
    finally { setBulkBusy(false); }
  }

  const visible = certificates.filter((item) => (eventId === "all" || item.event_id === eventId) && (!search.trim() || `${item.certificate_id} ${participants.find((p) => p.id === item.participant_id)?.full_name || ""} ${item.status}`.toLowerCase().includes(search.trim().toLowerCase())));
  const certificatePageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const certificateRows = visible.slice(certificatePage * pageSize, (certificatePage + 1) * pageSize);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Ready to issue</h2><p className="mt-1 text-xs text-slate-500">One permanent certificate per participant and event.</p></div>
          <div className="flex flex-wrap gap-2">
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border px-3 py-2 text-xs">
              <option value="all">All events</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="rounded-lg border px-3 py-2 text-xs">
              <option value="">Standard certificate</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </div>
        </div>
        <label className="mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-slate-500"><Search size={14}/><input value={search} onChange={(e) => { setSearch(e.target.value); setParticipantPage(0); setCertificatePage(0); }} placeholder="Search participant, event or certificate ID" className="min-w-0 flex-1 outline-none" /></label>
        {pending.length > 0 && <button disabled={bulkBusy || !!busy} onClick={bulkIssueAndDownload} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Package size={14} />{bulkBusy ? "Generating ZIP…" : `Issue ${pending.length} pending & download ZIP`}</button>}
        {selectedParticipants.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No participants in this selection yet.</p> : <div className="divide-y">
          {participantRows.map((p) => {
            const existing = certificates.find((c) => c.participant_id === p.id && c.event_id === p.event_id);
            return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-semibold">{p.full_name}</p><p className="mt-1 text-[11px] text-slate-400">{p.event_name}</p></div>
              {existing ? <div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Issued · {existing.certificate_id}</span><a href={`/api/certificates/${existing.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700"><Download size={13} /> PDF</a></div> : <button disabled={!!busy || bulkBusy} onClick={() => issue(p)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === p.id ? "Issuing…" : "Issue & download PDF"}</button>}
            </div>;
          })}
        </div>}
        {selectedParticipants.length > pageSize && <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {participantPage + 1} of {participantPageCount} · {selectedParticipants.length} participants</span><div className="flex gap-2"><button disabled={participantPage === 0} onClick={() => setParticipantPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={participantPage + 1 >= participantPageCount} onClick={() => setParticipantPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Issued certificates</h2><p className="mt-1 text-xs text-slate-500">{visible.length} records</p></div><Award size={19} className="text-blue-700" /></div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No certificates issued yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Certificate ID</th><th>Participant</th><th>Issued</th><th>Status</th><th /></tr></thead><tbody className="divide-y">{certificateRows.map((c) => <tr key={c.id}><td className="py-3 font-semibold">{c.certificate_id}</td><td>{participants.find((p) => p.id === c.participant_id)?.full_name || "—"}</td><td>{c.issue_date}</td><td><span className={c.status === "valid" ? "text-emerald-700" : "text-rose-700"}>{c.status}</span></td><td><a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700"><Download size={13} /> PDF</a></td></tr>)}</tbody></table></div>}
        {visible.length > pageSize && <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {certificatePage + 1} of {certificatePageCount} · {visible.length} certificates</span><div className="flex gap-2"><button disabled={certificatePage === 0} onClick={() => setCertificatePage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={certificatePage + 1 >= certificatePageCount} onClick={() => setCertificatePage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
      </section>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={14} className="mr-1 inline" />{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline" />{notice}</p>}
    </div>
  );
}
