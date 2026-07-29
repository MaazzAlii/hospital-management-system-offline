/**
 * SECURITY ARCHITECTURE NOTICE:
 * All data access and mutation authorization is primarily enforced via Next.js Server Actions
 * in `src/app/actions/*` using role-based access control (RBAC) and row-level filtering.
 *
 * Supabase Row Level Security (RLS) policies defined in `supabase-rls.sql` serve as a
 * secondary DB-level barrier (defense-in-depth) for direct client requests.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

