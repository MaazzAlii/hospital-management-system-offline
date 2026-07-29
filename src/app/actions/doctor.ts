"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { randomBytes } from "crypto";

export async function createDoctor(data: {
  name: string;
  email: string;
  specialization: string;
  qualifications: string; // comma-separated
  fee: number;
  isActive?: boolean;
}) {
  let authUserId: string | null = null;
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'doctors', 'write')) {
      throw new Error("Unauthorized");
    }

    if (!data.email) {
      throw new Error("Email is required");
    }

    // 1. Generate temporary password
    const tempPassword = randomBytes(5).toString("hex") + Math.floor(Math.random() * 1000).toString().padStart(3, "0");

    // 2. Create Auth user via Supabase Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("Auth user creation failed:", authError);
      throw new Error(`Failed to create authentication user: ${authError?.message || "Unknown error"}`);
    }

    authUserId = authData.user.id;

    const supabase = await createClient();

    // Find "Doctor" role
    let { data: roleData } = await supabase.from("Role").select("id").eq("name", "Doctor").maybeSingle();
    if (!roleData) {
      const { data: newRole, error: roleError } = await supabase.from("Role").insert({ name: "Doctor" }).select().single();
      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(roleError.message);
      }
      roleData = newRole;
    }

    // 3. Insert User record using authUserId
    const { data: user, error: userError } = await supabase.from("User").insert({
      id: authUserId,
      name: data.name,
      email: data.email,
      roleId: roleData!.id,
      isActive: data.isActive ?? true,
    }).select().single();

    if (userError) {
      // Rollback: delete Auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      console.error("User insert failed:", userError);
      throw new Error(`Failed to create user record: ${userError.message}`);
    }

    // 4. Create Doctor record
    const { data: doctor, error: doctorError } = await supabase.from("Doctor").insert({
      userId: authUserId,
      specialization: data.specialization,
      qualifications: data.qualifications,
      fee: data.fee,
      isActive: data.isActive ?? true,
    }).select().single();

    if (doctorError) {
      // Rollback: delete User record and Auth user
      await supabase.from("User").delete().eq("id", authUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      console.error("Doctor insert failed:", doctorError);
      throw new Error(`Failed to create doctor record: ${doctorError.message}`);
    }

    // Optionally trigger password reset / welcome email
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
      });
    } catch (e) {
      console.warn("Notice: Failed to send password reset email automatically:", e);
    }

    revalidatePath("/doctors");
    return { success: true, doctor, tempPassword };
  } catch (error: unknown) {
    console.error("Failed to create doctor:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to create doctor" };
  }
}

export async function toggleDoctorStatus(id: string, isActive: boolean) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'doctors', 'write')) {
      throw new Error("Unauthorized");
    }

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
