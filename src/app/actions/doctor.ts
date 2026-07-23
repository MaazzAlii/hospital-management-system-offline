"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDoctor(data: {
  name: string;
  email: string;
  specialization: string;
  qualifications: string; // comma-separated
  fee: number;
  isActive?: boolean;
}) {
  try {
    const supabase = await createClient();

    // Find "Doctor" role
    let { data: role } = await supabase.from("Role").select("id").eq("name", "Doctor").maybeSingle();
    if (!role) {
      const { data: newRole, error: roleError } = await supabase.from("Role").insert({ name: "Doctor" }).select().single();
      if (roleError) throw new Error(roleError.message);
      role = newRole;
    }

    // Create User
    const { data: user, error: userError } = await supabase.from("User").insert({
      name: data.name,
      email: data.email,
      roleId: role!.id,
      isActive: data.isActive ?? true,
    }).select().single();

    if (userError) throw new Error(userError.message);

    // Create Doctor
    const { data: doctor, error: doctorError } = await supabase.from("Doctor").insert({
      userId: user.id,
      specialization: data.specialization,
      qualifications: data.qualifications,
      fee: data.fee,
      isActive: data.isActive ?? true,
    }).select().single();

    if (doctorError) throw new Error(doctorError.message);

    revalidatePath("/doctors");
    return { success: true, doctor };
  } catch (error: unknown) {
    console.error("Failed to create doctor:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to create doctor" };
  }
}

export async function toggleDoctorStatus(id: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    const { data: doctor, error } = await supabase.from("Doctor").update({ isActive }).eq("id", id).select().single();
    if (error) throw new Error(error.message);

    revalidatePath("/doctors");
    return { success: true, doctor };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to update doctor" };
  }
}

export async function getDoctorsWithUsers(query?: string) {
  const supabase = await createClient();
  const { data: rawDoctors } = await supabase
    .from("Doctor")
    .select(`id, specialization, fee, isActive, qualifications, userId`)
    .order("createdAt", { ascending: false });

  // Fetch users separately to avoid RLS join issues
  const userIds = (rawDoctors || []).map((d: any) => d.userId).filter(Boolean);
  let usersMap: Record<string, { name: string; email: string; isActive: boolean }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("User")
      .select("id, name, email, isActive")
      .in("id", userIds);
    if (users) {
      usersMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
    }
  }

  let doctors = (rawDoctors || []).map((d: any) => ({
    ...d,
    user: usersMap[d.userId] || { name: "Unknown", email: "", isActive: false },
  }));

  if (query) {
    const q = query.toLowerCase();
    doctors = doctors.filter(
      (d) =>
        (d.user?.name || "").toLowerCase().includes(q) ||
        (d.specialization || "").toLowerCase().includes(q) ||
        (d.user?.email || "").toLowerCase().includes(q)
    );
  }

  return doctors;
}
