import { notFound } from "next/navigation";
import { getMedicineById, getMedicineCategories } from "@/app/actions/medicine";
import EditMedicineForm from "./form";

export const dynamic = "force-dynamic";

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [medicine, categories] = await Promise.all([
    getMedicineById(id),
    getMedicineCategories(),
  ]);

  if (!medicine) {
    notFound();
  }

  return <EditMedicineForm medicine={medicine} categories={categories} />;
}
