import type { ReactNode } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin-nav";
import SignOutButton from "@/components/sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import { requireAdminAccess } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, roles } = await requireAdminAccess();
  const profileName =
    typeof profile.display_name === "string" && profile.display_name.trim().length > 0
      ? profile.display_name
      : typeof profile.username === "string" && profile.username.trim().length > 0
        ? profile.username
        : user.email ?? "Superadmin";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--page-glow-a),transparent_28%),radial-gradient(circle_at_85%_15%,var(--page-glow-b),transparent_20%),linear-gradient(180deg,var(--background)_0%,color-mix(in_srgb,var(--background)_82%,#0f172a)_55%,var(--background)_100%)] text-[var(--foreground)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6 backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted-foreground)]">Humor Project</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Flavor Studio</h1>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Google-authenticated control room for humor flavors, prompt steps, and caption testing.
            </p>
          </div>

          <div className="mt-6">
            <ThemeToggle />
          </div>

          <AdminNav />

          <div className="mt-8 rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Signed In</p>
            <p className="mt-2 text-lg font-medium text-[var(--foreground)]">{profileName}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.isSuperadmin ? (
                <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--success-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--foreground)]">
                  Superadmin
                </div>
              ) : null}
              {roles.isMatrixAdmin ? (
                <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--foreground)]">
                  Matrix Admin
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
              href="/"
            >
              Public Home
            </Link>
            <SignOutButton />
          </div>
        </aside>

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-4 backdrop-blur-xl lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
