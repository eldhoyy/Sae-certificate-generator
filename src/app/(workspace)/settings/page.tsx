import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/settings-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createClient();
  const [{ data: { user } }, { data: profile }, { data: settings }] = await Promise.all([
    db.auth.getUser(),
    db.from("profiles").select("display_name").maybeSingle(),
    db.from("organization_settings").select("organization_name,website,contact_email,date_format,page_size").maybeSingle(),
  ]);
  return <SettingsManager
    displayName={profile?.display_name || ""}
    email={user?.email || ""}
    settings={{
      organization_name: settings?.organization_name || "",
      website: settings?.website || "",
      contact_email: settings?.contact_email || "",
      date_format: settings?.date_format || "DD MMM YYYY",
      page_size: settings?.page_size || "A4 Landscape",
    }}
  />;
}
