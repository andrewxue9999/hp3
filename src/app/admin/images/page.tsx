import Link from "next/link";
import { createImageAction, deleteImageAction, updateImageAction } from "@/app/admin/images/actions";
import {
  asBoolean,
  formatDateTime,
  getImageUrl,
  getRowDate,
  getRowId,
  safeJson,
  type GenericRow,
} from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";

const editableFields = [
  { key: "url", label: "Image URL", type: "url" },
  { key: "description", label: "Description", type: "text" },
  { key: "is_common_use", label: "Common Use", type: "checkbox" },
  { key: "user_id", label: "Owner Profile ID", type: "text" },
] as const;

type ImagesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminImagesPage({ searchParams }: ImagesPageProps) {
  const admin = createAdminClient();
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedId = typeof resolvedParams.edit === "string" ? resolvedParams.edit : null;
  const notice = typeof resolvedParams.message === "string" ? resolvedParams.message : null;
  const status = typeof resolvedParams.status === "string" ? resolvedParams.status : null;

  const { data: imageRows = [], error } = await admin.from("images").select("*").order("id", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const images = imageRows as GenericRow[];
  const selectedImage = selectedId ? images.find((row) => getRowId(row) === selectedId) ?? null : images[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/65">Image CRUD</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Manage image inventory</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Create, inspect, update, or remove meme source images without changing database policies.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          {images.length} image rows loaded
        </div>
      </section>

      {notice ? (
        <section
          className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
            status === "success"
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : "border-rose-300/30 bg-rose-300/10 text-rose-100"
          }`}
        >
          {notice}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-100/65">Create</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Add an image row</h3>

            <form action={createImageAction} className="mt-5 space-y-4">
              {editableFields.map((field) =>
                field.type === "checkbox" ? (
                  <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200" key={field.key}>
                    <input className="h-4 w-4 accent-cyan-300" name={field.key} type="checkbox" />
                    {field.label}
                  </label>
                ) : (
                  <label className="block" key={field.key}>
                    <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{field.label}</span>
                    <input
                      className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      name={field.key}
                      placeholder={field.label}
                      type={field.type}
                    />
                  </label>
                ),
              )}

              <button className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25" type="submit">
                Create image
              </button>
            </form>
          </section>

          {selectedImage ? (
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.26em] text-amber-100/65">Update</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Edit selected image</h3>

              <form action={updateImageAction} className="mt-5 space-y-4">
                <input name="image_id" type="hidden" value={getRowId(selectedImage) ?? ""} />

                {editableFields.map((field) => {
                  const rawValue = selectedImage[field.key];

                  if (field.type === "checkbox") {
                    return (
                      <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200" key={field.key}>
                        <input
                          className="h-4 w-4 accent-cyan-300"
                          defaultChecked={asBoolean(rawValue) === true}
                          name={field.key}
                          type="checkbox"
                        />
                        {field.label}
                      </label>
                    );
                  }

                  return (
                    <label className="block" key={field.key}>
                      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{field.label}</span>
                      <input
                        className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                        defaultValue={typeof rawValue === "string" ? rawValue : ""}
                        name={field.key}
                        type={field.type}
                      />
                    </label>
                  );
                })}

                <button className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25" type="submit">
                  Save changes
                </button>
              </form>

              <form action={deleteImageAction} className="mt-4">
                <input name="image_id" type="hidden" value={getRowId(selectedImage) ?? ""} />
                <button className="rounded-full border border-rose-300/35 bg-rose-300/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20" type="submit">
                  Delete image
                </button>
              </form>
            </section>
          ) : null}
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-100/65">Browse</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Current image rows</h3>
          </div>

          <div className="mt-5 space-y-4">
            {images.map((image) => {
              const id = getRowId(image) ?? "unknown";
              const url = getImageUrl(image);
              const isSelected = selectedImage ? getRowId(selectedImage) === id : false;

              return (
                <article
                  className={`rounded-[1.5rem] border p-4 ${
                    isSelected
                      ? "border-cyan-300/35 bg-cyan-300/10"
                      : "border-white/10 bg-slate-950/35"
                  }`}
                  key={id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row">
                    {url ? (
                      <img alt="Meme source" className="h-36 w-full rounded-[1.2rem] object-cover lg:w-44" src={url} />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center rounded-[1.2rem] bg-white/5 text-sm text-slate-400 lg:w-44">
                        No preview
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                          ID {id}
                        </p>
                        <p className="text-xs text-slate-400">Updated {formatDateTime(getRowDate(image))}</p>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-slate-200">
                        {typeof image.description === "string" && image.description.trim().length > 0
                          ? image.description
                          : "No description saved for this image."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                          href={`/admin/images?edit=${encodeURIComponent(id)}`}
                        >
                          Edit
                        </Link>
                        <span className="text-xs text-slate-400">
                          Common use: {asBoolean(image.is_common_use) === true ? "Yes" : "No"}
                        </span>
                      </div>

                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-slate-400">
                          Raw row
                        </summary>
                        <pre className="mt-3 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
                          {safeJson(image)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
