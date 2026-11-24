"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { folderSchema, eventSchema, participantSchema, templateSchema } from "@/lib/validation";

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
  if (error) throw new Error(error.message);
  revalidatePath("/participants");
}

export async function saveTemplate(input: unknown) {
  const data = templateSchema.parse(input);
  const { db, user } = await currentUser();
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
