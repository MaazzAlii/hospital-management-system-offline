"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { generateSaleNo, generateInvoiceNo } from "@/lib/id-generator";

export async function getSales() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized');
    }

    return await prisma.sale.findMany({
      include: {
        patient: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}

export async function getSaleById(id: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      return null;
    }

    return await prisma.sale.findUnique({
      where: { id },
      include: {
        patient: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sale details:", error);
    return null;
  }
}

export async function createSale(data: {
  patientId?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  status?: string;
  items: Array<{
    medicineId: string;
    quantity: number;
    outPrice?: number;
    unitPrice?: number;
    batchNo?: string;
  }>;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const saleNo = await generateSaleNo();

    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale
      const createdSale = await tx.sale.create({
        data: {
          saleNo,
          patientId: data.patientId || null,
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          totalAmount: data.totalAmount,
          status: data.status || "completed",
        },
      });

      // 2. Process Items & Stock Movements
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const price = item.outPrice ?? item.unitPrice ?? 0;
          
          await tx.saleItem.create({
            data: {
              saleId: createdSale.id,
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: price,
              totalPrice: price * item.quantity,
              batchNo: item.batchNo || null,
            },
          });

          // Negative quantity for stock deduction
          await tx.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              type: "out",
              quantity: -Math.abs(item.quantity),
              referenceType: "Sale",
              referenceId: createdSale.id,
              notes: `Pharmacy Sale ${createdSale.saleNo}`,
            },
          });
        }

        // 3. Create Billing Invoice if linked
        const invoiceNo = await generateInvoiceNo();
        let targetPatientId = data.patientId;
        
        if (!targetPatientId) {
          let walkin = await tx.patient.findFirst({
            where: { name: "Walk-in Patient" },
          });
          if (!walkin) {
            walkin = await tx.patient.create({
              data: {
                mrn: "WALKIN-" + Date.now().toString().slice(-4),
                name: "Walk-in Patient",
              },
            });
          }
          targetPatientId = walkin.id;
        }

        const invoice = await tx.invoice.create({
          data: {
            invoiceNo,
            sourceType: "Pharmacy",
            sourceId: createdSale.id,
            patientId: targetPatientId,
            subtotal: data.totalAmount,
            total: data.totalAmount,
            status: data.status || "completed",
            notes: `Pharmacy Sale: ${createdSale.saleNo}`,
          },
        });

        // Add Invoice Items
        const medicineIds = data.items.map((i) => i.medicineId);
        const medicines = await tx.medicine.findMany({
          where: { id: { in: medicineIds } },
          select: { id: true, name: true },
        });

        const medicineMap = new Map(medicines.map((m) => [m.id, m.name]));

        for (const item of data.items) {
          const price = item.outPrice ?? item.unitPrice ?? 0;
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              description: medicineMap.get(item.medicineId) || "Medicine",
              quantity: item.quantity,
              unitPrice: price,
              amount: price * item.quantity,
            },
          });
        }
      }

      return createdSale;
    });

    revalidatePath("/pharmacy/sales");
    revalidatePath("/pharmacy/medicines");
    revalidatePath("/billing");
    return { success: true, sale };
  } catch (error: unknown) {
    console.error("Error creating sale:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to create sale",
    };
  }
}

export async function updateSale(id: string, data: {
  status: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: { status: data.status },
    });

    revalidatePath("/pharmacy/sales");
    return { success: true, sale };
  } catch (error: unknown) {
    console.error("Error updating sale:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to update sale" };
  }
}
