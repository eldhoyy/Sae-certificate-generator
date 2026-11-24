"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { folderSchema, eventSchema, participantSchema, templateSchema } from "@/lib/validation";
import { isValidCertificateBackground } from "@/lib/file-validation";

async function currentUser() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new Error("Authentication required");
  return { db, user };
}

export async function createFolder(input: unknown) {
  const data = folderSchema.parse(input);
  const { db, user } = await currentUser();
  const { error } = await db.from("event_folders").insert({ ...data, admin_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/folders");
}

export async function createEvent(input: unknown) {
  const data = eventSchema.parse(input);
  const { db, user } = await currentUser();
  const { error } = await db.from("events").insert({ ...data, admin_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/events");
}

export async function createParticipant(input: unknown) {
  const data = participantSchema.parse(input);
  const { db, user } = await currentUser();
  const { error } = await db.from("participants").insert({ ...data, admin_id: user.id });
  if (error?.code === "23505") throw new Error("This email is already registered for the selected event.");
  if (error) throw new Error(error.message);
  revalidatePath("/participants");
}

export async function saveTemplate(input: unknown) {
  const data = templateSchema.parse(input);
  const { db, user } = await currentUser();
  if (!data.background_path.startsWith(`${user.id}/`)) throw new Error("Template assets must belong to your administrator account.");
  const { data: asset, error: assetError } = await db.storage.from("certificate-templates").download(data.background_path);
  if (assetError || !asset) throw new Error("Template background could not be read from private storage.");
  if (asset.size > 10 * 1024 * 1024) throw new Error("Template background must be 10 MB or smaller.");
  const assetBytes = new Uint8Array(await asset.arrayBuffer());
  if (!isValidCertificateBackground(assetBytes, data.background_mime)) {
    throw new Error("The uploaded file content does not match its declared PNG, JPG or PDF format.");
  }
  const { error } = await db.from("templates").insert({ ...data, admin_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
}

export async function issueOneCertificate(input: {
  eventId: string;
  participantId: string;
  templateId?: string | null;
  achievementTitle?: string;
  idempotencyKey: string;
}) {
  const { db } = await currentUser();
  if (!/^[0-9a-f-]{36}$/i.test(input.eventId) || !/^[0-9a-f-]{36}$/i.test(input.participantId)) {
    throw new Error("Invalid event or participant.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) {
    throw new Error("Invalid issuance request key.");
  }
  if (input.templateId && !/^[0-9a-f-]{36}$/i.test(input.templateId)) {
    throw new Error("Invalid template.");
  }
  const { data, error } = await db.rpc("issue_certificate", {
    target_event_id: input.eventId,
    target_participant_id: input.participantId,
    target_template_id: input.templateId ?? null,
    target_achievement_title: input.achievementTitle?.trim().slice(0, 180) || null,
    request_key: input.idempotencyKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/certificates");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !row?.certificate_id) throw new Error("Certificate issuance returned no record.");
  return { id: row.id as string, certificateId: row.certificate_id as string, created: Boolean(row.created) };
}

export async function bulkCreateParticipants(input: {
  eventId: string;
  participants: { full_name: string; email?: string | null; external_ref?: string | null }[];
}) {
  const { db, user } = await currentUser();
  if (!/^[0-9a-f-]{36}$/i.test(input.eventId)) throw new Error("Choose a valid event.");
  if (!Array.isArray(input.participants) || input.participants.length < 1 || input.participants.length > 5000) {
    throw new Error("Import between 1 and 5,000 participants at a time.");
  }
  const cleaned = input.participants.map((item) => ({
    admin_id: user.id,
    event_id: input.eventId,
    full_name: String(item.full_name || "").trim().slice(0, 180),
    email: item.email ? String(item.email).trim().toLowerCase().slice(0, 254) : null,
    external_ref: item.external_ref ? String(item.external_ref).trim().slice(0, 180) : null,
  })).filter((item) => item.full_name.length > 0);

  if (!cleaned.length) throw new Error("No valid participant names were found.");
  if (cleaned.some((item) => item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))) {
    throw new Error("One or more email addresses are invalid.");
  }

  const { data: existing, error: lookupError } = await db.from("participants")
    .select("email").eq("event_id", input.eventId).not("email", "is", null);
  if (lookupError) throw new Error(lookupError.message);
  const seen = new Set((existing || []).map((item) => item.email?.toLowerCase()).filter(Boolean) as string[]);
  const batchSeen = new Set<string>();
  const unique = cleaned.filter((item) => {
    if (!item.email) return true;
    if (seen.has(item.email) || batchSeen.has(item.email)) return false;
    batchSeen.add(item.email);
    return true;
  });

  if (!unique.length) return { inserted: 0, skipped: cleaned.length };
  for (let start = 0; start < unique.length; start += 250) {
    const { error } = await db.from("participants").insert(unique.slice(start, start + 250));
    if (error) throw new Error(error.message);
  }
  revalidatePath("/participants");
  revalidatePath("/certificates");
  return { inserted: unique.length, skipped: input.participants.length - unique.length };
}

export async function bulkIssueCertificates(input: {
  certificates: { eventId: string; participantId: string }[];
  templateId?: string | null;
}) {
  const { db } = await currentUser();
  if (!Array.isArray(input.certificates) || input.certificates.length < 1 || input.certificates.length > 250) {
    throw new Error("Bulk issuance is limited to 250 participants per batch.");
  }
  if (input.templateId && !/^[0-9a-f-]{36}$/i.test(input.templateId)) throw new Error("Invalid template.");
  const issued: { id: string; certificateId: string; eventId: string; participantId: string }[] = [];
  const failures: { participantId: string; message: string }[] = [];

  for (const item of input.certificates) {
    if (!/^[0-9a-f-]{36}$/i.test(item.eventId) || !/^[0-9a-f-]{36}$/i.test(item.participantId)) {
      failures.push({ participantId: item.participantId, message: "Invalid event or participant ID" });
      continue;
    }
    const { data, error } = await db.rpc("issue_certificate", {
      target_event_id: item.eventId,
      target_participant_id: item.participantId,
      target_template_id: input.templateId ?? null,
      target_achievement_title: null,
      request_key: crypto.randomUUID(),
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.id || !row?.certificate_id) {
      failures.push({ participantId: item.participantId, message: error?.message || "Issuance failed" });
      continue;
    }
    issued.push({ id: row.id, certificateId: row.certificate_id, eventId: item.eventId, participantId: item.participantId });
  }
  revalidatePath("/certificates");
  return { issued, failures };
}

export async function setAdministratorRole(input: { userId: string; role: "admin" | "super_admin" }) {
  const { db } = await currentUser();
  if (!/^[0-9a-f-]{36}$/i.test(input.userId)) throw new Error("Invalid administrator account.");
  const { error } = await db.rpc("super_admin_set_role", {
    target_user_id: input.userId,
    new_role: input.role,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admins");
}

export async function updateMyDisplayName(input: { displayName: string }) {
  const { db } = await currentUser();
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 120) throw new Error("Display name must be 1–120 characters.");
  const { error } = await db.rpc("update_my_profile", { new_display_name: displayName });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function saveOrganizationSettings(input: {
  organizationName: string; website: string; contactEmail: string; dateFormat: string; pageSize: string;
}) {
  const { db, user } = await currentUser();
  const organizationName = input.organizationName.trim().slice(0, 160);
  const website = input.website.trim().slice(0, 300);
  const contactEmail = input.contactEmail.trim().slice(0, 254);
  if (website && !/^https?:\/\//i.test(website)) throw new Error("Website must start with https:// or http://.");
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("Enter a valid contact email.");
  if (!["DD MMM YYYY","DD/MM/YYYY","YYYY-MM-DD"].includes(input.dateFormat)) throw new Error("Invalid date format.");
  if (!["A4 Landscape","A4 Portrait"].includes(input.pageSize)) throw new Error("Invalid page size.");
  const { error } = await db.from("organization_settings").upsert({
    admin_id: user.id, organization_name: organizationName, website, contact_email: contactEmail,
    date_format: input.dateFormat, page_size: input.pageSize, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}


export async function revokeCertificate(input: { certificateId: string; reason: string }) {
  const { db } = await currentUser();
  if (!/^[0-9a-f-]{36}$/i.test(input.certificateId)) throw new Error("Invalid certificate record.");
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new Error("Enter a revocation reason between 3 and 500 characters.");
  const { error } = await db.rpc("revoke_certificate", {
    target_certificate_id: input.certificateId,
    reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/certificates");
}
