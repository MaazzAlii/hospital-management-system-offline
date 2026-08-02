"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { getErrorMessage } from "@/lib/error-utils";

export async function getSuppliers(query?: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized to view suppliers');
    }

    let whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { contactPerson: { contains: query } },
        { phone: { contains: query } },
      ];
    }

    return await prisma.supplier.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });
  } catch (error: unknown) {
    console.error("Failed to get suppliers:", error);
    return [];
  }
}

export async function getSupplierById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      return null;
    }

    return await prisma.supplier.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to fetch supplier:", error);
    return null;
  }
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });

    revalidatePath("/pharmacy/suppliers");
    return { success: true, supplier };
  } catch (error: unknown) {
    console.error("Failed to create supplier:", error);
    return { success: false, error: getErrorMessage(error, "Failed to create supplier") };
  }
}

export async function updateSupplier(id: string, data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });

    revalidatePath("/pharmacy/suppliers");
    return { success: true, supplier };
  } catch (error: unknown) {
    console.error("Failed to update supplier:", error);
    return { success: false, error: getErrorMessage(error, "Failed to update supplier") };
  }
}
