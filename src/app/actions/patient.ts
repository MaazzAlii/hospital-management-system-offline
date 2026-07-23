"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

export async function getPatients() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'patients', 'read')) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('Patient')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
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

    const supabase = await createClient();

    // 1. Generate MRN (e.g. LCC-2026-0001)
    const year = new Date().getFullYear();
    const prefix = `LCC-${year}-`;
    
    // Fetch the latest MRN for this year to determine the next sequence
    const { data: latestPatients, error: fetchError } = await supabase
      .from('Patient')
      .select('mrn')
      .ilike('mrn', `${prefix}%`)
      .order('mrn', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw new Error(`Failed to fetch latest MRN: ${fetchError.message}`);
    }

    let sequence = 1;
    if (latestPatients && latestPatients.length > 0) {
      const lastMrn = latestPatients[0].mrn;
      const lastSeq = parseInt(lastMrn.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    const mrn = `${prefix}${String(sequence).padStart(4, "0")}`;

    // 2. Insert the new patient
    const { data: newPatient, error: insertError } = await supabase
      .from('Patient')
      .insert({
        mrn,
        name: data.name,
        dob: new Date(data.dob).toISOString(),
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        bloodGroup: data.bloodGroup || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert patient: ${insertError.message}`);
    }

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
