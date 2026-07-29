"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

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

    const supabase = await createClient();
    const scheduledAt = new Date(`${data.date}T${data.time}:00`).toISOString();

    const { data: appointment, error } = await supabase.from("Appointment").insert({
      patientId: data.patientId,
      doctorId: data.doctorId,
      scheduledAt,
      notes: data.notes || null,
      status: "scheduled",
    }).select().single();

    if (error) throw new Error(error.message);

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

    const supabase = await createClient();
    const { data: appointment, error } = await supabase.from("Appointment").update({ status }).eq("id", id).select().single();
    if (error) throw new Error(error.message);

    revalidatePath("/appointments");
    return { success: true, appointment };
  } catch (error: unknown) {
    console.error("Failed to update appointment status:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to update status" };
  }
}

export async function getAppointmentsWithDetails(query?: string) {
  const supabase = await createClient();
  const { data: rawAppointments } = await supabase
    .from("Appointment")
    .select(`
      id,
      scheduledAt,
      status,
      notes,
      Patient ( id, mrn, name, phone ),
      Doctor ( id, userId, specialization )
    `)
    .order("scheduledAt", { ascending: false });

  // Fetch users separately
  let usersMap: Record<string, string> = {};
  if (rawAppointments && rawAppointments.length > 0) {
    const userIds = rawAppointments
      .map((a: any) => {
        const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
        return d?.userId;
      })
      .filter(Boolean);

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("User")
        .select("id, name")
        .in("id", userIds);

      if (usersData) {
        usersMap = usersData.reduce((acc, u) => {
          acc[u.id] = u.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
  }

  let appointments = (rawAppointments || []).map((a: any) => {
    const p = Array.isArray(a.Patient) ? a.Patient[0] : a.Patient;
    const d = Array.isArray(a.Doctor) ? a.Doctor[0] : a.Doctor;
    const uName = d?.userId ? usersMap[d.userId] : "Unknown";
    
    return {
      id: a.id,
      scheduledAt: new Date(a.scheduledAt),
      status: a.status,
      notes: a.notes,
      patient: { id: p?.id, mrn: p?.mrn, name: p?.name, phone: p?.phone },
      doctor: { id: d?.id, specialization: d?.specialization, user: { name: uName || "Unknown" } }
    };
  });

  if (query) {
    const q = query.toLowerCase();
    appointments = appointments.filter((a) =>
      (a.patient?.name || "").toLowerCase().includes(q) ||
      (a.patient?.mrn || "").toLowerCase().includes(q) ||
      (a.doctor?.user?.name || "").toLowerCase().includes(q)
    );
  }

  return appointments;
}
