"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils";
import { generateInvoiceNo } from "@/lib/id-generator";

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export async function createInvoice(data: {
  patientId: string;
  sourceType: string;
  sourceId?: string;
  items: InvoiceItemInput[];
  discountPct?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'billing', 'write')) {
      throw new Error("Unauthorized to create invoices");
    }

    if (data.discountPct && data.discountPct > 0 && !hasAccess(role, 'billing', 'apply_discount')) {
      throw new Error("Unauthorized to apply AO discount");
    }

    // Auto-generate invoice number atomically via SQLite counter transaction
    const invoiceNo = await generateInvoiceNo();

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountPct = data.discountPct ?? 0;
    const discountAmt = (subtotal * discountPct) / 100;
    const total = subtotal - discountAmt;
    const status = data.paymentMethod ? "paid" : "unpaid";

    // Use Prisma transaction for atomic invoice, items, and payment creation
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          sourceType: data.sourceType,
          sourceId: data.sourceId || invoiceNo,
          patientId: data.patientId,
          subtotal,
          aoDiscountPct: discountPct,
          discountAmt,
          total,
          status,
          paymentMethod: data.paymentMethod || null,
          paidAt: data.paymentMethod ? new Date() : null,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
          payments: data.paymentMethod
            ? {
                create: {
                  amount: total,
                  method: data.paymentMethod,
                  note: "Paid at time of invoice creation",
                },
              }
            : undefined,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      return inv;
    });

    revalidatePath("/billing");
    revalidatePath("/dashboard");
    if (data.patientId) revalidatePath(`/patients/${data.patientId}`);
    return { success: true, invoice };
  } catch (error: unknown) {
    console.error("Failed to create invoice:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to create invoice" };
  }
}

export async function getInvoices(query?: string) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'billing', 'read')) {
    throw new Error('Unauthorized to view invoices');
  }

  let whereClause: any = {};
  if (query) {
    whereClause.OR = [
      { invoiceNo: { contains: query } },
      { patient: { name: { contains: query } } },
      { patient: { mrn: { contains: query } } },
    ];
  }

  return await prisma.invoice.findMany({
    where: whereClause,
    include: {
      patient: true,
      items: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(id: string) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'billing', 'read')) {
    throw new Error('Unauthorized to view invoices');
  }

  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: true,
      items: true,
      payments: true,
    },
  });
}

export async function markInvoicePaid(id: string, method: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'billing', 'write')) {
      throw new Error("Unauthorized to mark invoices as paid");
    }

    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { total: true },
    });
    if (!inv) return { success: false, error: "Invoice not found" };

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          status: "paid",
          paymentMethod: method,
          paidAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          invoiceId: id,
          amount: inv.total,
          method,
          note: "Marked as paid",
        },
      });
    });

    revalidatePath("/billing");
    revalidatePath(`/billing/${id}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to mark as paid" };
  }
}

export async function getClinicSettings() {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }
  return settings;
}

export async function updateClinicSettings(data: {
  clinicName: string;
  phone: string;
  email: string;
  address: string;
  invoicePrefix: string;
  currency: string;
}) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'settings', 'write')) {
      throw new Error("Unauthorized to update settings");
    }

    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({
        data,
      });
    }
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to save settings" };
  }
}
