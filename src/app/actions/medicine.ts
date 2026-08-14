"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { getErrorMessage } from "@/lib/error-utils";

export async function getMedicineCategories() {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'pharmacy', 'read')) {
    throw new Error('Unauthorized to view medicine categories');
  }

  return await prisma.medicineCategory.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCategory(name: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to create categories");
    }

    const category = await prisma.medicineCategory.create({
      data: { name },
    });

    return { success: true, category };
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

    const medicine = await prisma.medicine.create({
      data: {
        name: data.name,
        categoryId: data.categoryId || null,
        manufacturer: data.manufacturer || null,
        unitPrice: Number(data.inPrice),
        sellingPrice: Number(data.outPrice),
        unit: data.unit,
        reorderLevel: Number(data.reorderLevel),
      },
    });
    
    revalidatePath("/pharmacy/medicines");
    return { success: true, medicine };
  } catch (error: unknown) {
    console.error("Failed to create medicine:", error);
    return { success: false, error: getErrorMessage(error, "Failed to create medicine") };
  }
}

export async function getMedicines(query?: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized to view medicines');
    }

    let whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { manufacturer: { contains: query } },
        { category: { name: { contains: query } } },
      ];
    }

    const rawMedicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true },
        },
        stockMovements: {
          select: { quantity: true },
        },
        batches: {
          where: {
            quantityRemaining: { gt: 0 },
          },
          orderBy: { expiryDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    return rawMedicines.map((m) => {
      const currentStock = m.stockMovements.reduce((sum, sm) => sum + sm.quantity, 0);
      const batches = m.batches.map((b) => {
        const expDate = new Date(b.expiryDate);
        let expiryStatus: 'expired' | 'expiring_soon' | 'valid' = 'valid';
        if (expDate < now) {
          expiryStatus = 'expired';
        } else if (expDate <= ninetyDaysFromNow) {
          expiryStatus = 'expiring_soon';
        }

        return {
          id: b.id,
          batchNo: b.batchNo,
          expiryDate: b.expiryDate,
          quantityReceived: b.quantityReceived,
          quantityRemaining: b.quantityRemaining,
          expiryStatus,
          isExpired: expiryStatus === 'expired',
        };
      });

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        manufacturer: m.manufacturer,
        inPrice: m.unitPrice,
        outPrice: m.sellingPrice,
        unit: m.unit || "Unit",
        currentStock,
        reorderLevel: m.reorderLevel,
        isLowStock: currentStock <= m.reorderLevel,
        isActive: true,
        batches,
      };
    });
  } catch (error: unknown) {
    console.error("Failed to get medicines:", error);
    return [];
  }
}

export async function getMedicineById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      return null;
    }

    return await prisma.medicine.findUnique({
      where: { id },
      include: { category: true },
    });
  } catch (error) {
    console.error("Failed to fetch medicine:", error);
    return null;
  }
}

export async function updateMedicine(id: string, data: {
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
      throw new Error("Unauthorized to update medicine");
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        name: data.name,
        categoryId: data.categoryId || null,
        manufacturer: data.manufacturer || null,
        unitPrice: Number(data.inPrice),
        sellingPrice: Number(data.outPrice),
        unit: data.unit,
        reorderLevel: Number(data.reorderLevel),
      },
    });

    revalidatePath("/pharmacy/medicines");
    revalidatePath(`/pharmacy/medicines/${id}`);
    return { success: true, medicine };
  } catch (error: unknown) {
    console.error("Failed to update medicine:", error);
    return { success: false, error: getErrorMessage(error, "Failed to update medicine") };
  }
}

export async function deleteMedicine(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to delete medicine");
    }

    await prisma.medicine.delete({
      where: { id },
    });

    revalidatePath("/pharmacy/medicines");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete medicine:", error);
    return { success: false, error: getErrorMessage(error, "Failed to delete medicine") };
  }
}
