'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSaleBySaleNo(saleNo: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('Sale')
    .select(`
      *,
      Patient:patientId (*),
      SaleItem (
        *,
        Medicine:medicineId (*)
      )
    `)
    .eq('saleNo', saleNo)
    .single()

  if (error) {
    console.error('Error fetching sale:', error)
    return null
  }

  return data
}

export async function processReturn(saleId: string, itemsToReturn: any[]) {
  const supabase = await createClient()

  // Verify the sale exists
  const { data: sale, error: saleError } = await supabase
    .from('Sale')
    .select('saleNo')
    .eq('id', saleId)
    .single()

  if (saleError || !sale) {
    throw new Error('Sale not found')
  }

  // Filter out items with 0 return quantity
  const validItems = itemsToReturn.filter(item => item.returnQuantity > 0)
  
  if (validItems.length === 0) {
    throw new Error('No items to return')
  }

  // Create StockMovements for each returned item
  const movementsToInsert = validItems.map(item => ({
    medicineId: item.medicineId,
    type: 'return',
    quantity: item.returnQuantity, // Positive for returns (stock goes back in)
    referenceId: saleId,
    notes: `Return against Sale ${sale.saleNo} - Reason: ${item.reason || 'N/A'}`
  }))

  const { error: movementsError } = await supabase
    .from('StockMovement')
    .insert(movementsToInsert)

  if (movementsError) {
    console.error('Error creating stock movements for return:', movementsError)
    throw new Error('Failed to process return stock movements')
  }

  // Update sale status to 'returned' or 'partially_returned' (optional depending on requirement, let's say 'returned' for simplicity if we return anything, or leave it)
  await supabase
    .from('Sale')
    .update({ status: 'returned' })
    .eq('id', saleId)

  revalidatePath('/pharmacy/sales')
  revalidatePath('/pharmacy/medicines')
  return { success: true }
}
