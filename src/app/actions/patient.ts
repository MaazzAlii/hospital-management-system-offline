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
