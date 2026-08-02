"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from "@/lib/auth-utils";

export async function createAppointment(data: {
  patientId: string;
  doctorId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  notes?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'appointments', 'write')) {
      throw new Error("Unauthorized");
    }

    if (role?.toLowerCase() === 'doctor') {
      const currentDoctorId = await getCurrentDoctorId();
      if (!currentDoctorId || data.doctorId !== currentDoctorId) {
        throw new Error("Unauthorized: Doctors can only create appointments for themselves");
      }
    }

    const scheduledAt = new Date(`${data.date}T${data.time}:00`);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledAt,
        notes: data.notes || null,
        status: "scheduled",
      },
    });

    revalidatePath("/appointments");
    return { success: true, appointment };
  } catch (error: unknown) {
    console.error("Failed to create appointment:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to create appointment" };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: "scheduled" | "completed" | "cancelled" | "no-show"
) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'appointments', 'write')) {
      throw new Error("Unauthorized");
    }

    if (role?.toLowerCase() === 'doctor') {
      const currentDoctorId = await getCurrentDoctorId();
      const existing = await prisma.appointment.findUnique({
        where: { id },
        select: { doctorId: true },
      });
      if (!existing || existing.doctorId !== currentDoctorId) {
        throw new Error("Unauthorized: Doctors can only update their own appointments");
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/appointments");
    return { success: true, appointment };
  } catch (error: unknown) {
    console.error("Failed to update appointment status:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to update status" };
  }
}

export async function getAppointmentsWithDetails(query?: string) {
  const { role } = await getCurrentUserRole();

  let whereClause: any = {};

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (currentDoctorId) {
      whereClause.doctorId = currentDoctorId;
    } else {
      return [];
    }
  }

  if (query) {
    whereClause.OR = [
      { patient: { name: { contains: query } } },
      { patient: { mrn: { contains: query } } },
      { doctor: { user: { name: { contains: query } } } },
    ];
  }

  const rawAppointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      patient: true,
      doctor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "desc",
    },
  });

  return rawAppointments.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt,
    status: a.status,
    notes: a.notes,
    patient: {
      id: a.patient?.id ?? "",
      mrn: a.patient?.mrn ?? "",
      name: a.patient?.name ?? "Unknown",
      phone: a.patient?.phone ?? "",
    },
    doctor: {
      id: a.doctor?.id ?? "",
      specialization: a.doctor?.specialization ?? null,
      user: { name: a.doctor?.user?.name ?? "Unknown" },
    },
  }));
}
