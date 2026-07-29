"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

export async function getSuppliers(query?: string) {
  try {
    const supabase = await createClient();
    const { data: rawSuppliers, error } = await supabase
      .from("Supplier")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    let suppliers = rawSuppliers || [];

    if (query) {
      const q = query.toLowerCase();
      suppliers = suppliers.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.contactPerson || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q)
      );
    }

    return suppliers;
  } catch (error) {
    console.error("Failed to get suppliers:", error);
    return [];
  }
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const supabase = await createClient();
    const { data: newSupplier, error } = await supabase
      .from("Supplier")
      .insert([
        {
          name: data.name,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          isActive: data.isActive,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/pharmacy/suppliers");
    return { success: true, supplier: newSupplier };
  } catch (error: any) {
    console.error("Failed to create supplier:", error);
    return { success: false, error: error.message || "Failed to create supplier" };
  }
}
