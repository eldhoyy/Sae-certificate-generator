import { AppShell } from "@/components/app-shell";

// Workspace pages read authenticated Supabase data and must render per request.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
