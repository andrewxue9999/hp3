# Humor Flavor Studio

Vercel-compatible Next.js admin app for managing humor flavors and humor flavor steps on the class Supabase database.

## What This App Does

- Google OAuth sign-in with Supabase
- Admin-only access when `profiles.is_superadmin = true` or `profiles.is_matrix_admin = true`
- Create, update, and delete humor flavors
- Create, update, delete, and reorder humor flavor steps
- Read recent captions associated with a selected humor flavor
- Test a humor flavor against an image test set using `https://api.almostcrackd.ai/pipeline/generate-captions`
- Light mode, dark mode, and system theme support

## Environment Variables

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

You can use `SUPABASE_SECRET_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY` if your project uses the newer server key format.

Optional:

```bash
NEXT_PUBLIC_ALMOSTCRACKD_API_URL=https://api.almostcrackd.ai
NEXT_PUBLIC_HUMOR_FLAVOR_PARAM_KEY=humorFlavorId
```

`NEXT_PUBLIC_HUMOR_FLAVOR_PARAM_KEY` controls which request key the flavor test console sends to the REST API when calling `/pipeline/generate-captions`.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

Current lint output is clean except for existing `@next/next/no-img-element` warnings on image-heavy views.

## Vercel Notes

- Build command: `npm run build`
- Framework preset: Next.js
- Deployment protection must be turned off so graders can access the site
- Add the same environment variables in Vercel Project Settings
- Google OAuth callback path must be `/auth/callback`

## Repo / Deployment Setup

This codebase is ready to push to a new GitHub repository and attach to a new Vercel project. Creating the remote GitHub repo and Vercel project still needs to be done from your own accounts.
