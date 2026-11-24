"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heading, Card, Input, Button } from "@/components/ui";
import { Building2, UserRound, Shield, SlidersHorizontal } from "lucide-react";
import { saveOrganizationSettings, updateMyDisplayName } from "@/app/actions";

const tabs = [["organisation","Organisation",Building2],["profile","Profile",UserRound],["security","Security",Shield],["preferences","Preferences",SlidersHorizontal]] as const;
type Settings = { organization_name: string; website: string; contact_email: string; date_format: string; page_size: string };

export function SettingsManager({ displayName, email, settings }: { displayName: string; email: string; settings: Settings }) {
  const [tab,setTab] = useState("organisation");
  const [name,setName] = useState(displayName);
  const [organization,setOrganization] = useState(settings.organization_name);
  const [website,setWebsite] = useState(settings.website);
  const [contact,setContact] = useState(settings.contact_email);
  const [dateFormat,setDateFormat] = useState(settings.date_format);
  const [pageSize,setPageSize] = useState(settings.page_size);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const router = useRouter();

  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      if (tab === "profile") await updateMyDisplayName({ displayName: name });
      else await saveOrganizationSettings({ organizationName: organization, website, contactEmail: contact, dateFormat, pageSize });
      setNotice("Settings saved."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save settings."); }
    finally { setBusy(false); }
  }

  return <>
    <Heading eyebrow="Workspace configuration" title="Settings" desc="Manage organisation details, your profile and workspace preferences." />
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit p-2">{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>{setTab(id);setError("");setNotice("");}} className={"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold "+(tab===id?"bg-blue-50 text-blue-700":"text-slate-500")}><Icon size={15}/>{label}</button>)}</Card>
      <Card>
        <h2 className="text-sm font-bold">{tabs.find(x=>x[0]===tab)?.[1]} settings</h2>
        <p className="mb-5 mt-1 text-xs text-slate-400">Settings are saved to your administrator workspace.</p>
        {tab==="organisation" && <div className="grid max-w-xl gap-4"><Input label="Organisation name" value={organization} onChange={(e)=>setOrganization(e.target.value)} placeholder="Institution or organisation"/><Input label="Public website" value={website} onChange={(e)=>setWebsite(e.target.value)} placeholder="https://example.org"/><Input label="Contact email" value={contact} onChange={(e)=>setContact(e.target.value)} placeholder="certificates@example.org"/><Button onClick={save} disabled={busy}>{busy?"Saving…":"Save organisation"}</Button></div>}
        {tab==="profile" && <div className="grid max-w-xl gap-4"><Input label="Display name" value={name} onChange={(e)=>setName(e.target.value)}/><Input label="Email address" value={email} disabled/><Button onClick={save} disabled={busy}>{busy?"Saving…":"Save profile"}</Button></div>}
        {tab==="security" && <div className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">Authentication is handled by Supabase Auth. Workspace data access is restricted by PostgreSQL Row Level Security. Password and MFA management remain in the authentication provider.</div>}
        {tab==="preferences" && <div className="grid max-w-xl gap-4"><label className="text-xs">Default certificate page size<select value={pageSize} onChange={e=>setPageSize(e.target.value)} className="mt-2 block w-full rounded-xl border p-3"><option>A4 Landscape</option><option>A4 Portrait</option></select></label><label className="text-xs">Default date format<select value={dateFormat} onChange={e=>setDateFormat(e.target.value)} className="mt-2 block w-full rounded-xl border p-3"><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></label><Button onClick={save} disabled={busy}>{busy?"Saving…":"Save preferences"}</Button></div>}
        {error && <p role="alert" className="mt-4 text-xs text-rose-600">{error}</p>}
        {notice && <p role="status" className="mt-4 text-xs text-emerald-700">{notice}</p>}
      </Card>
    </div>
  </>;
}
