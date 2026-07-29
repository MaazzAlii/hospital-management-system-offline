'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export async function getSales() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Sale')
    .select(`
      *,
      Patient:patientId (*)
    `)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('Error fetching sales:', error)
    throw new Error('Failed to fetch sales')
  }

  return data
}

export async function createSale(data: any) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'pharmacy', 'write')) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient()
  
  // Verify stock before proceeding
  const { data: movements, error: movError } = await supabase
    .from("StockMovement")
    .select("medicineId, quantity");

  if (movError) throw new Error("Failed to check stock");

  const stockMap: Record<string, number> = {};
  if (movements) {
    movements.forEach((m: any) => {
      stockMap[m.medicineId] = (stockMap[m.medicineId] || 0) + Number(m.quantity);
    });
  }

  for (const item of data.items) {
    const currentStock = stockMap[item.medicineId] || 0;
    if (item.quantity > currentStock) {
      throw new Error(`Quantity for medicine ID ${item.medicineId} exceeds available stock (${currentStock}).`);
    }
  }

  // Create Sale
  const { data: sale, error: saleError } = await supabase
    .from('Sale')
    .insert({
      saleNo: data.saleNo || `SALE-${Date.now()}`,
      patientId: data.patientId || null,
      totalAmount: data.totalAmount,
      status: data.status || 'completed'
    })
    .select()
    .single()

  if (saleError) {
    console.error('Error creating sale:', saleError)
    throw new Error('Failed to create sale')
  }

  if (data.items && data.items.length > 0) {
    // Create SaleItems
    const itemsToInsert = data.items.map((item: any) => ({
      saleId: sale.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      outPrice: item.outPrice,
      total: Number(item.quantity) * Number(item.outPrice)
    }))

    const { error: itemsError } = await supabase
      .from('SaleItem')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating sale items:', itemsError)
      throw new Error('Failed to create sale items')
    }

    // Create StockMovements
    const movementsToInsert = data.items.map((item: any) => ({
      medicineId: item.medicineId,
      type: 'sale',
      quantity: -Math.abs(item.quantity), // Negative for sales
      referenceId: sale.id,
      notes: `Sale ${sale.saleNo}`
    }))

    const { error: movementsError } = await supabase
      .from('StockMovement')
      .insert(movementsToInsert)

    if (movementsError) {
      console.error('Error creating stock movements:', movementsError)
      throw new Error('Failed to create stock movements')
    }

    // Link Pharmacy Sales to the main Billing/Invoice system
    // Generate Invoice Number (e.g., LCC-0001 pattern if we want, or use saleNo)
    const { data: lastInvoices } = await supabase
      .from("Invoice")
      .select("invoiceNo")
      .order("createdAt", { ascending: false })
      .limit(1);

    let seq = 1;
    if (lastInvoices && lastInvoices.length > 0) {
      const parts = lastInvoices[0].invoiceNo.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const invoiceNo = `LCC-${String(seq).padStart(4, "0")}`;

    let finalPatientId = data.patientId;
    if (!finalPatientId) {
      const { data: walkin } = await supabase.from('Patient').select('id').eq('name', 'Walk-in Patient').limit(1).maybeSingle();
      if (walkin) {
        finalPatientId = walkin.id;
      } else {
        const { data: newWalkin } = await supabase.from('Patient').insert({
          mrn: 'WALKIN-' + Date.now().toString().slice(-4),
          name: 'Walk-in Patient'
        }).select('id').single();
        if (newWalkin) finalPatientId = newWalkin.id;
      }
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("Invoice")
      .insert({
        invoiceNo,
        sourceType: 'Pharmacy',
        sourceId: sale.id,
        patientId: finalPatientId,
        subtotal: data.totalAmount,
        aoDiscountPct: 0,
        discountAmt: 0,
        total: data.totalAmount,
        status: data.status || 'completed',
        notes: `Pharmacy Sale: ${sale.saleNo}`
      })
      .select()
      .single()

    if (!invoiceError && invoice) {
      // Fetch Medicine names for descriptions
      const medicineIds = data.items.map((item: any) => item.medicineId);
      const { data: medicines } = await supabase
        .from("Medicine")
        .select("id, name")
        .in("id", medicineIds);
        
      const medicineNameMap = new Map();
      if (medicines) {
        medicines.forEach((m: any) => medicineNameMap.set(m.id, m.name));
      }

      // Add items to InvoiceItem
      const invoiceItems = data.items.map((item: any) => {
        const medicineName = medicineNameMap.get(item.medicineId) || item.medicineId;
        return {
          invoiceId: invoice.id,
          description: medicineName,
          quantity: item.quantity,
          unitPrice: item.outPrice,
          total: Number(item.quantity) * Number(item.outPrice),
        }
      })
      
      await supabase.from("InvoiceItem").insert(invoiceItems)
    } else {
       console.error("Failed to create billing invoice for sale:", invoiceError)
       throw new Error(`Failed to create billing invoice: ${invoiceError?.message}`)
    }
  }

  revalidatePath('/pharmacy/sales')
  revalidatePath('/pharmacy/medicines')
  revalidatePath('/billing')
  return sale
}
