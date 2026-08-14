'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export async function getSaleBySaleNo(saleNo: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { saleNo: saleNo.trim() },
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
    return sale;
  } catch (error) {
    console.error('Error fetching sale by saleNo:', error);
    return null;
  }
}

export async function getSaleReturns(selectedDate?: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized');
    }

    let dateFilter: any = {};
    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        type: 'return',
        referenceType: 'Sale',
        ...dateFilter,
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            unit: true,
            sellingPrice: true,
            unitPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Extract sale ids to get sale details
    const saleIds = Array.from(new Set(movements.map((m) => m.referenceId).filter(Boolean))) as string[];
    const sales = await prisma.sale.findMany({
      where: { id: { in: saleIds } },
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

    const salesMap = new Map(sales.map((s) => [s.id, s]));

    return movements.map((m) => {
      const sale = m.referenceId ? salesMap.get(m.referenceId) : null;
      const matchingItem = sale?.items?.find((i) => i.medicineId === m.medicineId);
      const unitPrice = matchingItem?.tradePrice || matchingItem?.unitPrice || m.medicine?.sellingPrice || 0;
      const refundAmount = Math.abs(m.quantity) * unitPrice;

      // Extract reason from notes (format: "Return against Sale SALE-XXX - Reason: ...")
      let reason = 'N/A';
      if (m.notes && m.notes.includes('Reason:')) {
        reason = m.notes.split('Reason:')[1]?.trim() || 'N/A';
      }

      return {
        id: m.id,
        returnDate: m.createdAt,
        saleId: sale?.id || m.referenceId,
        saleNo: sale?.saleNo || '—',
        patientName: sale?.patient?.name || sale?.customerName || 'Walk-in Customer',
        patientPhone: sale?.customerPhone || sale?.patient?.phone || '—',
        medicineId: m.medicineId,
        medicineName: m.medicine?.name || 'Unknown',
        batchNo: matchingItem?.batchNo || matchingItem?.batch?.batchNo || '—',
        quantityReturned: Math.abs(m.quantity),
        unitPrice: unitPrice,
        refundAmount: refundAmount,
        reason: reason,
        notes: m.notes,
      };
    });
  } catch (error) {
    console.error('Error fetching sale returns:', error);
    return [];
  }
}

export async function processReturn(saleId: string, itemsToReturn: any[]) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'pharmacy', 'write')) {
    throw new Error('Unauthorized');
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      items: {
        include: {
          batch: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error('Sale not found');
  }

  const validItems = itemsToReturn.filter((item) => Number(item.returnQuantity) > 0);

  if (validItems.length === 0) {
    throw new Error('No items to return');
  }

  await prisma.$transaction(async (tx) => {
    for (const item of validItems) {
      const returnQty = Number(item.returnQuantity);
      const saleItem = sale.items.find((i) => i.id === item.id || i.medicineId === item.medicineId);

      // Restore batch remaining quantity if batchId is present
      if (saleItem?.batchId) {
        await tx.batch.update({
          where: { id: saleItem.batchId },
          data: {
            quantityRemaining: { increment: returnQty },
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          medicineId: item.medicineId,
          type: 'return',
          quantity: Math.abs(returnQty),
          referenceType: 'Sale',
          referenceId: saleId,
          notes: `Return against Sale ${sale.saleNo} - Reason: ${item.reason || 'Customer Return'}`,
        },
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { status: 'returned' },
    });
  });

  revalidatePath('/pharmacy/sales');
  revalidatePath('/pharmacy/returns');
  revalidatePath('/pharmacy/medicines');
  return { success: true };
}
