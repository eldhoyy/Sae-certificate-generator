import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldAlert, ShieldCheck } from "lucide-react";

type PublicVerification = {
  certificate_id: string;
  participant_name: string;
  event_name: string;
  issue_date: string | null;
  achievement_title: string | null;
  status: "valid" | "revoked" | string;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  let result: PublicVerification | null = null;
  let error = "";

  if (id?.trim() && id.trim().length <= 100) {
    try {
      const db = await createClient();
      const { data, error: queryError } = await db.rpc(
        "public_verify_certificate",
        { lookup_id: id.trim() },
      );

      if (queryError) {
        error = "Verification service is not configured.";
      } else {
        const rows = data as unknown as PublicVerification[] | PublicVerification | null;
        result = Array.isArray(rows) ? rows[0] ?? null : rows;
      }
    } catch {
      error = "Verification service is not configured.";
    }
  } else if (id?.trim()) {
    error = "Certificate IDs must be 100 characters or fewer.";
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-12">
      <div className="mx-auto max-w-xl">
        <Link href="/login" className="text-sm font-bold">Certify</Link>
        <div className="mt-10 rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <ShieldCheck size={27} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Certificate verification</h1>
          <p className="mt-2 text-sm text-slate-500">
            Check the authenticity and status of a certificate.
          </p>
          <form className="mt-7 flex flex-col gap-2 sm:flex-row">
            <input
              name="id"
              defaultValue={id ?? ""}
              required
              maxLength={100}
              placeholder="Enter certificate ID"
              className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm"
            />
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-xs font-semibold text-white">
              Verify certificate
            </button>
          </form>

          {id && (
            <div className="mt-6 rounded-2xl border p-5 text-left">
              {error ? (
                <p className="text-xs text-amber-700">{error}</p>
              ) : result ? (
                <>
                  <p className={`flex items-center gap-2 text-sm font-bold ${result.status === "valid" ? "text-emerald-700" : "text-rose-700"}`}>
                    {result.status === "valid" ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                    {result.status === "valid" ? "Certificate is valid" : "Certificate is not valid"}
                  </p>
                  <dl className="mt-4 space-y-3 text-xs">
                    {[
                      ["Certificate ID", result.certificate_id],
                      ["Participant", result.participant_name],
                      ["Event", result.event_name],
                      ["Issue date", result.issue_date],
                      ["Achievement", result.achievement_title],
                      ["Status", result.status],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-slate-400">{label}</dt>
                        <dd className="text-right font-semibold">{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <ShieldAlert size={18} /> No matching certificate found
                </p>
              )}
            </div>
          )}
          <p className="mt-7 text-[10px] leading-5 text-slate-400">
            Only approved public verification fields are displayed.
          </p>
        </div>
      </div>
    </main>
  );
}
