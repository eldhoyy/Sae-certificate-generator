import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSimpleCertificatePdf } from "@/lib/pdf";
import { isValidCertificateBackground } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  const lookup = certificateId.trim();
  if (lookup.length < 4 || lookup.length > 100 || !/^[a-zA-Z0-9-]+$/.test(lookup)) {
    return NextResponse.json({ error: "Invalid certificate ID." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return NextResponse.json({ error: "Certificate downloads are temporarily unavailable." }, { status: 503 });
  }

  const db = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: certificate, error } = await db
    .from("certificates")
    .select("id,admin_id,certificate_id,participant_snapshot,issue_date,achievement_title,status,event_id,template_id,layout_snapshot")
    .eq("certificate_id", lookup)
    .maybeSingle();

  if (error || !certificate) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  if (certificate.status !== "valid") {
    return NextResponse.json({ error: "This certificate has been revoked and cannot be downloaded as valid." }, { status: 410 });
  }

  type PdfField = { token?: string; label?: string; x?: number; y?: number; size?: number; color?: string; bold?: boolean; fontFamily?: "Helvetica" | "TimesRoman" | "Courier"; align?: "left" | "center" | "right"; italic?: boolean; width?: number };
  type PdfLayout = { fields?: PdfField[] };
  const frozen = certificate.layout_snapshot as {
    layout_json?: PdfLayout;
    background_path?: string;
    background_mime?: string;
  } | null;

  let template: { background_path: string; background_mime: string; layout_json: PdfLayout | null } | null = null;
  if (certificate.template_id) {
    const { data } = await db.from("templates")
      .select("background_path,background_mime,layout_json")
      .eq("id", certificate.template_id)
      .eq("admin_id", certificate.admin_id)
      .maybeSingle();
    template = data;
  }

  const backgroundPath = frozen?.background_path || template?.background_path;
  const backgroundMime = frozen?.background_mime || template?.background_mime;
  const layout = frozen?.layout_json || template?.layout_json || { fields: [] };
  let backgroundBytes: Uint8Array | null = null;

  if (backgroundPath && backgroundMime) {
    const { data: background, error: backgroundError } = await db.storage
      .from("certificate-templates").download(backgroundPath);
    if (backgroundError || !background) {
      return NextResponse.json({ error: "The certificate design file is unavailable." }, { status: 500 });
    }
    backgroundBytes = new Uint8Array(await background.arrayBuffer());
    if (backgroundBytes.byteLength > 10 * 1024 * 1024 || !isValidCertificateBackground(backgroundBytes, backgroundMime)) {
      return NextResponse.json({ error: "The certificate design file is invalid." }, { status: 422 });
    }
  }

  const participant = certificate.participant_snapshot as {
    full_name?: string;
    event_name?: string;
    custom_fields?: Record<string, string | number | boolean | null>;
  } | null;

  try {
    const bytes = await createSimpleCertificatePdf({
      participantName: participant?.full_name || "Participant",
      eventName: participant?.event_name || "Event",
      certificateId: certificate.certificate_id,
      issueDate: certificate.issue_date,
      achievementTitle: certificate.achievement_title,
      customFields: participant?.custom_fields || {},
      template: backgroundMime ? { background_mime: backgroundMime, layout_json: layout } : null,
      backgroundBytes,
    });

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Certificate PDF could not be generated." }, { status: 422 });
  }
}
