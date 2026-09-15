import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. Only ever import
 * this from Server Actions/Route Handlers, never from client components,
 * and never without an explicit caller-is-admin check first (see
 * requireAdmin() in the users actions file) since RLS won't protect you
 * once you're using this client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Next.js's App Router patches the global fetch to cache requests by
      // URL by default — even for non-GET calls in some cases — which was
      // observed to make a ban-then-unban pair of PUT requests to the same
      // /auth/v1/admin/users/{id} URL resolve inconsistently (the second
      // call failing with a stale "user not found"). Force every Admin API
      // call to bypass that cache entirely.
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    },
  );
}
