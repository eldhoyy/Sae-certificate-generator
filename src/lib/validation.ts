import {z} from "zod";
export const folderSchema=z.object({name:z.string().trim().min(1).max(120),description:z.string().trim().max(1000).optional()});
export const eventSchema=z.object({name:z.string().trim().min(1).max(180),folder_id:z.string().uuid().nullable().optional(),description:z.string().trim().max(2000).optional(),starts_at:z.string().datetime().nullable().optional(),ends_at:z.string().datetime().nullable().optional()});
export const participantSchema=z.object({event_id:z.string().uuid(),full_name:z.string().trim().min(1).max(180),email:z.union([z.string().email(),z.literal("")]).optional(),external_ref:z.string().trim().max(180).optional(),custom_fields:z.record(z.string(),z.unknown()).optional()});
const templateFieldSchema = z.object({
  id: z.number().int().positive(), label: z.string().trim().min(1).max(80),
  token: z.string().trim().min(1).max(120), x: z.number().min(0).max(100),
  y: z.number().min(0).max(100), size: z.number().min(9).max(52),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/), bold: z.boolean(),
  fontFamily: z.enum(["Helvetica","TimesRoman","Courier"]),
});
export const templateSchema=z.object({
  name:z.string().trim().min(1).max(120), background_path:z.string().min(1).max(500),
  background_mime:z.enum(["application/pdf","image/png","image/jpeg"]),
  layout_json:z.object({version:z.literal(1),fields:z.array(templateFieldSchema).max(40)}),
});
