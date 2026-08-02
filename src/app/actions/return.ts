'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export async function getSaleBySaleNo(saleNo: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { saleNo },
      include: {
        patient: true,
        items: {
          include: {
            medicine: true,
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

export async function processReturn(saleId: string, itemsToReturn: any[]) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'pharmacy', 'write')) {
    throw new Error('Unauthorized');
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { saleNo: true },
  });

  if (!sale) {
    throw new Error('Sale not found');
  }

  const validItems = itemsToReturn.filter((item) => item.returnQuantity > 0);

  if (validItems.length === 0) {
    throw new Error('No items to return');
  }

  await prisma.$transaction(async (tx) => {
    for (const item of validItems) {
      await tx.stockMovement.create({
        data: {
          medicineId: item.medicineId,
          type: 'return',
          quantity: Math.abs(item.returnQuantity),
          referenceType: 'Sale',
          referenceId: saleId,
          notes: `Return against Sale ${sale.saleNo} - Reason: ${item.reason || 'N/A'}`,
        },
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { status: 'returned' },
    });
  });

  revalidatePath('/pharmacy/sales');
  revalidatePath('/pharmacy/medicines');
  return { success: true };
}
