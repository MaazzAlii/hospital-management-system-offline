import { notFound } from "next/navigation";
import { getOpdVisitById } from "@/app/actions/opd";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import EditOpdVisitForm from "./form";

export const dynamic = "force-dynamic";

export default async function EditOpdVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, "opd", "write")) {
    notFound();
  }

  const visit = await getOpdVisitById(id);

  if (!visit) {
    notFound();
  }

  return <EditOpdVisitForm visit={visit} />;
}
