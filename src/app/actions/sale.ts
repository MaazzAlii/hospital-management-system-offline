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
            batch: true,
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
            batch: true,
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
  customerAddress?: string;
  accountCode?: string;
  licenseNo?: string;
  ntn?: string;
  summaryPrsNo?: string;
  bookedBy?: string;
  salesmanMobile?: string;
  suppliedBy?: string;
  territory?: string;
  saleDate?: string | Date;
  totalAmount: number;
  status?: string;
  items: Array<{
    medicineId: string;
    batchId?: string;
    batchNo?: string;
    expiryDate?: string | Date;
    quantity: number;
    freeQty?: number;
    outPrice?: number;
    unitPrice?: number;
    tradePrice?: number;
    grossAmount?: number;
    discountPercent?: number;
    discountAmount?: number;
    sTax?: number;
    gst?: number;
    netAmount?: number;
  }>;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    if (!data.items || data.items.length === 0) {
      throw new Error("Sale must contain at least one item");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sale = await prisma.$transaction(async (tx) => {
      // 1. Generate Sale No inside transaction
      const saleNo = await generateSaleNo(tx);

      // 2. Create Sale header
      const createdSale = await tx.sale.create({
        data: {
          saleNo,
          patientId: data.patientId || null,
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          customerAddress: data.customerAddress || null,
          accountCode: data.accountCode || null,
          licenseNo: data.licenseNo || null,
          ntn: data.ntn || null,
          summaryPrsNo: data.summaryPrsNo || null,
          bookedBy: data.bookedBy || null,
          salesmanMobile: data.salesmanMobile || null,
          suppliedBy: data.suppliedBy || null,
          territory: data.territory || null,
          saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
          totalAmount: Number(data.totalAmount || 0),
          status: data.status || "completed",
        },
      });

      // 3. Process Items, Batches & Stock Movements
      for (const item of data.items) {
        const qty = Number(item.quantity) || 0;
        const freeQty = Number(item.freeQty) || 0;
        const totalDeductQty = qty + freeQty;

        if (totalDeductQty <= 0) {
          throw new Error("Item quantity must be greater than 0");
        }

        const price = Number(item.tradePrice ?? item.unitPrice ?? item.outPrice ?? 0);
        const grossAmount = Number(item.grossAmount ?? (price * qty));
        const discountPercent = Number(item.discountPercent || 0);
        const discountAmount = Number(item.discountAmount ?? (grossAmount * discountPercent / 100));
        const sTax = Number(item.sTax || 0);
        const gst = Number(item.gst || 0);
        const netAmount = Number(item.netAmount ?? (grossAmount - discountAmount + sTax + gst));

        let allocatedBatchId: string | null = item.batchId || null;
        let batchNoToRecord: string | null = item.batchNo || null;
        let expiryDateToRecord: Date | null = item.expiryDate ? new Date(item.expiryDate) : null;

        // If batch is explicitly specified
        if (allocatedBatchId) {
          const batch = await tx.batch.findUnique({
            where: { id: allocatedBatchId },
            include: { medicine: true },
          });

          if (!batch) {
            throw new Error(`Selected batch not found for item`);
          }

          // Expiry validation: reject if expired
          const batchExp = new Date(batch.expiryDate);
          batchExp.setHours(23, 59, 59, 999);
          if (batchExp < today) {
            throw new Error(`Cannot sell expired medicine: ${batch.medicine.name} (Batch ${batch.batchNo} expired on ${new Date(batch.expiryDate).toLocaleDateString()})`);
          }

          // Stock safety: verify remaining quantity
          if (batch.quantityRemaining < totalDeductQty) {
            throw new Error(`Insufficient stock in Batch ${batch.batchNo} for ${batch.medicine.name}. Available: ${batch.quantityRemaining}, Requested: ${totalDeductQty}`);
          }

          // Deduct from batch
          await tx.batch.update({
            where: { id: batch.id },
            data: {
              quantityRemaining: { decrement: totalDeductQty },
            },
          });

          batchNoToRecord = batch.batchNo;
          expiryDateToRecord = batch.expiryDate;
        } else {
          // FEFO auto-allocation if no specific batch chosen
          const availableBatches = await tx.batch.findMany({
            where: {
              medicineId: item.medicineId,
              quantityRemaining: { gt: 0 },
              expiryDate: { gte: today }, // only non-expired
            },
            orderBy: { expiryDate: "asc" },
          });

          const totalAvailableInValidBatches = availableBatches.reduce((s, b) => s + b.quantityRemaining, 0);
          if (totalAvailableInValidBatches < totalDeductQty) {
            // Check if there are expired batches
            const expiredBatches = await tx.batch.findMany({
              where: {
                medicineId: item.medicineId,
                quantityRemaining: { gt: 0 },
                expiryDate: { lt: today },
              },
            });
            if (expiredBatches.length > 0) {
              throw new Error(`Cannot complete sale: available batches for this medicine have expired. Please review inventory.`);
            }
            throw new Error(`Insufficient valid stock for medicine. Available: ${totalAvailableInValidBatches}, Requested: ${totalDeductQty}`);
          }

          // Deduct using FEFO across available batches
          let remainingToDeduct = totalDeductQty;
          for (const b of availableBatches) {
            if (remainingToDeduct <= 0) break;
            const deductHere = Math.min(b.quantityRemaining, remainingToDeduct);
            await tx.batch.update({
              where: { id: b.id },
              data: {
                quantityRemaining: { decrement: deductHere },
              },
            });
            if (!allocatedBatchId) {
              allocatedBatchId = b.id;
              batchNoToRecord = b.batchNo;
              expiryDateToRecord = b.expiryDate;
            }
            remainingToDeduct -= deductHere;
          }
        }

        // Create SaleItem
        await tx.saleItem.create({
          data: {
            saleId: createdSale.id,
            medicineId: item.medicineId,
            batchId: allocatedBatchId,
            batchNo: batchNoToRecord,
            expiryDate: expiryDateToRecord,
            quantity: qty,
            freeQty: freeQty,
            unitPrice: price,
            tradePrice: price,
            grossAmount: grossAmount,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            sTax: sTax,
            gst: gst,
            netAmount: netAmount,
            totalPrice: netAmount,
          },
        });

        // Create negative stock movement for stock ledger
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: "out",
            quantity: -Math.abs(totalDeductQty),
            referenceType: "Sale",
            referenceId: createdSale.id,
            notes: `Sale ${createdSale.saleNo} - Batch: ${batchNoToRecord || 'Auto-FEFO'} (Qty: ${qty}, Free: ${freeQty})`,
          },
        });
      }

      // 4. Create Billing Invoice if linked
      const invoiceNo = await generateInvoiceNo(tx);
      let targetPatientId = data.patientId;
      
      if (!targetPatientId) {
        let walkin = await tx.patient.findFirst({
          where: { name: data.customerName || "Walk-in Customer" },
        });
        if (!walkin) {
          walkin = await tx.patient.create({
            data: {
              mrn: "WALKIN-" + Date.now().toString().slice(-4),
              name: data.customerName || "Walk-in Customer",
              phone: data.customerPhone || null,
              address: data.customerAddress || null,
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
          notes: `Pharmacy Distributor Sale: ${createdSale.saleNo}${data.accountCode ? ` | Acc: ${data.accountCode}` : ''}`,
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
        const lineTotal = Number(item.netAmount ?? ((item.tradePrice || item.unitPrice || 0) * item.quantity));
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: `${medicineMap.get(item.medicineId) || "Medicine"}${item.batchNo ? ` (Batch: ${item.batchNo})` : ''}`,
            quantity: item.quantity + (item.freeQty || 0),
            unitPrice: item.tradePrice || item.unitPrice || 0,
            amount: lineTotal,
          },
        });
      }

      return createdSale;
    });

    revalidatePath("/pharmacy/sales");
    revalidatePath("/pharmacy/medicines");
    revalidatePath("/pharmacy/expiry-report");
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

