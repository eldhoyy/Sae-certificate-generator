import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSimpleCertificatePdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

type FrozenLayout = {
  layout_json?: { fields?: { token?: string; label?: string; x?: number; y?: number; size?: number; color?: string; bold?: boolean }[] };
  background_path?: string;
  background_mime?: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data: certificate, error } = await db.from("certificates")
    .select("id,admin_id,certificate_id,participant_snapshot,issue_date,achievement_title,status,event_id,template_id,layout_snapshot")
    .eq("id", id).eq("admin_id", user.id).maybeSingle();

  if (error || !certificate) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  if (certificate.status !== "valid") return NextResponse.json({ error: "This certificate has been revoked." }, { status: 410 });

  const [{ data: event }, { data: template }] = await Promise.all([
    db.from("events").select("name").eq("id", certificate.event_id).eq("admin_id", user.id).maybeSingle(),
    certificate.template_id
      ? db.from("templates").select("id,background_path,background_mime,layout_json").eq("id", certificate.template_id).eq("admin_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const frozen = certificate.layout_snapshot as FrozenLayout | null;
  const backgroundPath = frozen?.background_path || template?.background_path;
  const backgroundMime = frozen?.background_mime || template?.background_mime;
  const layout = frozen?.layout_json || template?.layout_json || { fields: [] };
  let backgroundBytes: Uint8Array | null = null;

  if (backgroundPath && backgroundMime) {
    const { data: background, error: backgroundError } = await db.storage.from("certificate-templates").download(backgroundPath);
    if (backgroundError || !background) {
      return NextResponse.json({ error: "The saved template background is unavailable." }, { status: 500 });
    }
    backgroundBytes = new Uint8Array(await background.arrayBuffer());
  }

  const participant = certificate.participant_snapshot as { full_name?: string } | null;
  const bytes = await createSimpleCertificatePdf({
    participantName: participant?.full_name || "Participant",
    eventName: event?.name || "Event",
    certificateId: certificate.certificate_id,
    issueDate: certificate.issue_date,
    achievementTitle: certificate.achievement_title,
    template: backgroundMime ? { background_mime: backgroundMime, layout_json: layout } : null,
    backgroundBytes,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${certificate.certificate_id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
