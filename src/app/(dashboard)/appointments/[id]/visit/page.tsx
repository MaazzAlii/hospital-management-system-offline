import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRole } from "@/lib/auth-utils";
import StartVisitForm from "./form";

export const dynamic = "force-dynamic";

export default async function StartVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentUserRole();
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!appointment) {
    notFound();
  }

  return <StartVisitForm appointment={appointment} />;
}
