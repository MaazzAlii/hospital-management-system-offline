"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { randomBytes } from "crypto";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function createDoctor(data: {
  name: string;
  email: string;
  specialization: string;
  qualifications: string; // comma-separated
  fee: number;
  isActive?: boolean;
}) {
  let createdUserId: string | null = null;
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'doctors', 'write')) {
      throw new Error("Unauthorized");
    }

    if (!data.email) {
      throw new Error("Email is required");
    }

    // 1. Generate temporary password and bcrypt hash
    const tempPassword = randomBytes(5).toString("hex") + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const passwordHash = await hash(tempPassword, 10);

    // 2. Find or create "Doctor" role via Prisma
    let roleData = await prisma.role.findUnique({ where: { name: "Doctor" } });
    if (!roleData) {
      roleData = await prisma.role.create({ data: { name: "Doctor", description: "Doctor Role" } });
    }

    // 3. Insert User record via Prisma
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        passwordHash,
        roleId: roleData.id,
      },
    });

    createdUserId = user.id;

    // 4. Create Doctor record via Prisma
    let doctor;
    try {
      doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          specialization: data.specialization,
          qualification: data.qualifications,
          fee: data.fee,
          status: data.isActive === false ? "inactive" : "active",
        },
      });
    } catch (docError: any) {
      // Rollback: delete User record if Doctor creation fails
      if (createdUserId) {
        await prisma.user.delete({ where: { id: createdUserId } });
      }
      throw docError;
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
