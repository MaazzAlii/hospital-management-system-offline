'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export async function getLabTests(query?: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'lab', 'read')) {
      throw new Error('Unauthorized to view lab tests');
    }

    let whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { code: { contains: query } },
        { category: { name: { contains: query } } },
      ];
    }

    return await prisma.labTest.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    return [];
  }
}

export async function getLabCategories() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'lab', 'read')) {
      throw new Error('Unauthorized to view lab categories');
    }

    return await prisma.labCategory.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching lab categories:', error);
    return [];
  }
}

export async function createLabCategory(name: string) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const category = await prisma.labCategory.create({
    data: { name },
  });
  return category;
}

export async function createLabTest(data: {
  name: string;
  categoryId?: string;
  code: string;
  price: number;
  sampleType?: string;
  description?: string;
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const test = await prisma.labTest.create({
    data: {
      name: data.name,
      categoryId: data.categoryId || null,
      code: data.code,
      price: data.price,
      sampleType: data.sampleType || null,
      description: data.description || null,
    },
  });

  revalidatePath('/lab/tests');
  revalidatePath('/lab-tests');
  return test;
}
