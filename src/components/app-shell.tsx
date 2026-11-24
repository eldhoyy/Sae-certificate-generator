"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FolderKanban, PanelsTopLeft,
  Award, ScanSearch, ShieldCheck, Settings, Menu, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brand } from "@/lib/brand";

const nav = [
  ["Overview", "/workspace", LayoutDashboard],
  ["Event folders", "/folders", FolderKanban],
  ["Templates", "/templates", PanelsTopLeft],
  ["Certificates", "/certificates", Award],
  ["Verification", "/verification", ScanSearch],
  ["Administrators", "/admins", ShieldCheck],
  ["Settings", "/settings", Settings],
] as const;

type AppRole = "admin" | "super_admin";

function BrandMark() {
  return <span aria-label={brand.chapterName} className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold tracking-tight text-white shadow-sm" style={{ backgroundColor: brand.colors.primary }}>{brand.shortName}</span>;
}

export function AppShell({ children, displayName, email, role }: { children: React.ReactNode; displayName: string; email: string; role: AppRole }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNav = nav.filter(([, href]) => href !== "/admins" || role === "super_admin");
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AD";

  async function logout() {
    try { await createClient().auth.signOut(); }
    finally { router.replace("/login"); }
  }

  const side = (
    <>
      <div className="flex min-h-[76px] items-center gap-3 border-b border-slate-100 px-5">
        <BrandMark />
        <div className="min-w-0"><b className="block truncate text-sm tracking-tight">{brand.chapterName}</b><p className="text-[10px] uppercase tracking-[.13em] text-slate-400">Certificate system</p></div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {visibleNav.map(([label, href, Icon]) => (
          <div key={href}>
            {href === "/admins" && <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Administration</p>}
            <Link onClick={() => setOpen(false)} href={href} className={"flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 " + (path === href || (href === "/folders" && path.startsWith("/folders/")) ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50")}><Icon size={17} />{label}</Link>
          </div>
        ))}
      </nav>
      <div className="p-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold">Workspace setup</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Configure your chapter and certificate workflow.</p><Link href="/settings" className="mt-2 inline-block text-xs font-semibold text-blue-700">Configure workspace →</Link></div></div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-slate-200 bg-white lg:flex">{side}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30" /><aside className="relative flex h-full w-[280px] flex-col bg-white">{side}</aside></div>}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-lg p-2 transition-colors hover:bg-slate-50 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button><p className="text-xs text-slate-400">Workspace / <b className="text-slate-700">{nav.find((item) => item[1] === path)?.[0] || (path.startsWith("/folders/") ? "Event folder" : "Overview")}</b></p></div>
          <div className="flex items-center gap-3"><span title={email} className="grid size-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initials}</span><span className="hidden text-right sm:block"><b className="block text-xs font-semibold">{displayName}</b><small className="text-[10px] text-slate-400">{role === "super_admin" ? "Super Admin" : "Administrator"}</small></span><button onClick={logout} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50"><LogOut size={16} /></button></div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-76px-68px)] max-w-[1500px] p-5 sm:p-8">{children}</main>
        <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-white px-5 py-5 text-[10px] text-slate-400 sm:justify-between sm:px-8"><span>{brand.footerText}</span><span className="flex items-center gap-1.5" aria-label="Chapter brand colours">{brand.colors.accent.map((color, index) => <i key={index} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />)}</span></footer>
      </div>
    </div>
  );
}
