"use client";

import { useState } from "react";
import Link from "next/link";

export function HiddenAdminAccess() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="mt-20 flex min-h-10 items-center justify-center gap-3 text-[10px] text-slate-300">
      <button type="button" aria-label="Administrator access" onClick={() => setVisible((value) => !value)} className="rounded-full px-3 py-2 transition hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300">
        {visible ? "Close" : "·"}
      </button>
      {visible && <Link href="/login" className="font-medium tracking-wide text-slate-500 underline underline-offset-4">Administrator access</Link>}
    </div>
  );
}
