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

export async function deleteAppointment(id: string, force: boolean = false) {
  try {
    const { user, role } = await getCurrentUserRole();
    const isAdmin = role?.toLowerCase() === 'admin';
    if (!hasAccess(role, 'appointments', 'delete') && !hasAccess(role, 'appointments', 'write')) {
      throw new Error("Unauthorized to delete appointments");
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            opdVisits: true,
          },
        },
      },
    });

    if (!appt) {
      return { success: false, error: "Appointment not found" };
    }

    // Role check for doctors: doctors can only delete their own appointments
    if (role?.toLowerCase() === 'doctor') {
      const currentDoctorId = await getCurrentDoctorId();
      if (!currentDoctorId || appt.doctorId !== currentDoctorId) {
        throw new Error("Unauthorized: Doctors can only delete their own appointments");
      }
    }

    const hasLinkedOpd = appt._count.opdVisits > 0;

    // Check linked OPD visits without force
    if (hasLinkedOpd && !force) {
      if (isAdmin) {
        return {
          success: false,
          isLinked: true,
          canOverride: true,
          error: `Appointment for ${appt.patient?.name || 'patient'} has an OPD Clinical Visit linked. As an Admin, you can choose to override and delete this appointment.`,
        };
      }
      return {
        success: false,
        isLinked: true,
        canOverride: false,
        error: `Cannot delete appointment for ${appt.patient?.name || 'patient'} — an OPD Clinical Visit is already linked to this appointment and must be kept for audit purposes.`,
      };
    }

    // If linked and Admin confirmed force
    if (hasLinkedOpd && force) {
      if (!isAdmin) {
        throw new Error("Unauthorized: Only Admin users can perform an override deletion.");
      }

      await prisma.$transaction(async (tx) => {
        // Unlink or delete linked OPD visits
        await tx.opdVisit.deleteMany({ where: { appointmentId: id } });

        // Delete appointment
        await tx.appointment.delete({ where: { id } });

        // Record in AuditLog
        await tx.auditLog.create({
          data: {
            action: "APPOINTMENT_ADMIN_OVERRIDE_DELETE",
            module: "appointments",
            userId: user?.id || null,
            details: {
              appointmentId: id,
              patientId: appt.patientId,
              patientName: appt.patient?.name,
              doctorName: appt.doctor?.user?.name,
              override: true,
              scheduledAt: appt.scheduledAt.toISOString(),
              deletedAt: new Date().toISOString(),
              deletedBy: user?.name || user?.email || "Admin",
            },
          },
        });
      });

      revalidatePath("/appointments");
      return { success: true };
    }

    // Standard safe deletion
    await prisma.appointment.delete({
      where: { id },
    });

    // Record in AuditLog
    await prisma.auditLog.create({
      data: {
        action: "DELETE_APPOINTMENT",
        module: "appointments",
        userId: user?.id || null,
        details: {
          appointmentId: id,
          patientId: appt.patientId,
          patientName: appt.patient?.name,
          doctorName: appt.doctor?.user?.name,
          scheduledAt: appt.scheduledAt.toISOString(),
          deletedAt: new Date().toISOString(),
          deletedBy: user?.name || user?.email || "Admin",
        },
      },
    });

    revalidatePath("/appointments");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete appointment:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to delete appointment",
    };
  }
}

