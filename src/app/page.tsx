import Link from "next/link";
import GoogleAuthButton from "@/components/google-auth-button";
import { getUserSafely } from "@/lib/supabase/server";
import { supabaseConfigError } from "@/lib/supabase/env";
import { isAdminConfigured, supabaseAdminConfigError } from "@/lib/supabase/admin";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const denied = resolvedParams.denied === "superadmin";
  const needsSignin = resolvedParams.signin === "required";
  const adminConfigMissing = resolvedParams.admin === "config";

  let userEmail: string | null = null;
  let error: string | null = null;
  const adminConfigured = isAdminConfigured();

  try {
    const user = await getUserSafely();
    userEmail = user?.email ?? null;
  } catch {
    error = supabaseConfigError;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_25%),radial-gradient(circle_at_80%_10%,_rgba(251,191,36,0.18),_transparent_18%),linear-gradient(180deg,_#050b16_0%,_#0f172a_60%,_#111827_100%)] px-4 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.4rem] border border-white/10 bg-white/6 p-8 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/75">Humor Project</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight text-white">
            Meme database admin for people who actually need signal.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
            Google OAuth gets you in. `profiles.is_superadmin = true` keeps everyone else out. Inside, the app
            surfaces vote health, contributor behavior, and direct image management on top of the existing Supabase
            meme schema.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {adminConfigured ? (
              <Link
                className="rounded-full border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
                href="/admin"
              >
                Open Admin
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-100 opacity-90">
                Admin Unavailable: Add Service Key
              </span>
            )}
            <Link
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              href="/term-types"
            >
              Legacy Caption Route
            </Link>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-white/10 bg-slate-950/45 p-8 backdrop-blur-xl">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/75">Access</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Admin sign-in</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Every admin route is protected by Supabase Google OAuth and a server-side superadmin check against the
              `profiles` table.
            </p>

            {error ? (
              <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
            {needsSignin ? (
              <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Sign in with Google to access the admin area.
              </p>
            ) : null}
            {denied ? (
              <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                Your account is authenticated but not marked as a superadmin in `profiles`.
              </p>
            ) : null}
            {!adminConfigured || adminConfigMissing ? (
              <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                {supabaseAdminConfigError}
              </p>
            ) : null}
            {!adminConfigured || adminConfigMissing ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm text-slate-300">
                <p className="font-medium text-white">What is missing</p>
                <p className="mt-2">
                  Add `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` to your local `.env.local` and to
                  Vercel environment variables. The admin area cannot verify `profiles.is_superadmin` or perform
                  CRUD without one of those server-only keys.
                </p>
              </div>
            ) : null}

            <div className="mt-6">
              {userEmail ? (
                <div className="rounded-[1.4rem] border border-emerald-300/25 bg-emerald-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/75">Current session</p>
                  <p className="mt-2 text-lg font-medium text-white">{userEmail}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    If this profile is a superadmin, opening `/admin` will pass the authorization gate.
                  </p>
                </div>
              ) : (
                <GoogleAuthButton />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
