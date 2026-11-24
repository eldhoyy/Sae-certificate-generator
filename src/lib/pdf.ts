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
  fontFamily?: "Helvetica" | "TimesRoman" | "Courier";
  align?: "left" | "center" | "right";
  italic?: boolean;
  width?: number;
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
  customFields?: Record<string, string | number | boolean | null>;
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
    const fontSets = {
      Helvetica: { regular, bold, italic: await pdf.embedFont(StandardFonts.HelveticaOblique), boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique) },
      TimesRoman: { regular: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold), italic: await pdf.embedFont(StandardFonts.TimesRomanItalic), boldItalic: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic) },
      Courier: { regular: await pdf.embedFont(StandardFonts.Courier), bold: await pdf.embedFont(StandardFonts.CourierBold), italic: await pdf.embedFont(StandardFonts.CourierOblique), boldItalic: await pdf.embedFont(StandardFonts.CourierBoldOblique) },
    };
    if (d.template.background_mime === "application/pdf") {
      const [embeddedPage] = await pdf.embedPdf(d.backgroundBytes, [0]);
      const scale = Math.min(842 / embeddedPage.width, 595 / embeddedPage.height);
      const width = embeddedPage.width * scale;
      const height = embeddedPage.height * scale;
      page.drawPage(embeddedPage, { x: (842 - width) / 2, y: (595 - height) / 2, width, height });
    } else {
      const image = d.template.background_mime === "image/png"
        ? await pdf.embedPng(d.backgroundBytes)
        : await pdf.embedJpg(d.backgroundBytes);
      page.drawImage(image, { x: 0, y: 0, width: 842, height: 595 });
    }
    if (d.template.background_mime === "application/pdf" || d.template.background_mime === "image/png" || d.template.background_mime === "image/jpeg") {
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
        const customKey = token.startsWith("{{custom:") && token.endsWith("}}")
          ? token.slice(9, -2).trim()
          : "";
        const customValue = customKey
          ? (d.customFields?.[customKey] ?? Object.entries(d.customFields || {}).find(([key]) => key.toLowerCase() === customKey.toLowerCase())?.[1])
          : undefined;
        const value = customKey
          ? (customValue === null || customValue === undefined ? "" : String(customValue))
          : values[token] ?? (token.startsWith("{{") ? field.label || "" : token);
        if (!value) continue;
        const selectedFonts = fontSets[field.fontFamily || "Helvetica"] || fontSets.Helvetica;
        const font: PDFFont = field.bold
          ? (field.italic ? selectedFonts.boldItalic : selectedFonts.bold)
          : (field.italic ? selectedFonts.italic : selectedFonts.regular);
        const maxWidth = Math.max(40, Math.min(826 - x, 842 * (Math.max(10, Math.min(100, Number(field.width) || 80)) / 100)));
        const textWidth = font.widthOfTextAtSize(value.slice(0, 180), size);
        const align = field.align || "left";
        const drawX = align === "center" ? x - textWidth / 2 : align === "right" ? x - textWidth : x;
        page.drawText(value.slice(0, 180), {
          x: Math.max(8, drawX),
          y: Math.max(8, 595 - top - size),
          size,
          font,
          color: safeColor(field.color),
          maxWidth,
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
  const qrDataUrl = await makeQrDataUrl(d.certificateId);
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1] || "", "base64");
  const qrImage = await pdf.embedPng(qrBytes);
  page.drawImage(qrImage, { x: 748, y: 92, width: 64, height: 64 });
  page.drawText("SCAN TO VERIFY", { x: 742, y: 80, size: 6, font: bold, color: rgb(.15, .28, .62) });
  return pdf.save();
}
