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

/**
 * Returns the doctor ID associated with the currently logged-in user,
 * or null if the user is not a doctor or has no doctor profile.
 */
export async function getCurrentDoctorId(): Promise<string | null> {
  const { user, role } = await getCurrentUserRole();
  if (!user || !role || role.toLowerCase() !== 'doctor') return null;

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from("User")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!userData) return null;

  const { data: doctor } = await supabase
    .from("Doctor")
    .select("id")
    .eq("userId", userData.id)
    .maybeSingle();

  return doctor ? doctor.id : null;
}

