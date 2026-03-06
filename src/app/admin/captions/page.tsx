import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTime,
  getCaptionText,
  getImageUrl,
  getProfileName,
  getRowDate,
  getRowId,
  type GenericRow,
} from "@/lib/admin/data";

function getProfileId(row: GenericRow) {
  return getRowId({ id: row.author_id ?? row.profile_id ?? row.user_id });
}

function getImageId(row: GenericRow) {
  return getRowId({ id: row.image_id });
}

type CaptionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCaptionsPage({ searchParams }: CaptionsPageProps) {
  const admin = createAdminClient();
  const resolvedParams = searchParams ? await searchParams : {};
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q.trim().toLowerCase() : "";

  const [{ data: captionRows = [], error }, { data: imageRows = [] }, { data: profileRows = [] }] =
    await Promise.all([
      admin.from("captions").select("*").order("id", { ascending: false }),
      admin.from("images").select("*"),
      admin.from("profiles").select("*"),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const captions = (captionRows as GenericRow[]).filter((row) => {
    if (!query) return true;
    return (getCaptionText(row) ?? "").toLowerCase().includes(query);
  });
  const imageMap = new Map((imageRows as GenericRow[]).map((row) => [getRowId(row) ?? "", row]));
  const profileMap = new Map((profileRows as GenericRow[]).map((row) => [getRowId(row) ?? "", row]));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/65">Captions</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Read-only caption archive</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Browse live caption data with quick image and author context. This page is intentionally read-only.
        </p>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" method="get">
          <input
            className="w-full rounded-full border border-white/10 bg-slate-950/40 px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            defaultValue={query}
            name="q"
            placeholder="Search caption text"
            type="search"
          />
          <button className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25" type="submit">
            Filter
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {captions.map((caption) => {
          const id = getRowId(caption) ?? "unknown";
          const image = imageMap.get(getImageId(caption) ?? "");
          const profile = profileMap.get(getProfileId(caption) ?? "");

          return (
            <article className="rounded-[1.7rem] border border-white/10 bg-white/5 p-4" key={id}>
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                {image && getImageUrl(image) ? (
                  <img
                    alt="Caption image context"
                    className="h-44 w-full rounded-[1.4rem] object-cover"
                    src={getImageUrl(image) ?? ""}
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-[1.4rem] bg-slate-950/40 text-sm text-slate-400">
                    No image preview
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                      Caption ID {id}
                    </p>
                    <p className="text-xs text-slate-400">Author: {getProfileName(profile ?? {})}</p>
                    <p className="text-xs text-slate-400">Updated {formatDateTime(getRowDate(caption))}</p>
                  </div>

                  <p className="mt-4 text-lg leading-8 text-white">
                    {getCaptionText(caption) ?? "Caption text unavailable."}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
