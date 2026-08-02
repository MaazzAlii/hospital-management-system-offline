"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";

export async function getExpiringItems() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized to view expiry report');
    }

    // Get items expiring in the next 30 days or already expired
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const items = await prisma.purchaseItem.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        purchase: {
          select: {
            purchaseNo: true,
            createdAt: true,
          },
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    return items;
  } catch (error) {
    console.error("Error fetching expiring items:", error);
    return [];
  }
}
