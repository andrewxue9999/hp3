import type { ReactNode } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin-nav";
import SignOutButton from "@/components/sign-out-button";
import { requireSuperadmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireSuperadmin();
  const profileName =
    typeof profile.display_name === "string" && profile.display_name.trim().length > 0
      ? profile.display_name
      : typeof profile.username === "string" && profile.username.trim().length > 0
        ? profile.username
        : user.email ?? "Superadmin";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.18),_transparent_20%),linear-gradient(180deg,_#07111f_0%,_#0f172a_55%,_#111827_100%)] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-cyan-300/20 bg-slate-950/45 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Meme HQ</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Admin Orbit</h1>
            <p className="mt-3 text-sm text-slate-300">
              Google-authenticated control room for meme inventory, captions, and moderation context.
            </p>
          </div>

          <AdminNav />

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/75">Signed In</p>
            <p className="mt-2 text-lg font-medium text-white">{profileName}</p>
            <p className="mt-1 text-sm text-slate-300">{user.email}</p>
            <div className="mt-4 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Superadmin
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
              href="/"
            >
              Public Home
            </Link>
            <SignOutButton />
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-4 backdrop-blur-xl lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
