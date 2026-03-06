import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/65">Users</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Supabase Auth users</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Read-only view of registered auth users from the Supabase admin API. Use this to cross-check profiles versus authentication state.
        </p>
      </section>

      <section className="space-y-4">
        {users.map((user) => (
          <article className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5" key={user.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">{user.email ?? "No email"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.18em] text-slate-300">
                    ID {user.id}
                  </span>
                  <span>Created {user.created_at ? new Date(user.created_at).toLocaleString("en-US") : "Unknown"}</span>
                  <span>Last sign in {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("en-US") : "Never"}</span>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                Providers: {user.app_metadata?.providers?.join(", ") ?? "Unknown"}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
