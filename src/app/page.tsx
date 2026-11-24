const overview = [
  { label: "Certificates issued", value: "—", note: "Issuance data will appear here" },
  { label: "Participants", value: "—", note: "Across your events" },
  { label: "Active events", value: "—", note: "Your event workspaces" },
  { label: "Event folders", value: "—", note: "Organised in one place" },
];

const steps = [
  { number: "01", title: "Create an event folder", detail: "Group related programmes and events in a workspace." },
  { number: "02", title: "Set up your certificate", detail: "Upload a background and arrange dynamic fields." },
  { number: "03", title: "Add participants", detail: "Enter people individually or import a spreadsheet." },
  { number: "04", title: "Issue and verify", detail: "Generate PDFs and let recipients verify certificates online." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--line)] bg-white px-5 py-7 lg:block">
        <a href="/" className="flex items-center gap-3 text-lg font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-[#3157d5] text-sm text-white">C</span>
          Certify
        </a>
        <p className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        <nav className="space-y-1 text-sm">
          <a className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2.5 font-semibold text-blue-700" href="/">▦ <span>Overview</span></a>
          <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500">▤ <span>Event folders</span></span>
          <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500">◇ <span>Certificates</span></span>
          <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500">⌕ <span>Verification</span></span>
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold">Getting started</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Your workspace foundation is ready. Core features are being built in stages.</p>
        </div>
      </aside>

      <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:ml-64 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
          <div>
            <p className="text-sm text-slate-500">Workspace / Overview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good to have you here.</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your events and certificates from one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">Setup in progress</span>
            <div className="grid size-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">A</div>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight">{item.value}</p>
              <p className="mt-2 text-xs text-slate-400">{item.note}</p>
            </article>
          ))}
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl bg-[#17264b] p-6 text-white sm:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">Your certificate workspace</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">From event registration to verified certificates.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">A clear workflow for organising events, designing certificates, issuing documents and verifying them publicly.</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#17264b]">Workspace foundation</span>
            <span className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/80">Authentication coming next</span>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Workflow</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">How the platform will work</h2>
            </div>
            <span className="text-xs text-slate-400">Planned product flow</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {steps.map((step) => (
              <article key={step.number} className="flex gap-4 rounded-2xl border border-[var(--line)] bg-white p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{step.number}</span>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{step.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <footer className="mt-12 border-t border-[var(--line)] py-6 text-xs text-slate-400">Certify · Certificate management platform · Early development</footer>
      </section>
    </main>
  );
}
