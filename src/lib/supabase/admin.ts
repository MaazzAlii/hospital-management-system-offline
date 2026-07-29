import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client initialized with SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for administrative authentication operations (e.g. createUser, deleteUser)
 * in server environments.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
