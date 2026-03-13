/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  createRecordAction,
  deleteRecordAction,
  updateRecordAction,
} from "@/app/admin/actions";
import {
  getAdminTableConfig,
  getEditableFields,
  matchesRowQuery,
  summarizeRow,
  type AdminFieldConfig,
} from "@/lib/admin/config";
import {
  asBoolean,
  asString,
  formatDateTime,
  getImageUrl,
  getRowDate,
  getRowId,
  safeJson,
  type GenericRow,
} from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";

type ResourcePageProps = {
  slug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function renderFieldInput(field: AdminFieldConfig, row: GenericRow | null) {
  const rawValue = row?.[field.key];

  if (field.input === "checkbox") {
    return (
      <label
        className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200"
        key={field.key}
      >
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

  if (field.input === "textarea") {
    return (
      <label className="block" key={field.key}>
        <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{field.label}</span>
        <textarea
          className="min-h-28 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          defaultValue={typeof rawValue === "string" ? rawValue : ""}
          name={field.key}
        />
      </label>
    );
  }

  return (
    <label className="block" key={field.key}>
      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{field.label}</span>
      <input
        className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        defaultValue={typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : ""}
        name={field.key}
        type={field.input ?? "text"}
      />
    </label>
  );
}

function findRelatedFlavorId(row: GenericRow) {
  const candidates = ["humor_flavor_id", "flavor_id", "id"];
  for (const key of candidates) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function isMissingTableError(message: string) {
  return message.includes("Could not find the table") || message.includes("schema cache");
}

async function resolveTableName(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  aliases: string[] = [],
) {
  const candidates = [table, ...aliases];

  for (const candidate of candidates) {
    const { error } = await admin.from(candidate).select("*").limit(1);
    if (!error) {
      return candidate;
    }

    if (!isMissingTableError(error.message)) {
      throw new Error(error.message);
    }
  }

  throw new Error(`Could not find any matching table for ${table}.`);
}

export default async function AdminResourcePage({ slug, searchParams }: ResourcePageProps) {
  const config = getAdminTableConfig(slug);
  if (!config) {
    throw new Error(`Unknown admin resource: ${slug}`);
  }

  const admin = createAdminClient();
  const resolvedParams = searchParams ? await searchParams : {};
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q.trim().toLowerCase() : "";
  const selectedId = typeof resolvedParams.edit === "string" ? resolvedParams.edit : null;
  const notice = typeof resolvedParams.message === "string" ? resolvedParams.message : null;
  const status = typeof resolvedParams.status === "string" ? resolvedParams.status : null;
  const resolvedTable = await resolveTableName(admin, config.table, config.tableAliases);

  let tableQuery = admin.from(resolvedTable).select("*");
  if (config.orderBy) {
    tableQuery = tableQuery.order(config.orderBy, { ascending: false });
  }

  const [{ data: rowData = [], error }, relatedStepsResult] = await Promise.all([
    tableQuery,
    slug === "humor-flavors"
      ? admin.from("humor_flavor_steps").select("*").order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (rowData as GenericRow[]).filter((row) => matchesRowQuery(row, query, config.searchKeys));
  const relatedSteps = (relatedStepsResult.data ?? []) as GenericRow[];
  const selectedRow = selectedId ? rows.find((row) => getRowId(row) === selectedId) ?? null : rows[0] ?? null;
  const hasMutationPanels = config.createEnabled || (config.updateEnabled && Boolean(selectedRow));
  const referenceRow = selectedRow ?? rows[0] ?? null;
  const fields = getEditableFields(config, referenceRow);
  const editableKeys = fields.map((field) => field.key).join(",");

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/65">{config.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{config.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">{config.description}</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          {rows.length} {rows.length === 1 ? "row" : "rows"} loaded
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <input
            className="w-full rounded-full border border-white/10 bg-slate-950/40 px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            defaultValue={query}
            name="q"
            placeholder={`Search ${config.title.toLowerCase()}`}
            type="search"
          />
          <button
            className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
            type="submit"
          >
            Filter
          </button>
        </form>
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

      <section className={`grid gap-6 ${hasMutationPanels ? "2xl:grid-cols-[minmax(24rem,0.92fr)_minmax(0,1.08fr)]" : ""}`}>
        {hasMutationPanels ? (
        <div className="min-w-0 space-y-6">
          {config.createEnabled ? (
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.26em] text-cyan-100/65">Create</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Add {config.singularLabel}</h3>

              <form action={createRecordAction} className="mt-5 space-y-4">
                <input name="table_slug" type="hidden" value={slug} />
                <input name="editable_keys" type="hidden" value={editableKeys} />
                {fields.map((field) => renderFieldInput(field, null))}

                {slug === "images" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Upload File</span>
                    <input
                      accept="image/*"
                      className="w-full rounded-[1.2rem] border border-dashed border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-50"
                      name="image_file"
                      type="file"
                    />
                  </label>
                ) : null}

                <button
                  className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
                  type="submit"
                >
                  Create {config.singularLabel}
                </button>
              </form>
            </section>
          ) : null}

          {config.updateEnabled && selectedRow ? (
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.26em] text-amber-100/65">Update</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Edit selected {config.singularLabel}</h3>

              <form action={updateRecordAction} className="mt-5 space-y-4">
                <input name="table_slug" type="hidden" value={slug} />
                <input name="record_id" type="hidden" value={getRowId(selectedRow) ?? ""} />
                <input name="editable_keys" type="hidden" value={editableKeys} />
                {fields.map((field) => renderFieldInput(field, selectedRow))}

                {slug === "images" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Replace File</span>
                    <input
                      accept="image/*"
                      className="w-full rounded-[1.2rem] border border-dashed border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-50"
                      name="image_file"
                      type="file"
                    />
                  </label>
                ) : null}

                <button
                  className="rounded-full border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
                  type="submit"
                >
                  Save changes
                </button>
              </form>

              {config.deleteEnabled ? (
                <form action={deleteRecordAction} className="mt-4">
                  <input name="table_slug" type="hidden" value={slug} />
                  <input name="record_id" type="hidden" value={getRowId(selectedRow) ?? ""} />
                  <button
                    className="rounded-full border border-rose-300/35 bg-rose-300/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20"
                    type="submit"
                  >
                    Delete {config.singularLabel}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>
        ) : null}

        <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-100/65">Browse</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Current {config.title.toLowerCase()}</h3>
          </div>

          <div className="mt-5 space-y-4">
            {rows.map((row) => {
              const id = getRowId(row) ?? "unknown";
              const isSelected = selectedRow ? getRowId(selectedRow) === id : false;
              const imageUrl = getImageUrl(row);
              const flavorId = findRelatedFlavorId(row);
              const steps =
                slug === "humor-flavors"
                  ? relatedSteps.filter((step) => findRelatedFlavorId(step) === flavorId)
                  : [];

              return (
                <article
                  className={`min-w-0 overflow-hidden rounded-[1.5rem] border p-4 ${
                    isSelected ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-slate-950/35"
                  }`}
                  key={id}
                >
                  {imageUrl ? (
                    <img alt={config.singularLabel} className="mb-4 h-44 w-full rounded-[1.2rem] object-cover" src={imageUrl} />
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                      ID {id}
                    </p>
                    <p className="text-xs text-slate-400">Updated {formatDateTime(getRowDate(row))}</p>
                    {slug === "users" ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          asBoolean(row.is_superadmin) === true
                            ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                            : "border border-white/10 bg-white/5 text-slate-300"
                        }`}
                      >
                        {asBoolean(row.is_superadmin) === true ? "Superadmin" : "Standard user"}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 break-words text-sm leading-7 text-slate-200">
                    {summarizeRow(row, config) ?? `No summary fields available for this ${config.singularLabel}.`}
                  </p>

                  {steps.length > 0 ? (
                    <div className="mt-4 min-w-0 rounded-[1.2rem] border border-white/10 bg-slate-950/55 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Flavor Steps</p>
                      <div className="mt-3 space-y-3">
                        {steps.map((step, index) => (
                          <div className="min-w-0 rounded-[1rem] border border-white/10 bg-white/5 p-3" key={`${id}-step-${index}`}>
                            <p className="break-words text-sm font-medium text-white">
                              {summarizeRow(step, {
                                ...config,
                                searchKeys: ["name", "description", "system_prompt", "user_prompt"],
                              }) ?? `Step ${index + 1}`}
                            </p>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">
                              {safeJson(step)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {config.updateEnabled ? (
                      <Link
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                        href={`/admin/${slug}?edit=${encodeURIComponent(id)}`}
                      >
                        Edit
                      </Link>
                    ) : null}
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-slate-400">
                      Raw row
                    </summary>
                    <pre className="mt-3 max-w-full overflow-x-auto rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
                      {safeJson(row)}
                    </pre>
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
