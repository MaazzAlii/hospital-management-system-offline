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

export async function deletePatient(id: string, force: boolean = false) {
  try {
    const { user, role } = await getCurrentUserRole();
    const isAdmin = role?.toLowerCase() === 'admin';
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

    const hasLinkedRecords = reasons.length > 0;

    // If records are linked and force is NOT enabled
    if (hasLinkedRecords && !force) {
      if (isAdmin) {
        return {
          success: false,
          isLinked: true,
          canOverride: true,
          linkedCounts: linked,
          error: `Patient "${patient.name}" (${patient.mrn}) has ${reasons.join(', ')} linked. As an Admin, you can choose to override and permanently delete this patient along with all linked records.`,
        };
      }
      return {
        success: false,
        isLinked: true,
        canOverride: false,
        error: `Cannot delete patient "${patient.name}" (${patient.mrn}) — this record has ${reasons.join(', ')} linked and must be kept for audit purposes.`,
      };
    }

    // If linked records exist and Admin confirmed force delete
    if (hasLinkedRecords && force) {
      if (!isAdmin) {
        throw new Error("Unauthorized: Only Admin users can perform an override deletion.");
      }

      await prisma.$transaction(async (tx) => {
        // 1. Lab orders
        const labOrders = await tx.labOrder.findMany({ where: { patientId: id }, select: { id: true } });
        const labOrderIds = labOrders.map((o) => o.id);
        if (labOrderIds.length > 0) {
          await tx.labResult.deleteMany({ where: { labOrderId: { in: labOrderIds } } });
          await tx.sample.deleteMany({ where: { labOrderId: { in: labOrderIds } } });
          await tx.labOrderItem.deleteMany({ where: { labOrderId: { in: labOrderIds } } });
          await tx.labOrder.deleteMany({ where: { patientId: id } });
        }

        // 2. Sales
        const sales = await tx.sale.findMany({ where: { patientId: id }, select: { id: true } });
        const saleIds = sales.map((s) => s.id);
        if (saleIds.length > 0) {
          await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
          await tx.sale.deleteMany({ where: { patientId: id } });
        }

        // 3. OPD Visits
        await tx.opdVisit.deleteMany({ where: { patientId: id } });

        // 4. Invoices
        const invoices = await tx.invoice.findMany({ where: { patientId: id }, select: { id: true } });
        const invoiceIds = invoices.map((i) => i.id);
        if (invoiceIds.length > 0) {
          await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { patientId: id } });
        }

        // 5. Appointments
        await tx.appointment.deleteMany({ where: { patientId: id } });

        // 6. Delete Patient
        await tx.patient.delete({ where: { id } });

        // 7. AuditLog entry
        await tx.auditLog.create({
          data: {
            action: "PATIENT_ADMIN_OVERRIDE_DELETE",
            module: "patients",
            userId: user?.id || null,
            details: {
              patientId: id,
              name: patient.name,
              mrn: patient.mrn,
              override: true,
              deletedCounts: linked,
              deletedAt: new Date().toISOString(),
              deletedBy: user?.name || user?.email || "Admin",
            },
          },
        });
      });

      revalidatePath("/patients");
      return { success: true };
    }

    // Standard safe deletion (no linked records)
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

