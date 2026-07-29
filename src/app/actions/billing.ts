"use server";
import { createClient } from "@/lib/supabase/server";
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

    const supabase = await createClient();

    // Auto-generate invoice number atomically via sequence
    const invoiceNo = await generateInvoiceNo();

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountPct = data.discountPct ?? 0;
    const discountAmt = (subtotal * discountPct) / 100;
    const total = subtotal - discountAmt;
    const status = data.paymentMethod ? "paid" : "unpaid";

    // 1. Create Invoice
    const { data: invoice, error: invoiceError } = await supabase.from("Invoice").insert({
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
      paidAt: data.paymentMethod ? new Date().toISOString() : null,
      notes: data.notes || null,
    }).select().single();

    if (invoiceError) throw new Error(invoiceError.message);

    // 2. Create Items
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));
      const { error: itemsError } = await supabase.from("InvoiceItem").insert(itemsToInsert);
      if (itemsError) throw new Error(itemsError.message);
    }

    // 3. Create Payment
    if (data.paymentMethod) {
      const { error: paymentError } = await supabase.from("Payment").insert({
        invoiceId: invoice.id,
        amount: total,
        method: data.paymentMethod,
        note: "Paid at time of invoice creation",
      });
      if (paymentError) throw new Error(paymentError.message);
    }

    revalidatePath("/billing");
    return { success: true, invoice };
  } catch (error: unknown) {
    console.error("Failed to create invoice:", error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to create invoice" };
  }
}

export async function getInvoices(query?: string) {
  const supabase = await createClient();
  const { data: rawInvoices } = await supabase
    .from("Invoice")
    .select(`
      *,
      Patient ( id, name, mrn ),
      items:InvoiceItem (*),
      payments:Payment (*)
    `)
    .order("createdAt", { ascending: false });

  let invoices = (rawInvoices || []).map((i: any) => ({
    ...i,
    patient: Array.isArray(i.Patient) ? i.Patient[0] : i.Patient,
  }));

  if (query) {
    const q = query.toLowerCase();
    invoices = invoices.filter(i => 
      (i.invoiceNo || "").toLowerCase().includes(q) ||
      (i.patient?.name || "").toLowerCase().includes(q) ||
      (i.patient?.mrn || "").toLowerCase().includes(q)
    );
  }
  return invoices;
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient();
  
  // 1. Fetch the base invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("Invoice")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) return null;

  // 2. Fetch the Patient
  if (invoice.patientId) {
    const { data: patient } = await supabase
      .from("Patient")
      .select("*")
      .eq("id", invoice.patientId)
      .single();
    invoice.Patient = patient;
    invoice.patient = patient;
  }

  // 3. Fetch the InvoiceItems
  const { data: items } = await supabase
    .from("InvoiceItem")
    .select("*")
    .eq("invoiceId", id);
  invoice.items = items || [];

  // 4. Fetch the Payments
  const { data: payments } = await supabase
    .from("Payment")
    .select("*")
    .eq("invoiceId", id);
  invoice.payments = payments || [];

  return invoice;
}

export async function markInvoicePaid(id: string, method: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'billing', 'write')) {
      throw new Error("Unauthorized to mark invoices as paid");
    }

    const supabase = await createClient();
    const { data: inv } = await supabase.from("Invoice").select("total").eq("id", id).single();
    if (!inv) return { success: false, error: "Invoice not found" };

    const { error: invoiceError } = await supabase.from("Invoice").update({
      status: "paid",
      paymentMethod: method,
      paidAt: new Date().toISOString()
    }).eq("id", id);
    if (invoiceError) throw new Error(invoiceError.message);

    const { error: paymentError } = await supabase.from("Payment").insert({
      invoiceId: id,
      amount: inv.total,
      method,
      note: "Marked as paid",
    });
    if (paymentError) throw new Error(paymentError.message);

    revalidatePath("/billing");
    revalidatePath(`/billing/${id}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to mark as paid" };
  }
}

export async function getClinicSettings() {
  const supabase = await createClient();
  let { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();
  if (!settings) {
    const { data: newSettings } = await supabase.from("Settings").insert({}).select().single();
    settings = newSettings;
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

    const supabase = await createClient();
    let { data: settings } = await supabase.from("Settings").select("id").limit(1).maybeSingle();
    
    if (settings) {
      const { data: updated, error } = await supabase.from("Settings").update(data).eq("id", settings.id).select().single();
      if (error) throw new Error(error.message);
      settings = updated;
    } else {
      const { data: created, error } = await supabase.from("Settings").insert(data).select().single();
      if (error) throw new Error(error.message);
      settings = created;
    }
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to save settings" };
  }
}
