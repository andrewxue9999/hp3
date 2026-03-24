import Link from "next/link";
import GoogleAuthButton from "@/components/google-auth-button";
import ThemeToggle from "@/components/theme-toggle";
import { getUserSafely } from "@/lib/supabase/server";
import { supabaseConfigError } from "@/lib/supabase/env";
import { isAdminConfigured, supabaseAdminConfigError } from "@/lib/supabase/admin";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const denied = resolvedParams.denied === "admin";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--page-glow-a),transparent_25%),radial-gradient(circle_at_80%_10%,var(--page-glow-b),transparent_18%),linear-gradient(180deg,var(--background)_0%,color-mix(in_srgb,var(--background)_84%,#0f172a)_60%,var(--background)_100%)] px-4 py-8 text-[var(--foreground)]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.4rem] border border-[color:var(--border)] bg-[var(--surface)] p-8 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted-foreground)]">Humor Project</p>
            <ThemeToggle />
          </div>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight text-[var(--foreground)]">
            Humor flavor studio for prompt-chain admins.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            Google OAuth gets you in. `profiles.is_superadmin = true` or `profiles.is_matrix_admin = true` unlocks
            the protected admin area. Inside, the app focuses on humor flavor CRUD, prompt-chain steps, reordering,
            recent caption reads, and image-set testing against the class REST API.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {adminConfigured ? (
              <Link
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
                href="/admin"
              >
                Open Flavor Studio
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-full border border-[color:var(--border)] bg-[var(--danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] opacity-90">
                Admin Unavailable: Add Service Key
              </span>
            )}
            <Link
              className="rounded-full border border-[color:var(--border)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
              href="/term-types"
            >
              Legacy Caption Route
            </Link>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-[color:var(--border)] bg-[var(--surface)] p-8 backdrop-blur-xl">
          <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Access</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Admin sign-in</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Every admin route is protected by Supabase Google OAuth and a server-side check against the `profiles`
              table for either superadmin or matrix-admin access.
            </p>

            {error ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                {error}
              </p>
            ) : null}
            {needsSignin ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                Sign in with Google to access the admin area.
              </p>
            ) : null}
            {denied ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                Your account is authenticated but not marked as a superadmin or matrix admin in `profiles`.
              </p>
            ) : null}
            {!adminConfigured || adminConfigMissing ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                {supabaseAdminConfigError}
              </p>
            ) : null}
            {!adminConfigured || adminConfigMissing ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
                <p className="font-medium text-[var(--foreground)]">What is missing</p>
                <p className="mt-2">
                  Add `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` to your local `.env.local` and to
                  Vercel environment variables. The admin area cannot verify admin roles or perform humor flavor CRUD
                  without one of those server-only keys.
                </p>
              </div>
            ) : null}

            <div className="mt-6">
              {userEmail ? (
                <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--success-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Current session</p>
                  <p className="mt-2 text-lg font-medium text-[var(--foreground)]">{userEmail}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    If this profile is marked as a superadmin or matrix admin, opening `/admin` will pass the authorization gate.
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
