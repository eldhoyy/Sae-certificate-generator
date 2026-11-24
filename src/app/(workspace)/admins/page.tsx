import { Heading, Card } from "@/components/ui";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminManager } from "@/components/admin-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.rpc("super_admin_list_profiles");
  if (error) {
    return <>
      <Heading eyebrow="Platform control" title="Administrators" desc="Manage administrator access and platform roles." />
      <Card className="flex gap-3 bg-amber-50/60"><LockKeyhole size={18} className="text-amber-700" /><div><p className="text-xs font-bold">Super Admin access required</p><p className="mt-1 text-xs leading-5 text-slate-600">Only a provisioned Super Admin can view accounts or change administrator roles. If this is your platform, promote the first Super Admin through the documented secure SQL setup.</p></div></Card>
    </>;
  }
  return <>
    <Heading eyebrow="Platform control" title="Administrators" desc="Manage administrator access and platform roles." />
    <Card className="mb-5 flex gap-3 bg-blue-50/50"><ShieldCheck size={18} className="text-blue-700" /><div><p className="text-xs font-bold">Role changes are database-enforced</p><p className="mt-1 text-xs leading-5 text-slate-500">Role updates use a protected Supabase function. Each administrator remains isolated to their own workspace data.</p></div></Card>
    <AdminManager profiles={(data || []) as { id: string; display_name: string | null; role: "admin" | "super_admin"; created_at: string }[]} currentUserId={user?.id || ""} />
  </>;
}
