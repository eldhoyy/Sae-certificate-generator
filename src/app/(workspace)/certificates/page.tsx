import { Heading } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CertificateManager } from "@/components/certificate-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createClient();
  const [{ data: participants }, { data: events }, { data: certificates }] = await Promise.all([
    db.from("participants").select("id,full_name,event_id").order("created_at", { ascending: false }),
    db.from("events").select("id,name").order("created_at", { ascending: false }),
    db.from("certificates").select("id,certificate_id,participant_id,event_id,status,issue_date").order("issued_at", { ascending: false }),
  ]);
  const eventMap = new Map((events || []).map((event) => [event.id, event.name]));
  const participantRows = (participants || []).map((participant) => ({
    id: participant.id,
    full_name: participant.full_name,
    event_id: participant.event_id,
    event_name: eventMap.get(participant.event_id) || "Event",
  }));

  return <>
    <Heading eyebrow="Issuance" title="Certificates" desc="Issue, download and track certificates for your event participants." />
    <CertificateManager participants={participantRows} certificates={certificates || []} events={events || []} />
    <p className="mt-4 text-[11px] leading-5 text-slate-400">Each participant can have one permanent certificate per event. Re-downloading preserves the original issuance record.</p>
  </>;
}
