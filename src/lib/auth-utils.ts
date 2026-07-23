import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserRole(): Promise<{ user: any; role: string | null; roleData: any | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null, roleData: null };
  }

  // Fetch the User record and its associated Role
  const { data: userData } = await supabase
    .from("User")
    .select("*, Role(*)")
    .eq("email", user.email)
    .single();

  if (!userData || !userData.Role) {
    return { user, role: null, roleData: null };
  }

  return { user, role: userData.Role.name, roleData: userData.Role };
}

export { hasAccess } from './permissions';
