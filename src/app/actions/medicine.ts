"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { getErrorMessage } from "@/lib/error-utils";

export async function getMedicineCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("MedicineCategory")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function createCategory(name: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to create categories");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("MedicineCategory")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, category: data };
  } catch (error: unknown) {
    console.error("Failed to create category:", error);
    return { success: false, error: getErrorMessage(error, "Failed to create category") };
  }
}

export async function createMedicine(data: {
  name: string;
  categoryId: string;
  manufacturer?: string;
  inPrice: number;
  outPrice: number;
  unit: string;
  reorderLevel: number;
  barcode?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to create medicines");
    }

    const supabase = await createClient();
    const { data: newMedicine, error } = await supabase
      .from("Medicine")
      .insert([{
        name: data.name,
        categoryId: data.categoryId,
        manufacturer: data.manufacturer || null,
        inPrice: Number(data.inPrice),
        outPrice: Number(data.outPrice),
        unit: data.unit,
        reorderLevel: Number(data.reorderLevel),
        barcode: data.barcode || null,
        isActive: true
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    revalidatePath("/pharmacy/medicines");
    return { success: true, medicine: newMedicine };
  } catch (error: unknown) {
    console.error("Failed to create medicine:", error);
    return { success: false, error: getErrorMessage(error, "Failed to create medicine") };
  }
}

export async function getMedicines(query?: string) {
  try {
    const supabase = await createClient();

    // Fetch all medicines with their category name
    const { data: rawMedicines, error: medError } = await supabase
      .from("Medicine")
      .select(`
        *,
        MedicineCategory ( id, name )
      `)
      .order("name", { ascending: true });

    if (medError) throw new Error(medError.message);

    // Fetch all stock movements to compute current stock
    const { data: movements, error: movError } = await supabase
      .from("StockMovement")
      .select("medicineId, quantity");

    if (movError) throw new Error(movError.message);

    // Group movements and calculate sums
    const stockMap: Record<string, number> = {};
    if (movements) {
      movements.forEach((m: any) => {
        stockMap[m.medicineId] = (stockMap[m.medicineId] || 0) + Number(m.quantity);
      });
    }

    let medicines = (rawMedicines || []).map((m: any) => {
      const cat = Array.isArray(m.MedicineCategory) ? m.MedicineCategory[0] : m.MedicineCategory;
      const currentStock = stockMap[m.id] || 0;
      return {
        ...m,
        category: cat,
        currentStock,
        isLowStock: currentStock <= Number(m.reorderLevel),
      };
    });

    if (query) {
      const q = query.toLowerCase();
      medicines = medicines.filter((m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.manufacturer || "").toLowerCase().includes(q) ||
        (m.category?.name || "").toLowerCase().includes(q)
      );
    }

    return medicines;
  } catch (error: unknown) {
    console.error("Failed to get medicines:", error);
    return [];
  }
}
