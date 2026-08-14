"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { generateMRN } from "@/lib/id-generator";

export async function getPatients() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'read')) {
      return [];
    }

    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return patients || [];
  } catch (error: unknown) {
    console.error("Failed to fetch patients:", error);
    return [];
  }
}

export async function getPatientById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'read')) {
      return null;
    }
    return await prisma.patient.findUnique({ where: { id } });
  } catch (error) {
    console.error("Failed to fetch patient:", error);
    return null;
  }
}

export async function createPatient(data: {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  bloodGroup?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'write')) {
      throw new Error("Unauthorized to create patients");
    }

    // 1. Generate MRN atomically via SQLite counter transaction
    const mrn = await generateMRN();

    // 2. Insert the new patient via Prisma
    const newPatient = await prisma.patient.create({
      data: {
        mrn,
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        bloodGroup: data.bloodGroup || null,
      },
    });

    revalidatePath("/patients");
    return { success: true, patient: newPatient };
  } catch (error: unknown) {
    console.error("Failed to create patient:", error);
    return { 
      success: false, 
      error: (error instanceof Error ? error.message : String(error)) || "Failed to create patient" 
    };
  }
}

export async function updatePatient(id: string, data: {
  name: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  bloodGroup?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'write')) {
      throw new Error("Unauthorized to update patients");
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        bloodGroup: data.bloodGroup || null,
      },
    });

    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`);
    return { success: true, patient: updatedPatient };
  } catch (error: unknown) {
    console.error("Failed to update patient:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to update patient",
    };
  }
}

export async function deletePatient(id: string) {
  try {
    const { user, role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'delete') && !hasAccess(role, 'patients', 'write')) {
      throw new Error("Unauthorized to delete patients");
    }

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
            opdVisits: true,
            sales: true,
            labOrders: true,
            invoices: true,
          },
        },
      },
    });

    if (!patient) {
      return { success: false, error: "Patient not found" };
    }

    // Check linked counts
    const linked = patient._count;
    const reasons: string[] = [];

    if (linked.appointments > 0) reasons.push(`${linked.appointments} appointment${linked.appointments > 1 ? 's' : ''}`);
    if (linked.opdVisits > 0) reasons.push(`${linked.opdVisits} OPD visit${linked.opdVisits > 1 ? 's' : ''}`);
    if (linked.sales > 0) reasons.push(`${linked.sales} pharmacy sale${linked.sales > 1 ? 's' : ''}`);
    if (linked.labOrders > 0) reasons.push(`${linked.labOrders} lab order${linked.labOrders > 1 ? 's' : ''}`);
    if (linked.invoices > 0) reasons.push(`${linked.invoices} invoice${linked.invoices > 1 ? 's' : ''}`);

    if (reasons.length > 0) {
      return {
        success: false,
        error: `Cannot delete patient "${patient.name}" (${patient.mrn}) — this patient has ${reasons.join(', ')} linked. Remove those first, or contact an admin.`,
      };
    }

    // Safe to delete
    await prisma.patient.delete({
      where: { id },
    });

    // Record in AuditLog
    await prisma.auditLog.create({
      data: {
        action: "DELETE_PATIENT",
        module: "patients",
        userId: user?.id || null,
        details: {
          patientId: id,
          name: patient.name,
          mrn: patient.mrn,
          deletedAt: new Date().toISOString(),
          deletedBy: user?.name || user?.email || "Admin",
        },
      },
    });

    revalidatePath("/patients");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete patient:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to delete patient",
    };
  }
}

