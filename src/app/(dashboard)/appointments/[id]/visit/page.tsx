import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import OpdVisitForm from "./form";

export const dynamic = "force-dynamic";

export default async function OpdVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const appointmentId = resolvedParams.id;
  const supabase = await createClient();

  const { data: rawAppointment } = await supabase
    .from("Appointment")
    .select(`
      id,
      patientId,
      doctorId,
      status,
      Patient ( id, name, mrn, dob, gender ),
      Doctor ( id, userId, specialization )
    `)
    .eq("id", appointmentId)
    .single();

  if (!rawAppointment) {
    return notFound();
  }

  // Fetch the doctor's name from User table (due to PostgREST relationship bug)
  let doctorName = "Unknown Doctor";
  const doctor = Array.isArray(rawAppointment.Doctor) ? rawAppointment.Doctor[0] : rawAppointment.Doctor;
  if (doctor?.userId) {
    const { data: user } = await supabase
      .from("User")
      .select("name")
      .eq("id", doctor.userId)
      .single();
    if (user?.name) {
      doctorName = user.name;
    }
  }

  if (rawAppointment.status === "completed") {
    // If it's already completed, they can't start a visit again
    redirect("/appointments");
  }

  const patient = Array.isArray(rawAppointment.Patient) ? rawAppointment.Patient[0] : rawAppointment.Patient;

  const appointmentDetails = {
    id: rawAppointment.id,
    patientId: rawAppointment.patientId,
    doctorId: rawAppointment.doctorId,
    patient: patient,
    doctorName,
    doctorSpecialization: doctor?.specialization,
  };

  return <OpdVisitForm appointment={appointmentDetails} />;
}
