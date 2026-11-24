import { Award, Search, ShieldCheck } from "lucide-react";
import { HiddenAdminAccess } from "@/components/hidden-admin-access";

export const metadata = {
  title: "Certificate verification",
  description: "Verify and download your certificate using its certificate ID.",
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#fafaf9] px-5 text-[#202326]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-7">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-[#202326] text-white"><Award size={18} /></span>
          <span className="text-sm font-semibold tracking-tight">CERTIFICATE DESK</span>
        </div>
        <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex"><ShieldCheck size={14} /> Official certificate portal</span>
      </header>
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center pb-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-slate-400">Certificate verification</p>
        <h1 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">Your achievement.<br/>Verified in seconds.</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">Enter the certificate ID printed on your document to verify its authenticity and download your certificate.</p>
        <form action="/verify" className="mt-9 flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.04)] sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search size={18} className="shrink-0 text-slate-400"/>
            <input name="id" required maxLength={100} placeholder="Enter your certificate ID" className="h-12 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"/>
          </label>
          <button className="h-12 rounded-xl bg-[#202326] px-7 text-xs font-semibold text-white transition hover:bg-black">Verify certificate</button>
        </form>
        <p className="mt-4 text-[10px] text-slate-400">No account or sign-in required.</p>
        <HiddenAdminAccess />
      </section>
      <footer className="mx-auto w-full max-w-5xl border-t border-slate-200 py-5 text-center text-[10px] text-slate-400">Secure certificate verification · Powered by Certificate Desk</footer>
    </main>
  );
}
