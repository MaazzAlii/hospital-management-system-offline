"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { generatePurchaseNo } from "@/lib/id-generator";

export async function getPurchases() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized');
    }

    return await prisma.purchase.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return [];
  }
}

export async function getPurchaseById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      return null;
    }

    return await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching purchase details:", error);
    return null;
  }
}

export async function createPurchase(data: {
  supplierId: string;
  totalAmount: number;
  status?: string;
  notes?: string;
  items: Array<{
    medicineId: string;
    quantity: number;
    inPrice?: number;
    unitPrice?: number;
    batchNo?: string;
    expiryDate?: string | Date;
  }>;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const purchaseNo = await generatePurchaseNo();

    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierId: data.supplierId || null,
          totalAmount: data.totalAmount,
          status: data.status || "completed",
          notes: data.notes || null,
        },
      });

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const price = item.unitPrice ?? item.inPrice ?? 0;
          const defaultExp = new Date();
          defaultExp.setFullYear(defaultExp.getFullYear() + 1);
          const expDate = item.expiryDate ? new Date(item.expiryDate) : defaultExp;
          const batchCode = item.batchNo?.trim() || `B-${Date.now().toString().slice(-6)}`;

          const createdItem = await tx.purchaseItem.create({
            data: {
              purchaseId: createdPurchase.id,
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: price,
              totalPrice: price * item.quantity,
              batchNo: batchCode,
              expiryDate: expDate,
            },
          });

          await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              purchaseItemId: createdItem.id,
              batchNo: batchCode,
              expiryDate: expDate,
              quantityReceived: item.quantity,
              quantityRemaining: item.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              purchaseItemId: createdItem.id,
              type: "purchase",
              quantity: item.quantity,
              referenceType: "Purchase",
              referenceId: createdPurchase.id,
              notes: `Purchase ${createdPurchase.purchaseNo}`,
            },
          });
        }
      }

      return createdPurchase;
    });

    revalidatePath("/pharmacy/purchases");
    revalidatePath("/pharmacy/medicines");
    return { success: true, purchase };
  } catch (error: unknown) {
    console.error("Error creating purchase:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to create purchase",
    };
  }
}

export async function updatePurchase(
  id: string,
  data: {
    supplierId?: string;
    notes?: string;
    status?: string;
    totalAmount?: number;
    items?: Array<{
      medicineId: string;
      quantity: number;
      unitPrice?: number;
      inPrice?: number;
      batchNo?: string;
      expiryDate?: string | Date;
    }>;
  }
) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error('Unauthorized');
    }

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      let calcTotal = data.totalAmount;

      if (data.items && data.items.length > 0) {
        // Remove existing stock movements and items for this purchase
        await tx.stockMovement.deleteMany({
          where: {
            referenceType: "Purchase",
            referenceId: id,
          },
        });

        await tx.purchaseItem.deleteMany({
          where: { purchaseId: id },
        });

        let newTotal = 0;
        for (const item of data.items) {
          const price = item.unitPrice ?? item.inPrice ?? 0;
          const itemTotal = price * item.quantity;
          newTotal += itemTotal;

          const defaultExp = new Date();
          defaultExp.setFullYear(defaultExp.getFullYear() + 1);
          const expDate = item.expiryDate ? new Date(item.expiryDate) : defaultExp;
          const batchCode = item.batchNo?.trim() || `B-${Date.now().toString().slice(-6)}`;

          const createdItem = await tx.purchaseItem.create({
            data: {
              purchaseId: id,
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: price,
              totalPrice: itemTotal,
              batchNo: batchCode,
              expiryDate: expDate,
            },
          });

          await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              purchaseItemId: createdItem.id,
              batchNo: batchCode,
              expiryDate: expDate,
              quantityReceived: item.quantity,
              quantityRemaining: item.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              purchaseItemId: createdItem.id,
              type: "purchase",
              quantity: item.quantity,
              referenceType: "Purchase",
              referenceId: id,
              notes: `Purchase updated`,
            },
          });
        }

        if (calcTotal === undefined) {
          calcTotal = newTotal;
        }
      }

      return await tx.purchase.update({
        where: { id },
        data: {
          supplierId: data.supplierId || undefined,
          notes: data.notes !== undefined ? data.notes : undefined,
          status: data.status || undefined,
          totalAmount: calcTotal !== undefined ? calcTotal : undefined,
        },
      });
    });

    revalidatePath('/pharmacy/purchases');
    revalidatePath(`/pharmacy/purchases/${id}`);
    revalidatePath('/pharmacy/medicines');
    return { success: true, purchase: updatedPurchase };
  } catch (error: unknown) {
    console.error('Error updating purchase:', error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || 'Failed to update purchase',
    };
  }
}
