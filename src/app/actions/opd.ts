"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from "@/lib/auth-utils";

export async function createOpdVisit(data: {
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  visitDate?: string;
  followUpDate?: string;
  vitals?: {
    bp?: string;
    hr?: string;
    temp?: string;
    weight?: string;
    height?: string;
  };
  symptoms?: string;
  diagnosis?: string;
  notes?: string;
  prescription?: any;
  status?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'opd', 'write')) {
      throw new Error("Unauthorized");
    }

    if (role?.toLowerCase() === 'doctor') {
      const currentDoctorId = await getCurrentDoctorId();
      if (!currentDoctorId || data.doctorId !== currentDoctorId) {
        throw new Error("Unauthorized: Doctors can only create OPD visits for themselves");
      }
    }

    const visit = await prisma.opdVisit.create({
      data: {
        appointmentId: data.appointmentId || null,
        patientId: data.patientId,
        doctorId: data.doctorId,
        visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
        vitals: data.vitals || {},
        symptoms: data.symptoms || null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        prescription: data.prescription || null,
        status: data.status || "closed",
      },
    });

    // If linked to an appointment, mark appointment as completed
    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: "completed" },
      });
    }

    revalidatePath("/opd");
    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    if (data.patientId) revalidatePath(`/patients/${data.patientId}`);

    return { success: true, visit };
  } catch (error: unknown) {
    console.error("Failed to create OPD visit:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to create OPD visit",
    };
  }
}

export async function getOpdVisits(query?: string) {
  try {
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
        { diagnosis: { contains: query } },
        { status: { contains: query } },
        { patient: { name: { contains: query } } },
        { patient: { mrn: { contains: query } } },
      ];
    }

    return await prisma.opdVisit.findMany({
      where: whereClause,
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch OPD visits:", error);
    return [];
  }
}

export async function getOpdVisitById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'opd', 'read')) {
      return null;
    }

    return await prisma.opdVisit.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
        appointment: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch OPD visit:", error);
    return null;
  }
}
