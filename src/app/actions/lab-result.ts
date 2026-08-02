'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from "@/lib/auth-utils"
import { generateSampleNo } from "@/lib/id-generator"

export async function getLabOrderDetails(id: string) {
  const { role } = await getCurrentUserRole();

  const order = await prisma.labOrder.findUnique({
    where: { id },
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
      samples: true,
      results: {
        include: {
          test: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (order.doctorId && order.doctorId !== currentDoctorId) {
      throw new Error('Unauthorized: Doctor can only access their own lab order details');
    }
  }

  return order;
}

export async function collectSample(labOrderId: string, sampleType: string) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const sampleNo = await generateSampleNo();

  const sample = await prisma.sample.create({
    data: {
      sampleNo,
      labOrderId,
      sampleType,
      collectedAt: new Date(),
      status: 'collected',
    },
  });

  revalidatePath(`/lab/orders/${labOrderId}`);
  return sample;
}

export async function saveResult(data: {
  labOrderItemId?: string;
  sampleId?: string;
  resultValue: string;
  unit?: string;
  testId: string;
  parameterName?: string;
  patientGender?: string;
  patientDob?: string;
  labOrderId: string;
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const parameterName = data.parameterName || "Result";

  const existing = await prisma.labResult.findFirst({
    where: {
      labOrderId: data.labOrderId,
      testId: data.testId,
    },
  });

  if (existing) {
    await prisma.labResult.update({
      where: { id: existing.id },
      data: {
        resultValue: data.resultValue,
        unit: data.unit || null,
        parameterName,
        status: 'final',
      },
    });
  } else {
    await prisma.labResult.create({
      data: {
        labOrderId: data.labOrderId,
        testId: data.testId,
        parameterName,
        resultValue: data.resultValue,
        unit: data.unit || null,
        status: 'final',
      },
    });
  }

  await prisma.labOrder.update({
    where: { id: data.labOrderId },
    data: { status: 'completed' },
  });

  revalidatePath(`/lab/orders/${data.labOrderId}`);
  return { success: true };
}

export async function verifyResult(resultId: string, labOrderId: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'lab', 'verify_lab')) {
      throw new Error("Unauthorized to verify lab results");
    }

    await prisma.labResult.update({
      where: { id: resultId },
      data: {
        status: 'verified',
      },
    });

    revalidatePath(`/lab/orders/${labOrderId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to verify result" };
  }
}
