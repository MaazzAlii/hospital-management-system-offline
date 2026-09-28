"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { getErrorMessage } from "@/lib/error-utils";
import { generatePurchaseNo } from "@/lib/id-generator";

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
  initialStock?: {
    quantity: number;
    batchNo?: string;
    expiryDate?: string;
  };
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to create medicines");
    }

    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
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

      if (data.initialStock && Number(data.initialStock.quantity) > 0) {
        const qty = Number(data.initialStock.quantity);
        const batchCode = data.initialStock.batchNo?.trim() || `B-${Date.now().toString().slice(-6)}`;
        const defaultExp = new Date();
        defaultExp.setFullYear(defaultExp.getFullYear() + 2);
        const expDate = data.initialStock.expiryDate ? new Date(data.initialStock.expiryDate) : defaultExp;
        const inPrice = Number(data.inPrice) || 0;

        const purchaseNo = await generatePurchaseNo(tx);
        const purchase = await tx.purchase.create({
          data: {
            purchaseNo,
            totalAmount: inPrice * qty,
            status: "completed",
            notes: `Initial stock for ${medicine.name}`,
          },
        });

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            medicineId: medicine.id,
            quantity: qty,
            unitPrice: inPrice,
            totalPrice: inPrice * qty,
            batchNo: batchCode,
            expiryDate: expDate,
          },
        });

        await tx.batch.create({
          data: {
            medicineId: medicine.id,
            purchaseItemId: purchaseItem.id,
            batchNo: batchCode,
            expiryDate: expDate,
            quantityReceived: qty,
            quantityRemaining: qty,
          },
        });

        await tx.stockMovement.create({
          data: {
            medicineId: medicine.id,
            purchaseItemId: purchaseItem.id,
            type: "purchase",
            quantity: qty,
            referenceType: "Purchase",
            referenceId: purchase.id,
            notes: `Initial stock batch: ${batchCode}`,
          },
        });
      }

      return medicine;
    });

    revalidatePath("/pharmacy/medicines");
    revalidatePath("/pharmacy/inventory");
    revalidatePath("/pharmacy/purchases");
    return { success: true, medicine: result };
  } catch (error: unknown) {
    console.error("Failed to create medicine:", error);
    return { success: false, error: getErrorMessage(error, "Failed to create medicine") };
  }
}

export async function getMedicines(query?: string, page: number = 1, pageSize: number = 50) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized to view medicines');
    }

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { manufacturer: { contains: query } },
        { category: { name: { contains: query } } },
      ];
    }

    // Total count for the summary card + pagination — a single COUNT(*), never scales badly.
    const totalCount = await prisma.medicine.count({ where: whereClause });

    // Only fetch ONE PAGE of medicines. skip/take keeps this query's cost flat forever.
    const pageMedicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const medicineIds = pageMedicines.map((m) => m.id);

    // Aggregate stock in SQL, scoped ONLY to this page's medicine IDs (max = pageSize, e.g. 50).
    // This IN(...) list can never grow past pageSize, no matter how large the catalog gets.
    const stockAggregates = medicineIds.length
      ? await prisma.stockMovement.groupBy({
          by: ['medicineId'],
          where: { medicineId: { in: medicineIds } },
          _sum: { quantity: true },
        })
      : [];
    const stockByMedicine = new Map(stockAggregates.map((s) => [s.medicineId, s._sum.quantity ?? 0]));

    // Batches, also scoped only to this page.
    const batches = medicineIds.length
      ? await prisma.batch.findMany({
          where: { medicineId: { in: medicineIds }, quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        })
      : [];
    const batchesByMedicine = new Map<string, typeof batches>();
    for (const b of batches) {
      if (!batchesByMedicine.has(b.medicineId)) batchesByMedicine.set(b.medicineId, []);
      batchesByMedicine.get(b.medicineId)!.push(b);
    }

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const medicines = pageMedicines.map((m) => {
      const currentStock = stockByMedicine.get(m.id) ?? 0;
      const medBatches = (batchesByMedicine.get(m.id) ?? []).map((b) => {
        const expDate = new Date(b.expiryDate);
        let expiryStatus: 'expired' | 'expiring_soon' | 'valid' = 'valid';
        if (expDate < now) expiryStatus = 'expired';
        else if (expDate <= ninetyDaysFromNow) expiryStatus = 'expiring_soon';
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
        batches: medBatches,
      };
    });

    return { medicines, totalCount, page, pageSize, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) };
  } catch (error: unknown) {
    // Do NOT return a silently-empty success shape. Surface the failure so it's visible,
    // not indistinguishable from "zero medicines exist".
    console.error("Failed to get medicines:", error);
    return { medicines: [], totalCount: 0, page: 1, pageSize, totalPages: 1, error: getErrorMessage(error, "Failed to load medicines") };
  }
}

export async function getLowStockCount() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) return 0;

    // Sum stock per medicine in SQL, compare to each medicine's own reorderLevel, count matches.
    const medicines = await prisma.medicine.findMany({ select: { id: true, reorderLevel: true } });
    if (medicines.length === 0) return 0;

    const aggregates = await prisma.stockMovement.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
    });
    const stockByMedicine = new Map(aggregates.map((s) => [s.medicineId, s._sum.quantity ?? 0]));

    return medicines.filter((m) => (stockByMedicine.get(m.id) ?? 0) <= m.reorderLevel).length;
  } catch (error) {
    console.error("Failed to compute low stock count:", error);
    return 0;
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
