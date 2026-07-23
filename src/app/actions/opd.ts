"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const supabase = await createClient();
  
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
