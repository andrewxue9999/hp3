import Link from "next/link";
import {
  createFlavorAction,
  createStepAction,
  deleteFlavorAction,
  deleteStepAction,
  normalizeStepOrderAction,
  reorderStepAction,
  updateFlavorAction,
  updateStepAction,
} from "@/app/admin/humor-flavors/actions";
import { formatDateTime } from "@/lib/admin/data";
import {
  getCaptionsForFlavor,
  getStepsForFlavor,
  type HumorFlavorCaptionRecord,
  type HumorFlavorImageRecord,
  type HumorFlavorRecord,
  type HumorFlavorStepRecord,
} from "@/lib/humor-flavors";
import HumorFlavorTestConsole from "@/components/humor-flavor-test-console";

type HumorFlavorStudioProps = {
  flavors: HumorFlavorRecord[];
  steps: HumorFlavorStepRecord[];
  images: HumorFlavorImageRecord[];
  recentCaptions: HumorFlavorCaptionRecord[];
  selectedFlavorId: string | null;
  notice: string | null;
  status: "success" | "error" | null;
  apiBaseUrl: string;
  flavorParamKey: string;
};

function panelTitle(eyebrow: string, title: string, description?: string) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">{description}</p> : null}
    </div>
  );
}

function stepPreview(step: HumorFlavorStepRecord) {
  return step.userPrompt ?? step.systemPrompt ?? step.description ?? "No prompt text saved.";
}

function stepOrderLabel(step: HumorFlavorStepRecord, index: number) {
  return Number.isFinite(step.stepOrder) && step.stepOrder !== Number.MAX_SAFE_INTEGER ? step.stepOrder : index + 1;
}

