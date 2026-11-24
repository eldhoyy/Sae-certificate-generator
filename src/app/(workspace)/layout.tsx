import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

// Workspace pages read authenticated Supabase data and must render per request.
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user
    ? await db.from("profiles").select("display_name,role").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <AppShell
      displayName={profile?.display_name || user?.email?.split("@")[0] || "Administrator"}
      email={user?.email || ""}
      role={profile?.role || "admin"}
    >
      {children}
    </AppShell>
  );
}
