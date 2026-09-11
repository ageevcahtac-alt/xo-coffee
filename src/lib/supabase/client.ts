"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — anon/publishable key only, never a service-role
 * key (that must never reach the browser bundle). Access is entirely
 * governed by the RLS policies in
 * supabase/migrations/20260911120000_coffee_passport_foundation.sql.
 *
 * Not imported by any existing route or component yet — this is foundation
 * scaffolding for the next implementation stage (see
 * P14_COFFEE_PASSPORT_ARCHITECTURE_FOUNDATION.md), and there is no live
 * Supabase project configured to connect it to. Calling this before
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set throws
 * clearly rather than silently constructing a broken client, matching this
 * codebase's existing "fail loud in dev, never fail silently" style.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "See .env.example and P14_COFFEE_PASSPORT_ARCHITECTURE_FOUNDATION.md.",
    );
  }

  return createBrowserClient(url, anonKey);
}
