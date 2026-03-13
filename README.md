# HP2 Meme Admin

Protected admin dashboard and moderation surface for the existing Supabase meme database.

## What Changed

The app now includes a new `/admin` area with:

- Google OAuth login through Supabase Auth
- server-side authorization against `profiles.is_superadmin`
- statistics dashboard for votes, ratios, contributor performance, and recent activity
- image CRUD
- read-only management views for captions, profiles, and Supabase auth users

No RLS policies are modified by this codebase. Admin-only reads and mutations use the Supabase service role key on the server only.

## Environment Variables

Create `.env.local` from `.env.example` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
# or use Supabase's newer server key format instead:
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
```

For Vercel, set the public variables plus one server admin key in Project Settings -> Environment Variables for Production and Preview.

## Auth Flow

- Google sign-in starts from the public home page.
- Supabase redirects back to `/auth/callback`.
- The callback exchanges the code for a session and redirects to `/admin`.
- Every route under `/admin` checks:
  1. the user is authenticated
  2. the matching `profiles` row has `is_superadmin = true`

Users who fail the second check are denied and sent back to `/`.

## Bootstrap Superadmin

The admin area requires:

- one server admin key: `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- at least one profile with `is_superadmin = true`

Use Supabase SQL Editor or any existing server-side admin access and run:

```sql
update public.profiles
set is_superadmin = true
where id in (
  'YOUR-USER-UUID-HERE'
);
```

If you prefer identifying the profile by email first, look up the profile or auth user in Supabase Studio, copy the UUID, then run the update above.

Important:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Do not change RLS policies for this bootstrap.
- This must be done once before first admin login.

## Google OAuth Setup

This app uses Supabase Auth with Google OAuth. The callback path is exactly:

- Local: `http://localhost:3000/auth/callback`
- Vercel: `https://<your-deployment-domain>/auth/callback`

The code always initiates sign-in with `/auth/callback` and performs the final redirect to `/admin` server-side.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Notes

- Build command: `npm run build`
- Output:
  - Vercel uses the standard Next.js `.next` output directory
  - local development in this OneDrive-backed workspace uses `.next-webpack` to avoid locked-cache issues
- No secrets are hardcoded in the repo
- The service role key is only read in server-only modules
- Required Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - one of `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
