"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from "@/lib/auth-utils";

export async function createOpdVisit(data: {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  visitDate: string;
  vitals?: any;
  diagnosis?: string;
  notes?: string;
  followUpDate?: string;
  status?: string;
}) {
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

  const supabase = await createClient();
  
  const { data: newVisit, error } = await supabase
    .from("OpdVisit")
    .insert([{
      patientId: data.patientId,
      doctorId: data.doctorId,
      visitDate: new Date(data.visitDate).toISOString(),
      vitals: data.vitals || {},
      diagnosis: data.diagnosis,
      notes: data.notes,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      status: data.status || "closed"
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating OPD visit:", error);
    return { success: false, error: error.message };
  }

  if (data.appointmentId) {
    const { error: apptError } = await supabase
      .from("Appointment")
      .update({ status: "completed" })
      .eq("id", data.appointmentId);
      
    if (apptError) {
      console.error("Error updating appointment:", apptError);
    }
  }

  revalidatePath("/appointments");
  revalidatePath("/opd");
  revalidatePath(`/patients/${data.patientId}`);
  return { success: true, visit: newVisit };
}

export async function updateOpdVisit(id: string, data: {
  vitals?: any;
  diagnosis?: string;
  notes?: string;
  followUpDate?: string;
  status: string;
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'opd', 'write')) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    const { data: existing } = await supabase.from("OpdVisit").select("doctorId").eq("id", id).maybeSingle();
    if (!existing || existing.doctorId !== currentDoctorId) {
      throw new Error("Unauthorized: Doctors can only update their own OPD visits");
    }
  }

  const { error } = await supabase
    .from("OpdVisit")
    .update({
      vitals: data.vitals || {},
      diagnosis: data.diagnosis,
      notes: data.notes,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      status: data.status
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating OPD visit:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/opd");
  revalidatePath(`/opd/${id}`);
  return { success: true };
}
