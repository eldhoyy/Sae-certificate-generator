import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { makeQrDataUrl } from "@/lib/qr";

type LayoutField = {
  token?: string;
  label?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  bold?: boolean;
};

type CertificateTemplate = {
  background_mime: string;
  layout_json: { fields?: LayoutField[] } | null;
};

type CertificateData = {
  participantName: string;
  eventName: string;
  certificateId: string;
  issueDate?: string;
  achievementTitle?: string | null;
  template?: CertificateTemplate | null;
  backgroundBytes?: Uint8Array | null;
};

function safeColor(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return rgb(0.09, 0.15, 0.3);
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}

export async function createSimpleCertificatePdf(d: CertificateData) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  if (d.template && d.backgroundBytes) {
    const image = d.template.background_mime === "image/png"
      ? await pdf.embedPng(d.backgroundBytes)
      : d.template.background_mime === "image/jpeg"
        ? await pdf.embedJpg(d.backgroundBytes)
        : null;
    if (image) {
      page.drawImage(image, { x: 0, y: 0, width: 842, height: 595 });
      const values: Record<string, string> = {
        "{{participant_name}}": d.participantName,
        "{{event_name}}": d.eventName,
        "{{certificate_id}}": d.certificateId,
        "{{issue_date}}": d.issueDate || new Date().toLocaleDateString("en-IN"),
        "{{achievement_title}}": d.achievementTitle || "Participation",
        "{{custom_text}}": "",
      };
      for (const field of d.template.layout_json?.fields || []) {
        const x = Math.max(0, Math.min(100, Number(field.x) || 0)) / 100 * 842;
        const top = Math.max(0, Math.min(100, Number(field.y) || 0)) / 100 * 595;
        const size = Math.max(6, Math.min(72, Number(field.size) || 14)) * 0.75;
        const token = field.token || "";
        if (token === "{{qr_code}}") {
          const dataUrl = await makeQrDataUrl(d.certificateId);
          const imageBytes = Buffer.from(dataUrl.split(",")[1] || "", "base64");
          const qr = await pdf.embedPng(imageBytes);
          page.drawImage(qr, { x, y: 595 - top - 72, width: 72, height: 72 });
          continue;
        }
        const value = values[token] ?? (token.startsWith("{{") ? field.label || "" : token);
        if (!value) continue;
        const font: PDFFont = field.bold ? bold : regular;
        page.drawText(value.slice(0, 180), {
          x,
          y: Math.max(8, 595 - top - size),
          size,
          font,
          color: safeColor(field.color),
          maxWidth: Math.max(40, 842 - x - 16),
        });
      }
      return pdf.save();
    }
  }

  page.drawRectangle({ x: 22, y: 22, width: 798, height: 551, borderWidth: 2, borderColor: rgb(.15, .28, .62) });
  page.drawText("CERTIFICATE OF ACHIEVEMENT", { x: 150, y: 430, size: 27, font: bold, color: rgb(.09, .15, .3) });
  page.drawText("This certificate is proudly presented to", { x: 260, y: 365, size: 14, font: regular, color: rgb(.35, .39, .46) });
  page.drawText(d.participantName, { x: 180, y: 305, size: 30, font: bold, color: rgb(.12, .24, .55) });
  page.drawText("For participation in " + d.eventName, { x: 220, y: 250, size: 15, font: regular });
  page.drawText("Certificate ID: " + d.certificateId, { x: 45, y: 55, size: 10, font: regular });
  page.drawText("Issue date: " + (d.issueDate || new Date().toLocaleDateString("en-IN")), { x: 650, y: 55, size: 10, font: regular });
  return pdf.save();
}