export default function HumorFlavorStudio({
  flavors,
  steps,
  images,
  recentCaptions,
  selectedFlavorId,
  notice,
  status,
  apiBaseUrl,
  flavorParamKey,
}: HumorFlavorStudioProps) {
  const selectedFlavor = flavors.find((flavor) => flavor.id === selectedFlavorId) ?? flavors[0] ?? null;
  const selectedSteps = selectedFlavor ? getStepsForFlavor(steps, selectedFlavor.id) : [];
  const selectedCaptions = selectedFlavor ? getCaptionsForFlavor(recentCaptions, selectedFlavor.id) : [];
  const testImages = images.slice(0, 9);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-[color:var(--border)] bg-[linear-gradient(140deg,var(--surface-strong),var(--surface)_42%,transparent)] p-7 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.45)]">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted-foreground)]">Humor Flavor Studio</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Build, reorder, and test prompt chains without leaving the admin surface.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
              This tool is purpose-built for the class pipeline tables: manage humor flavors, edit ordered steps, and run
              caption generation against the `api.almostcrackd.ai` test flow using the logged-in admin session.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Flavors</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{flavors.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Steps</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{steps.length}</p>
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <section
          className={`rounded-[1.4rem] border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[color:var(--success)] bg-[var(--success-soft)] text-[var(--foreground)]"
              : "border-[color:var(--danger)] bg-[var(--danger-soft)] text-[var(--foreground)]"
          }`}
        >
          {notice}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-5">
            {panelTitle("Create", "New humor flavor", "Start a new prompt chain with a name, slug, and optional description.")}
            <form action={createFlavorAction} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Name</span>
                <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="name" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Slug</span>
                <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="slug" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Description</span>
                <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="description" />
              </label>
              <label className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)]">
                <input className="h-4 w-4" defaultChecked name="is_active" type="checkbox" />
                Active flavor
              </label>
              <button className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                Create Flavor
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-5">
            {panelTitle("Browse", "Existing flavors")}
            <div className="mt-4 space-y-3">
              {flavors.map((flavor) => {
                const isSelected = selectedFlavor?.id === flavor.id;

                return (
                  <Link
                    className={`block rounded-[1.3rem] border px-4 py-4 transition ${
                      isSelected
                        ? "border-[color:var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[color:var(--border)] bg-[var(--surface-muted)] hover:border-[color:var(--border-strong)]"
                    }`}
                    href={`/admin/humor-flavors?flavor=${encodeURIComponent(flavor.id)}`}
                    key={flavor.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{flavor.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{flavor.slug ?? "No slug"}</p>
                      </div>
                      <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" style={{ background: flavor.isActive === false ? "var(--danger-soft)" : "var(--success-soft)" }}>
                        {flavor.isActive === false ? "Paused" : "Active"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-[var(--muted-foreground)]">
                      {flavor.description ?? "No description yet."}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          {selectedFlavor ? (
            <>
              <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {panelTitle("Selected Flavor", selectedFlavor.name, "Edit the flavor metadata, then manage the ordered prompt-chain steps below.")}
                  <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    Flavor ID: <span className="font-medium text-[var(--foreground)]">{selectedFlavor.id}</span>
                  </div>
                </div>

                <form action={updateFlavorAction} className="mt-6 grid gap-4 lg:grid-cols-2">
                  <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Name</span>
                    <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={selectedFlavor.name} name="name" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Slug</span>
                    <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={selectedFlavor.slug ?? ""} name="slug" />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Description</span>
                    <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={selectedFlavor.description ?? ""} name="description" />
                  </label>
                  <label className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)]">
                    <input className="h-4 w-4" defaultChecked={selectedFlavor.isActive !== false} name="is_active" type="checkbox" />
                    Active flavor
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                      Save Flavor
                    </button>
                  </div>
                </form>

                <form action={deleteFlavorAction} className="mt-4">
                  <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                  <button className="rounded-full border border-[color:var(--danger)] bg-[var(--danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]" type="submit">
                    Delete Flavor and Steps
                  </button>
                </form>
              </section>

              <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
                {panelTitle("Step Builder", "Ordered humor flavor steps", "Create and edit the prompt chain in the exact sequence the flavor should run.")}

                <form action={createStepAction} className="mt-6 grid gap-4 lg:grid-cols-2">
                  <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step name</span>
                    <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="step_name" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step order</span>
                    <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={selectedSteps.length + 1} name="step_order" type="number" />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Description</span>
                    <textarea className="min-h-24 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="step_description" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">System prompt</span>
                    <textarea className="min-h-36 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="system_prompt" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">User prompt</span>
                    <textarea className="min-h-36 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="user_prompt" />
                  </label>
                  <label className="block lg:max-w-xs">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Temperature</span>
                    <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue="0.8" name="temperature" type="number" step="0.1" />
                  </label>
                  <div className="flex items-end">
                    <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                      Add Step
                    </button>
                  </div>
                </form>

                <div className="mt-6 space-y-4">
                  {selectedSteps.length > 0 ? (
                    selectedSteps.map((step, index) => (
                      <article className="rounded-[1.6rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-5" key={step.id}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step {stepOrderLabel(step, index)}</p>
                            <h4 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{step.title}</h4>
                            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{step.description ?? "No description."}</p>
                          </div>
                          <div className="flex gap-2">
                            <form action={reorderStepAction}>
                              <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                              <input name="step_id" type="hidden" value={step.id} />
                              <input name="direction" type="hidden" value="up" />
                              <button className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" type="submit">
                                Move Up
                              </button>
                            </form>
                            <form action={reorderStepAction}>
                              <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                              <input name="step_id" type="hidden" value={step.id} />
                              <input name="direction" type="hidden" value="down" />
                              <button className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" type="submit">
                                Move Down
                              </button>
                            </form>
                          </div>
                        </div>

                        <form action={updateStepAction} className="mt-5 grid gap-4 lg:grid-cols-2">
                          <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                          <input name="step_id" type="hidden" value={step.id} />
                          <label className="block">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step name</span>
                            <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.title} name="step_name" required />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Step order</span>
                            <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={stepOrderLabel(step, index)} name="step_order" type="number" />
                          </label>
                          <label className="block lg:col-span-2">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Description</span>
                            <textarea className="min-h-24 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.description ?? ""} name="step_description" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">System prompt</span>
                            <textarea className="min-h-36 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.systemPrompt ?? ""} name="system_prompt" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">User prompt</span>
                            <textarea className="min-h-36 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.userPrompt ?? ""} name="user_prompt" />
                          </label>
                          <label className="block lg:max-w-xs">
                            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Temperature</span>
                            <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.temperature ?? ""} name="temperature" step="0.1" type="number" />
                          </label>
                          <div className="flex flex-wrap items-end gap-3">
                            <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                              Save Step
                            </button>
                          </div>
                        </form>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <form action={deleteStepAction}>
                            <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                            <input name="step_id" type="hidden" value={step.id} />
                            <button className="rounded-full border border-[color:var(--danger)] bg-[var(--danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]" type="submit">
                              Delete Step
                            </button>
                          </form>
                        </div>

                        <div className="mt-4 rounded-[1rem] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                          {stepPreview(step)}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                      This flavor does not have any steps yet.
                    </div>
                  )}
                </div>

                <form action={normalizeStepOrderAction} className="mt-4">
                  <input name="flavor_id" type="hidden" value={selectedFlavor.id} />
                  <button className="rounded-full border border-[color:var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]" type="submit">
                    Normalize Step Order
                  </button>
                </form>
              </section>

              <HumorFlavorTestConsole
                apiBaseUrl={apiBaseUrl}
                flavorId={selectedFlavor.id}
                flavorName={selectedFlavor.name}
                flavorParamKey={flavorParamKey}
                images={testImages}
              />

              <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
                {panelTitle("Recent Captions", `Latest outputs for ${selectedFlavor.name}`, "Reads the most recent captions we can associate back to this flavor from the existing caption tables.")}
                <div className="mt-5 space-y-3">
                  {selectedCaptions.length > 0 ? (
                    selectedCaptions.map((caption) => (
                      <article className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4" key={caption.id}>
                        <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                          <div>
                            {caption.imageUrl ? (
                              <img alt={`Caption ${caption.id}`} className="h-32 w-full rounded-[1rem] object-cover" src={caption.imageUrl} />
                            ) : (
                              <div className="flex h-32 items-center justify-center rounded-[1rem] bg-[var(--surface-strong)] text-sm text-[var(--muted-foreground)]">
                                No image preview
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                              Caption {caption.id} {caption.createdAt ? `• ${formatDateTime(caption.createdAt)}` : ""}
                            </p>
                            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                              {caption.text ?? "Caption text unavailable."}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                      No recent captions could be tied back to this flavor from the currently readable tables.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
              {panelTitle("No Flavors", "Create the first humor flavor", "The schema is available and the app is ready, but there are no humor flavors to edit yet.")}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
