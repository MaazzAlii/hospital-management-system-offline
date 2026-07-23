import { getMedicineCategories } from "@/app/actions/medicine";
import NewMedicineForm from "./form";

export const dynamic = "force-dynamic";

export default async function NewMedicinePage() {
  const categories = await getMedicineCategories();

  return <NewMedicineForm categories={categories} />;
}
