import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSimpleCertificatePdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data: certificate, error } = await db
    .from("certificates")
    .select("id, admin_id, certificate_id, participant_snapshot, issue_date, achievement_title, status, event_id")
    .eq("id", id)
    .eq("admin_id", user.id)
    .maybeSingle();

  if (error || !certificate) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  if (certificate.status !== "valid") return NextResponse.json({ error: "This certificate has been revoked." }, { status: 410 });

  const { data: event } = await db.from("events").select("name").eq("id", certificate.event_id).eq("admin_id", user.id).maybeSingle();
  const participant = certificate.participant_snapshot as { full_name?: string } | null;
  const bytes = await createSimpleCertificatePdf({
    participantName: participant?.full_name || "Participant",
    eventName: event?.name || "Event",
    certificateId: certificate.certificate_id,
    issueDate: certificate.issue_date,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${certificate.certificate_id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
