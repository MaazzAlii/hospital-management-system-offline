import { prisma } from "@/lib/prisma";
import NewInvoiceForm from "./form";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const patients = await prisma.patient.findMany({
    select: { id: true, name: true, mrn: true },
    orderBy: { name: "asc" },
  });

  const { role } = await getCurrentUserRole();
  const canApplyDiscount = hasAccess(role, "billing", "apply_discount");

  return <NewInvoiceForm patients={patients || []} canApplyDiscount={canApplyDiscount} />;
}
