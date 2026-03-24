import Link from "next/link";
import { formatDateTime } from "@/lib/admin/data";
import { getCaptionsForFlavor, getStepsForFlavor, loadHumorFlavorManagerData } from "@/lib/humor-flavors";

export default async function AdminDashboardPage() {
  const { flavors, steps, images, recentCaptions } = await loadHumorFlavorManagerData();
  const activeFlavors = flavors.filter((flavor) => flavor.isActive !== false);
  const commonUseImages = images.filter((image) => image.isCommonUse === true);
  const latestFlavor = flavors[0] ?? null;
  const latestFlavorSteps = latestFlavor ? getStepsForFlavor(steps, latestFlavor.id) : [];
  const latestFlavorCaptions = latestFlavor ? getCaptionsForFlavor(recentCaptions, latestFlavor.id).slice(0, 3) : [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-[color:var(--border)] bg-[linear-gradient(140deg,var(--surface-strong),var(--surface)_42%,transparent)] p-7 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.45)]">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted-foreground)]">Overview</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Prompt-chain admin for humor flavors only.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
              This app is scoped to the assignment: humor flavor CRUD, step CRUD, ordered step editing, caption reads,
              and image-set testing against the REST API. Access is limited to users whose profile is marked as
              superadmin or matrix admin.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Humor Flavors</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{flavors.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Flavor Steps</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{steps.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Active Flavors</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{activeFlavors.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Test Images</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{commonUseImages.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">Primary Actions</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Manage the pipeline</h3>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
              href="/admin/humor-flavors"
            >
              Open Humor Flavors
            </Link>
            <Link
              className="rounded-full border border-[color:var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              href="/admin/humor-flavor-steps"
            >
              Open Flavor Steps
            </Link>
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
            Use <strong className="text-[var(--foreground)]">Humor Flavors</strong> for flavor-level editing and API
            testing. Use <strong className="text-[var(--foreground)]">Flavor Steps</strong> for fast inline step edits
            across all flavors.
          </div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">Current Snapshot</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Latest chain in focus</h3>
          {latestFlavor ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-lg font-semibold text-[var(--foreground)]">{latestFlavor.name}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {latestFlavor.description ?? "No description saved."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Steps</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{latestFlavorSteps.length}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Recent Captions</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{latestFlavorCaptions.length}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Status</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {latestFlavor.isActive === false ? "Paused" : "Active"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
              No humor flavors exist yet.
            </div>
          )}
        </section>
      </section>

      {latestFlavor ? (
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">Recent Captions</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Latest outputs for {latestFlavor.name}
          </h3>
          <div className="mt-5 space-y-3">
            {latestFlavorCaptions.length > 0 ? (
              latestFlavorCaptions.map((caption) => (
                <article
                  className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4"
                  key={caption.id}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    {caption.createdAt ? formatDateTime(caption.createdAt) : "Unknown time"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                    {caption.text ?? "Caption text unavailable."}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                No recent captions are currently tied to this flavor.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
