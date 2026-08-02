import { prisma } from "@/lib/prisma";
import NewAppointmentForm from "./form";
export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  const [patients, rawDoctors] = await Promise.all([
    prisma.patient.findMany({
      select: { id: true, name: true, mrn: true },
      orderBy: { name: "asc" },
    }),
    prisma.doctor.findMany({
      where: { status: "active" },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const doctorOptions = rawDoctors.map((d) => ({
    id: d.id,
    name: d.user?.name || "Unknown",
    specialization: d.specialization || "",
  }));

  return <NewAppointmentForm patients={patients || []} doctors={doctorOptions} />;
}
