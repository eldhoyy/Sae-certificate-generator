"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { Download, Award, AlertCircle, CheckCircle2, Package, Search } from "lucide-react";
import { queueCertificateGeneration, issueOneCertificate, revokeCertificate, retryGenerationJob, getGenerationJobCertificates } from "@/app/actions";

type Participant = { id: string; full_name: string; event_id: string; event_name: string };
type Certificate = { id: string; certificate_id: string; participant_id: string; event_id: string; status: string; issue_date: string };
type Template = { id: string; name: string };
type GenerationJob = { id: string; event_id: string; event_name: string; status: string; total_rows: number; succeeded_rows: number; failed_rows: number; created_at: string; completed_at: string | null };
type GenerationJobItem = { id: string; job_id: string; participant_id: string; status: string; error_message: string | null };

export function CertificateManager({ participants, certificates, events, templates, jobs, jobItems }: {
  participants: Participant[];
  certificates: Certificate[];
  events: { id: string; name: string }[];
  templates: Template[];
  jobs: GenerationJob[];
  jobItems: GenerationJobItem[];
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
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState("");
  const [zipBusy, setZipBusy] = useState("");
  const router = useRouter();

  const pageSize = 20;
  const selectedParticipants = useMemo(() => participants.filter((p) => (eventId === "all" || p.event_id === eventId) && (!search.trim() || `${p.full_name} ${p.event_name}`.toLowerCase().includes(search.trim().toLowerCase()))), [participants, eventId, search]);
  const participantPageCount = Math.max(1, Math.ceil(selectedParticipants.length / pageSize));
  const participantRows = selectedParticipants.slice(participantPage * pageSize, (participantPage + 1) * pageSize);
  const issuedParticipantIds = new Set(certificates.map((c) => `${c.event_id}:${c.participant_id}`));
  const pending = selectedParticipants.filter((p) => !issuedParticipantIds.has(`${p.event_id}:${p.id}`));

  async function issue(participant: Participant) {
    const downloadWindow = window.open("about:blank", "_blank");
    if (downloadWindow) downloadWindow.opener = null;
    setBusy(participant.id); setError(""); setNotice("");
    try {
      const result = await issueOneCertificate({
        eventId: participant.event_id, participantId: participant.id,
        templateId: templateId || null, idempotencyKey: crypto.randomUUID(),
      });
      setNotice(`${result.certificateId} issued. Opening PDF…`);
      if (downloadWindow) downloadWindow.location.href = `/api/certificates/${result.id}/pdf`;
      else setNotice(`${result.certificateId} issued. Allow pop-ups to open the PDF, or use the PDF link in Issued certificates.`);
      router.refresh();
    } catch (e) { downloadWindow?.close(); setError(e instanceof Error ? e.message : "Could not issue certificate."); }
    finally { setBusy(""); }
  }

  async function downloadJobZip(job: GenerationJob) {
    setZipBusy(job.id); setError(""); setNotice("");
    try {
      const certificates = await getGenerationJobCertificates({ jobId: job.id });
      if (!certificates.length) throw new Error("This job has no completed certificates to download.");
      if (certificates.length > 2500) throw new Error("This ZIP is larger than the browser export limit. Download certificates individually or split the event into smaller jobs.");
      const zip = new JSZip();
      let downloaded = 0;
      for (let start = 0; start < certificates.length; start += 10) {
        const batch = certificates.slice(start, start + 10);
        const files = await Promise.all(batch.map(async (certificate) => {
          const response = await fetch(`/api/certificates/${certificate.id}/pdf`);
          if (!response.ok) throw new Error(`PDF download failed for ${certificate.certificate_id}`);
          return { name: `${certificate.certificate_id}.pdf`, blob: await response.blob() };
        }));
        files.forEach((file) => { zip.file(file.name, file.blob); downloaded++; });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `certificates-${job.id.slice(0, 8)}.zip`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Downloaded ${downloaded} certificates in a ZIP.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the ZIP download."); }
    finally { setZipBusy(""); }
  }

  async function retryJob(job: GenerationJob) {
    setRetryBusy(job.id); setError(""); setNotice("");
    try {
      const result = await retryGenerationJob({ jobId: job.id });
      setNotice(`Re-queued ${result.retried} failed row(s) for ${job.event_name}.`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not retry failed rows."); }
    finally { setRetryBusy(""); }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevokeBusy(true); setError(""); setNotice("");
    try {
      await revokeCertificate({ certificateId: revokeTarget.id, reason: revokeReason });
      setNotice(`${revokeTarget.certificate_id} has been revoked.`);
      setRevokeTarget(null); setRevokeReason(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not revoke certificate."); }
    finally { setRevokeBusy(false); }
  }

  async function queuePendingGeneration() {
    setBulkBusy(true); setError(""); setNotice("");
    try {
      const groups = new Map<string, string[]>();
      for (const participant of pending) groups.set(participant.event_id, [...(groups.get(participant.event_id) || []), participant.id]);
      const queued: string[] = [];
      for (const [selectedEventId, participantIds] of groups) {
        for (let start = 0; start < participantIds.length; start += 5000) {
          const result = await queueCertificateGeneration({ eventId: selectedEventId, participantIds: participantIds.slice(start, start + 5000), templateId: templateId || null });
          queued.push(result.jobId);
        }
      }
      setNotice(`Queued ${pending.length} participants in ${queued.length} background job(s).`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not queue generation."); router.refresh(); }
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
        {pending.length > 0 && <button disabled={bulkBusy || !!busy} onClick={queuePendingGeneration} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Package size={14} />{bulkBusy ? "Queueing…" : `Queue ${pending.length} pending for generation`}</button>}
        {selectedParticipants.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No participants in this selection yet.</p> : <div className="divide-y">
          {participantRows.map((p) => {
            const existing = certificates.find((c) => c.participant_id === p.id && c.event_id === p.event_id);
            return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-semibold">{p.full_name}</p><p className="mt-1 text-[11px] text-slate-400">{p.event_name}</p></div>
              {existing ? <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${existing.status === "valid" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-700"}`}>{existing.status === "valid" ? "Issued" : "Revoked"} · {existing.certificate_id}</span>{existing.status === "valid" && <a href={`/api/certificates/${existing.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700"><Download size={13} /> PDF</a>}</div> : <button disabled={!!busy || bulkBusy} onClick={() => issue(p)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === p.id ? "Issuing…" : "Issue & download PDF"}</button>}
            </div>;
          })}
        </div>}
        {selectedParticipants.length > pageSize && <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {participantPage + 1} of {participantPageCount} · {selectedParticipants.length} participants</span><div className="flex gap-2"><button disabled={participantPage === 0} onClick={() => setParticipantPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={participantPage + 1 >= participantPageCount} onClick={() => setParticipantPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Background generation jobs</h2><p className="mt-1 text-xs text-slate-500">Queued batches and row-level progress</p></div><button onClick={() => router.refresh()} className="rounded-lg border px-3 py-2 text-xs">Refresh status</button></div>
        {jobs.length === 0 ? <p className="py-4 text-xs text-slate-400">No background jobs yet.</p> : <div className="divide-y">{jobs.map((job) => {
          const done = job.succeeded_rows + job.failed_rows;
          const percent = job.total_rows ? Math.round(done / job.total_rows * 100) : 0;
          return <div key={job.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{job.event_name}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(job.created_at).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase">{job.status}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div>
            <p className="mt-1 text-[10px] text-slate-500">{job.succeeded_rows} succeeded · {job.failed_rows} failed · {Math.max(0, job.total_rows - done)} pending · {percent}%</p>
            {job.failed_rows > 0 && <div className="mt-2 rounded-lg bg-rose-50 p-2">
              <div className="mb-1 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-rose-700">Failed rows</p><button disabled={retryBusy === job.id} onClick={() => retryJob(job)} className="text-[10px] font-semibold text-rose-700 underline">{retryBusy === job.id ? "Retrying…" : "Retry failed rows"}</button></div>
              {jobItems.filter((item) => item.job_id === job.id).slice(0, 4).map((item) => <p key={item.id} className="mt-1 text-[10px] text-rose-700">{participants.find((participant) => participant.id === item.participant_id)?.full_name || item.participant_id}: {item.error_message || "Generation failed"}</p>)}
              {job.failed_rows > 4 && <p className="mt-1 text-[10px] text-rose-600">And {job.failed_rows - 4} more failed row(s).</p>}
            </div>}
            {job.succeeded_rows > 0 && <button disabled={zipBusy === job.id} onClick={() => downloadJobZip(job)} className="mt-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold text-blue-700 disabled:opacity-40">{zipBusy === job.id ? "Preparing ZIP…" : "Download completed PDFs as ZIP"}</button>}
          </div>;
        })}</div>}
        <p className="mt-3 text-[10px] leading-4 text-slate-400">The scheduled worker runs every five minutes when Vercel Cron is enabled. Refresh to see progress. Issued PDFs remain downloadable in the list below.</p>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Issued certificates</h2><p className="mt-1 text-xs text-slate-500">{visible.length} records</p></div><Award size={19} className="text-blue-700" /></div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No certificates issued yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Certificate ID</th><th>Participant</th><th>Issued</th><th>Status</th><th /></tr></thead><tbody className="divide-y">{certificateRows.map((c) => <tr key={c.id}><td className="py-3 font-semibold">{c.certificate_id}</td><td>{participants.find((p) => p.id === c.participant_id)?.full_name || "—"}</td><td>{c.issue_date}</td><td><span className={c.status === "valid" ? "text-emerald-700" : "text-rose-700"}>{c.status}</span></td><td><div className="flex items-center gap-3">{c.status === "valid" ? <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700"><Download size={13} /> PDF</a> : <span className="text-slate-400">PDF disabled</span>}{c.status === "valid" && <button onClick={() => { setRevokeTarget(c); setRevokeReason(""); }} className="text-rose-600">Revoke</button>}</div></td></tr>)}</tbody></table></div>}
        {visible.length > pageSize && <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {certificatePage + 1} of {certificatePageCount} · {visible.length} certificates</span><div className="flex gap-2"><button disabled={certificatePage === 0} onClick={() => setCertificatePage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={certificatePage + 1 >= certificatePageCount} onClick={() => setCertificatePage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
      </section>
      {revokeTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="revoke-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><h2 id="revoke-title" className="text-base font-bold">Revoke certificate</h2><p className="mt-2 text-xs text-slate-500">This marks {revokeTarget.certificate_id} as revoked. The original certificate ID and record will be preserved.</p><label className="mt-4 block text-xs font-semibold">Reason<textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} maxLength={500} rows={3} placeholder="Enter the reason for revocation" className="mt-1.5 w-full rounded-lg border p-3 text-sm"/></label><div className="mt-4 flex justify-end gap-2"><button disabled={revokeBusy} onClick={() => setRevokeTarget(null)} className="rounded-lg border px-3 py-2 text-xs">Cancel</button><button disabled={revokeBusy || revokeReason.trim().length < 3} onClick={confirmRevoke} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{revokeBusy ? "Revoking…" : "Confirm revocation"}</button></div></div></div>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={14} className="mr-1 inline" />{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 size={14} className="mr-1 inline" />{notice}</p>}
    </div>
  );
}