export async function updateSale(
  id: string,
  data: {
    status?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    accountCode?: string;
    licenseNo?: string;
    ntn?: string;
    summaryPrsNo?: string;
    bookedBy?: string;
    salesmanMobile?: string;
    suppliedBy?: string;
    territory?: string;
    saleDate?: string | Date;
  }
) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized");
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        status: data.status || undefined,
        customerName: data.customerName !== undefined ? data.customerName : undefined,
        customerPhone: data.customerPhone !== undefined ? data.customerPhone : undefined,
        customerAddress: data.customerAddress !== undefined ? data.customerAddress : undefined,
        accountCode: data.accountCode !== undefined ? data.accountCode : undefined,
        licenseNo: data.licenseNo !== undefined ? data.licenseNo : undefined,
        ntn: data.ntn !== undefined ? data.ntn : undefined,
        summaryPrsNo: data.summaryPrsNo !== undefined ? data.summaryPrsNo : undefined,
        bookedBy: data.bookedBy !== undefined ? data.bookedBy : undefined,
        salesmanMobile: data.salesmanMobile !== undefined ? data.salesmanMobile : undefined,
        suppliedBy: data.suppliedBy !== undefined ? data.suppliedBy : undefined,
        territory: data.territory !== undefined ? data.territory : undefined,
        saleDate: data.saleDate ? new Date(data.saleDate) : undefined,
      },
    });

    revalidatePath("/pharmacy/sales");
    revalidatePath(`/pharmacy/sales/${id}`);
    return { success: true, sale };
  } catch (error: unknown) {
    console.error("Error updating sale:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to update sale" };
  }
}
