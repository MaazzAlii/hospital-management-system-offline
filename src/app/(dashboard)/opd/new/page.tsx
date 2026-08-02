import { prisma } from "@/lib/prisma";
import NewOpdForm from "./form";
export const dynamic = "force-dynamic";

export default async function NewOpdVisitPage() {
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

  return <NewOpdForm patients={patients || []} doctors={doctorOptions} />;
}
