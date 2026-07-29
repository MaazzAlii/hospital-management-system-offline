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

export async function getOpdVisits(query?: string) {
  const { role } = await getCurrentUserRole();
  const supabase = await createClient();

  let req = supabase
    .from("OpdVisit")
    .select(`
      id,
      visitDate,
      diagnosis,
      status,
      vitals,
      notes,
      followUpDate,
      doctorId,
      patient:Patient(name, mrn)
    `)
    .order("visitDate", { ascending: false });

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (currentDoctorId) {
      req = req.eq("doctorId", currentDoctorId);
    } else {
      return [];
    }
  }

  const { data: visits, error } = await req;

  if (error) {
    console.error("Error fetching OPD visits:", error);
    return [];
  }

  let doctorUsers: Record<string, string> = {};
  if (visits && visits.length > 0) {
    const doctorIds = [...new Set(visits.map((v: any) => v.doctorId))].filter(Boolean);
    if (doctorIds.length > 0) {
      const { data: doctorsData } = await supabase.from("Doctor").select("id, userId").in("id", doctorIds);
      if (doctorsData) {
        const userIds = doctorsData.map((d: any) => d.userId).filter(Boolean);
        if (userIds.length > 0) {
          const { data: usersData } = await supabase.from("User").select("id, name").in("id", userIds);
          if (usersData) {
            const userMap = usersData.reduce((acc: any, u: any) => {
              acc[u.id] = u.name;
              return acc;
            }, {} as Record<string, string>);
            
            doctorUsers = doctorsData.reduce((acc: any, d: any) => {
              acc[d.id] = userMap[d.userId] || "Unknown";
              return acc;
            }, {} as Record<string, string>);
          }
        }
      }
    }
  }

  let resultVisits = (visits || []).map((v: any) => ({
    ...v,
    doctorName: doctorUsers[v.doctorId] || "Unknown"
  }));

  if (query) {
    const q = query.toLowerCase();
    resultVisits = resultVisits.filter((v: any) =>
      (v.status || "").toLowerCase().includes(q) ||
      (v.diagnosis || "").toLowerCase().includes(q) ||
      (v.patient?.name || "").toLowerCase().includes(q) ||
      (v.patient?.mrn || "").toLowerCase().includes(q)
    );
  }

  return resultVisits;
}

export async function getOpdVisitById(id: string) {
  const { role } = await getCurrentUserRole();
  const supabase = await createClient();

  const { data: visit, error } = await supabase
    .from("OpdVisit")
    .select(`
      *,
      patient:Patient(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !visit) {
    return null;
  }

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (visit.doctorId !== currentDoctorId) {
      throw new Error("Unauthorized: Doctors can only access their own OPD visits");
    }
  }

  return visit;
}
