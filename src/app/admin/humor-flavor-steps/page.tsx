import Link from "next/link";
import {
  createStepAction,
  deleteStepAction,
  normalizeStepOrderAction,
  reorderStepAction,
  updateStepAction,
} from "@/app/admin/humor-flavors/actions";
import { loadHumorFlavorManagerData, getStepsForFlavor } from "@/lib/humor-flavors";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function stepOrderLabel(order: number, index: number) {
  return Number.isFinite(order) && order !== Number.MAX_SAFE_INTEGER ? order : index + 1;
}

export default async function AdminHumorFlavorStepsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const notice = typeof resolvedParams.message === "string" ? resolvedParams.message : null;
  const status =
    resolvedParams.status === "success" || resolvedParams.status === "error" ? resolvedParams.status : null;
  const selectedFlavorId = typeof resolvedParams.flavor === "string" ? resolvedParams.flavor : null;
  const { flavors, steps } = await loadHumorFlavorManagerData();
  const selectedFlavor = flavors.find((flavor) => flavor.id === selectedFlavorId) ?? flavors[0] ?? null;
  const visibleFlavors = selectedFlavor ? [selectedFlavor] : flavors;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-[color:var(--border)] bg-[linear-gradient(140deg,var(--surface-strong),var(--surface)_42%,transparent)] p-7 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted-foreground)]">Flavor Steps</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Inspect every prompt-chain step in one place.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
              This route is a step index. Use it to scan all chains quickly, then jump into a specific humor flavor to
              edit, reorder, or test that pipeline.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Total Flavors</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{flavors.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Total Steps</p>
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

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">Flavor Filter</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Select one flavor at a time</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              The `Flavor Steps` tab now keeps the selected flavor in the URL so you can move between tabs without losing context.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className={`rounded-full px-5 py-3 text-sm font-semibold ${
                selectedFlavorId
                  ? "border border-[color:var(--border-strong)] text-[var(--foreground)]"
                  : "bg-[var(--accent)] text-[var(--accent-foreground)]"
              }`}
              href="/admin/humor-flavor-steps"
            >
              Show All
            </Link>
            {flavors.map((flavor) => {
              const active = selectedFlavor?.id === flavor.id;
              return (
                <Link
                  className={`rounded-full px-5 py-3 text-sm font-semibold ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border border-[color:var(--border-strong)] text-[var(--foreground)]"
                  }`}
                  href={`/admin/humor-flavor-steps?flavor=${encodeURIComponent(flavor.id)}`}
                  key={flavor.id}
                >
                  {flavor.slug ?? flavor.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-4 rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
          Pick a flavor here, edit its steps inline, then use `Open In Editor` if you want to run the image test set or review recent captions for that same flavor.
        </div>
      </section>

      <section className="space-y-6">
        {visibleFlavors.map((flavor) => {
          const flavorSteps = getStepsForFlavor(steps, flavor.id);

          return (
            <article className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6" key={flavor.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    {flavor.slug ?? "No slug"}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{flavor.label}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                    {flavor.description ?? "No flavor description saved."}
                  </p>
                </div>

                <Link
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
                  href={`/admin/humor-flavors?flavor=${encodeURIComponent(flavor.id)}`}
                >
                  Open In Editor
                </Link>
              </div>

              <form action={createStepAction} className="mt-5 grid gap-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4 lg:grid-cols-2">
                <input name="flavor_id" type="hidden" value={flavor.id} />
                <div className="lg:col-span-2 rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
                  Add the next step in the chain here. `order_by` controls execution order. Lower numbers run earlier.
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">description</span>
                  <textarea className="min-h-24 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="step_description" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">order_by</span>
                  <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={flavorSteps.length + 1} name="step_order" type="number" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_system_prompt</span>
                  <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="system_prompt" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_user_prompt</span>
                  <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" name="user_prompt" />
                </label>
                <label className="block lg:max-w-xs">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_temperature</span>
                  <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue="0.8" name="temperature" step="0.1" type="number" />
                </label>
                <div className="flex items-end">
                  <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                    Add Step
                  </button>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {flavorSteps.length > 0 ? (
                  flavorSteps.map((step, index) => (
                    <div
                      className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4"
                      key={step.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                            Step {stepOrderLabel(step.stepOrder, index)}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{step.title}</p>
                          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                            {step.description ?? "No step description saved."}
                          </p>
                        </div>
                        {step.temperature !== null ? (
                          <div className="rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                            Temp {step.temperature}
                          </div>
                        ) : null}
                      </div>

                      <form action={updateStepAction} className="mt-4 grid gap-4 lg:grid-cols-2">
                        <input name="flavor_id" type="hidden" value={flavor.id} />
                        <input name="step_id" type="hidden" value={step.id} />
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">description</span>
                          <textarea className="min-h-24 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.description ?? ""} name="step_description" required />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">order_by</span>
                          <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={stepOrderLabel(step.stepOrder, index)} name="step_order" type="number" />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_system_prompt</span>
                          <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.systemPrompt ?? ""} name="system_prompt" />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_user_prompt</span>
                          <textarea className="min-h-28 w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.userPrompt ?? ""} name="user_prompt" />
                        </label>
                        <label className="block lg:max-w-xs">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">llm_temperature</span>
                          <input className="w-full rounded-[1rem] border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none" defaultValue={step.temperature ?? ""} name="temperature" step="0.1" type="number" />
                        </label>
                        <div className="flex items-end">
                          <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]" type="submit">
                            Save Step
                          </button>
                        </div>
                      </form>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <form action={reorderStepAction}>
                          <input name="flavor_id" type="hidden" value={flavor.id} />
                          <input name="step_id" type="hidden" value={step.id} />
                          <input name="direction" type="hidden" value="up" />
                          <button className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" type="submit">
                            Move Up
                          </button>
                        </form>
                        <form action={reorderStepAction}>
                          <input name="flavor_id" type="hidden" value={flavor.id} />
                          <input name="step_id" type="hidden" value={step.id} />
                          <input name="direction" type="hidden" value="down" />
                          <button className="rounded-full border border-[color:var(--border-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" type="submit">
                            Move Down
                          </button>
                        </form>
                        <form action={deleteStepAction}>
                          <input name="flavor_id" type="hidden" value={flavor.id} />
                          <input name="step_id" type="hidden" value={step.id} />
                          <button className="rounded-full border border-[color:var(--danger)] bg-[var(--danger-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]" type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                    This flavor does not have any steps yet.
                  </div>
                )}
              </div>

              {flavorSteps.length > 1 ? (
                <form action={normalizeStepOrderAction} className="mt-4">
                  <input name="flavor_id" type="hidden" value={flavor.id} />
                  <button className="rounded-full border border-[color:var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]" type="submit">
                    Normalize Step Order
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
