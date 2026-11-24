"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAdministratorRole } from "@/app/actions";

type Profile = { id: string; display_name: string | null; role: "admin" | "super_admin"; created_at: string };

export function AdminManager({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  async function changeRole(profile: Profile, role: Profile["role"]) {
    setBusy(profile.id); setError(""); setNotice("");
    try {
      await setAdministratorRole({ userId: profile.id, role });
      setNotice(`Updated role for ${profile.display_name || "administrator"}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update administrator role.");
    } finally { setBusy(""); }
  }

  return <section className="rounded-2xl border bg-white p-5">
    <div className="mb-4"><h2 className="text-sm font-bold">Administrator accounts</h2><p className="mt-1 text-xs text-slate-500">{profiles.length} provisioned accounts · account creation is handled through Supabase Auth invitations</p></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Administrator</th><th>Role</th><th>Joined</th><th>Access</th></tr></thead><tbody className="divide-y">{profiles.map((profile) => <tr key={profile.id}><td className="py-3"><p className="font-semibold">{profile.display_name || "Unnamed administrator"}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{profile.id}</p></td><td><span className="rounded-full bg-slate-100 px-2 py-1">{profile.role.replace("_", " ")}</span></td><td>{new Date(profile.created_at).toLocaleDateString()}</td><td><select aria-label={`Role for ${profile.display_name || profile.id}`} disabled={!!busy || profile.id === currentUserId} value={profile.role} onChange={(e) => changeRole(profile, e.target.value as Profile["role"])} className="rounded-lg border bg-white px-2 py-1.5 disabled:opacity-50"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></td></tr>)}</tbody></table></div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    {notice && <p role="status" className="mt-3 text-xs text-emerald-700">{notice}</p>}
  </section>;
}
