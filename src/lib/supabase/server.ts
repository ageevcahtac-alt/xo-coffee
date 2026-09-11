import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components / Route Handlers —
 * still the anon/publishable key, never a service-role key. A signed-in
 * user's identity flows through their session cookie, and RLS (see
 * supabase/migrations/20260911120000_coffee_passport_foundation.sql)
 * enforces what they can read or write from there; this file has no
 * elevated access of its own.
 *
 * No server code needs a service-role key in this foundation phase — every
 * policy in the migration is expressed in terms of `auth.uid()` and
 * organization membership, not a trusted-backend bypass. If a future stage
 * genuinely needs one (e.g. a background job with no user session), it must
 * only ever be read via `process.env` inside a server-only module like this
 * one, never `NEXT_PUBLIC_*`, and never imported from a "use client" file —
 * matching how `src/lib/telegram.ts` already isolates the one secret this
 * project has today.
 *
 * Not imported by any existing route yet — see client.ts for the same
 * "foundation, not wired up, no live project" note.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "See .env.example and P14_COFFEE_PASSPORT_ARCHITECTURE_FOUNDATION.md.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In a Server Component this throws (cookies are read-only there);
        // callers that need to set cookies (e.g. an auth callback Route
        // Handler) run in a context where it's allowed. Swallow elsewhere,
        // same tolerance the official Supabase Next.js App Router recipe
        // uses, rather than crashing a page that only needs to read.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // no-op — see comment above.
        }
      },
    },
  });
}
