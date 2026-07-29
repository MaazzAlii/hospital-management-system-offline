import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client initialized with SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for administrative authentication operations (e.g. createUser, deleteUser)
 * in server environments.
 *
 * Throws a startup error immediately if SUPABASE_SERVICE_ROLE_KEY is not set,
 * rather than silently falling back to the anon key (which lacks admin privileges).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL is not set. Check your environment variables."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is not set. " +
    "Admin operations (createUser, deleteUser) require the service role key. " +
    "Do NOT fall back to the anon key — it lacks admin privileges."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

