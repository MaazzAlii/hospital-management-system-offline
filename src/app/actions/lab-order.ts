'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from '@/lib/auth-utils'
import { generateLabOrderNo, generateInvoiceNo } from '@/lib/id-generator'

export async function getLabOrders(query?: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'lab', 'read')) {
      throw new Error('Unauthorized to view lab orders');
    }

    let whereClause: any = {};
    if (role?.toLowerCase() === 'doctor') {
      const currentDoctorId = await getCurrentDoctorId();
      if (currentDoctorId) {
        whereClause.doctorId = currentDoctorId;
      } else {
        return [];
      }
    }

    if (query) {
      whereClause.OR = [
        { orderNo: { contains: query } },
        { patient: { name: { contains: query } } },
      ];
    }

    return await prisma.labOrder.findMany({
      where: whereClause,
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
          },
        },
        items: {
          include: {
            test: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return [];
  }
}

export async function createLabOrder(data: {
  patientId: string;
  doctorId?: string;
  notes?: string;
  tests: { testId: string; price: number }[];
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  let doctorId = data.doctorId;
  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (!currentDoctorId) {
      throw new Error('Doctor profile not found');
    }
    doctorId = currentDoctorId;
  }

  const totalAmount = data.tests.reduce((sum, t) => sum + Number(t.price), 0);

  const order = await prisma.$transaction(async (tx) => {
    const orderNo = await generateLabOrderNo(tx);

    const createdOrder = await tx.labOrder.create({
      data: {
        orderNo,
        patientId: data.patientId,
        doctorId: doctorId || null,
        totalAmount,
        status: 'pending',
        notes: data.notes || null,
        items: {
          create: data.tests.map((t) => ({
            testId: t.testId,
            price: t.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    const invoiceNo = await generateInvoiceNo(tx);
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo,
        sourceType: 'Lab',
        sourceId: createdOrder.id,
        patientId: data.patientId,
        subtotal: totalAmount,
        total: totalAmount,
        status: 'unpaid',
        notes: `Lab Order: ${createdOrder.orderNo}`,
      },
    });

    if (data.tests.length > 0) {
      const testIds = data.tests.map((t) => t.testId);
      const tests = await tx.labTest.findMany({
        where: { id: { in: testIds } },
        select: { id: true, name: true },
      });
      const testNameMap = new Map(tests.map((t) => [t.id, t.name]));

      for (const item of data.tests) {
        const testName = testNameMap.get(item.testId) || 'Lab Test';
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: `Lab Test: ${testName}`,
            quantity: 1,
            unitPrice: item.price,
            amount: item.price,
          },
        });
      }
    }

    return createdOrder;
  });

  revalidatePath('/lab/orders');
  revalidatePath('/lab-orders');
  revalidatePath('/billing');
  return order;
}
