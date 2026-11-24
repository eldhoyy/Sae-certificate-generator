"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteAdministrator, setAdministratorRole } from "@/app/actions";

type Profile = { id: string; display_name: string | null; role: "admin" | "super_admin"; created_at: string };

export function AdminManager({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const router = useRouter();

  async function sendInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("invite"); setError(""); setNotice("");
    try {
      const result = await inviteAdministrator({ email: inviteEmail, displayName: inviteName });
      setNotice(`Invitation sent to ${result.email}. They will join as an Admin after accepting.`);
      setInviteEmail(""); setInviteName(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send administrator invitation."); }
    finally { setBusy(""); }
  }

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
    <div className="mb-4"><h2 className="text-sm font-bold">Administrator accounts</h2><p className="mt-1 text-xs text-slate-500">{profiles.length} provisioned accounts · invite new administrators through Supabase Auth</p></div>
    <form onSubmit={sendInvite} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-medium">Administrator name<input required maxLength={120} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm"/></label><label className="text-xs font-medium">Email address<input required type="email" maxLength={254} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm"/></label><button disabled={!!busy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy === "invite" ? "Sending invite…" : "Invite administrator"}</button></form>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2">Administrator</th><th>Role</th><th>Joined</th><th>Access</th></tr></thead><tbody className="divide-y">{profiles.map((profile) => <tr key={profile.id}><td className="py-3"><p className="font-semibold">{profile.display_name || "Unnamed administrator"}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{profile.id}</p></td><td><span className="rounded-full bg-slate-100 px-2 py-1">{profile.role.replace("_", " ")}</span></td><td>{new Date(profile.created_at).toLocaleDateString()}</td><td><select aria-label={`Role for ${profile.display_name || profile.id}`} disabled={!!busy || profile.id === currentUserId} value={profile.role} onChange={(e) => changeRole(profile, e.target.value as Profile["role"])} className="rounded-lg border bg-white px-2 py-1.5 disabled:opacity-50"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></td></tr>)}</tbody></table></div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    {notice && <p role="status" className="mt-3 text-xs text-emerald-700">{notice}</p>}
  </section>;
}
