'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'
import { generateSaleNo, generateInvoiceNo } from '@/lib/id-generator'

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
  
  // Call atomic PostgreSQL function with row-level stock check (FOR UPDATE)
  const { data: result, error: rpcError } = await supabase.rpc('create_sale_with_stock_check', {
    sale_data: {
      saleNo: data.saleNo,
      patientId: data.patientId || null,
      totalAmount: data.totalAmount,
      status: data.status || 'completed',
      items: (data.items || []).map((item: any) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        outPrice: item.outPrice,
        total: Number(item.quantity) * Number(item.outPrice)
      }))
    }
  });

  if (rpcError) {
    console.error('RPC Error in create_sale_with_stock_check:', rpcError)
    throw new Error(rpcError.message || 'Failed to create sale')
  }

  if (!result || !result.success) {
    throw new Error(result?.error || 'Failed to create sale')
  }

  const sale = {
    id: result.id,
    saleNo: result.saleNo,
    patientId: data.patientId || null,
    totalAmount: data.totalAmount,
    status: data.status || 'completed'
  };

  if (data.items && data.items.length > 0) {

    // Link Pharmacy Sales to the main Billing/Invoice system
    // Generate Invoice Number atomically via sequence
    const invoiceNo = await generateInvoiceNo();

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
