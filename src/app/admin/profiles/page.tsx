import { createAdminClient } from "@/lib/supabase/admin";
import {
  asBoolean,
  formatDateTime,
  getProfileName,
  getRowDate,
  getRowId,
  safeJson,
  type GenericRow,
} from "@/lib/admin/data";

type ProfilesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminProfilesPage({ searchParams }: ProfilesPageProps) {
  const admin = createAdminClient();
  const resolvedParams = searchParams ? await searchParams : {};
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q.trim().toLowerCase() : "";

  const { data: profileRows = [], error } = await admin.from("profiles").select("*").order("id", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const profiles = (profileRows as GenericRow[]).filter((row) => {
    if (!query) return true;

    const haystack = [row.email, row.username, row.display_name, row.full_name]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/65">Profiles</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Read-only profile directory</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Profiles are surfaced here for moderation and access review. This page does not mutate profile records.
        </p>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" method="get">
          <input
            className="w-full rounded-full border border-white/10 bg-slate-950/40 px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            defaultValue={query}
            name="q"
            placeholder="Search profiles by email or name"
            type="search"
          />
          <button className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25" type="submit">
            Filter
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {profiles.map((profile) => {
          const id = getRowId(profile) ?? "unknown";
          return (
            <article className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5" key={id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xl font-semibold text-white">{getProfileName(profile)}</p>
                  <p className="mt-1 text-sm text-slate-300">{typeof profile.email === "string" ? profile.email : "No email available"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                      ID {id}
                    </span>
                    <span className="text-xs text-slate-400">Updated {formatDateTime(getRowDate(profile))}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        asBoolean(profile.is_superadmin) === true
                          ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                          : "border border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      {asBoolean(profile.is_superadmin) === true ? "Superadmin" : "Standard profile"}
                    </span>
                  </div>
                </div>

                <details className="min-w-72">
                  <summary className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                    Raw profile
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
                    {safeJson(profile)}
                  </pre>
                </details>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
