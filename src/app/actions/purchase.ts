'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPurchases() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Purchase')
    .select(`
      *,
      Supplier (*)
    `)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('Error fetching purchases:', error)
    throw new Error('Failed to fetch purchases')
  }

  return data
}

export async function createPurchase(data: any) {
  const supabase = await createClient()
  // Create Purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('Purchase')
    .insert({
      purchaseNo: data.purchaseNo || `PUR-${Date.now()}`,
      supplierId: data.supplierId,
      totalAmount: data.totalAmount,
      status: data.status || 'completed',
      notes: data.notes
    })
    .select()
    .single()

  if (purchaseError) {
    console.error('Error creating purchase:', purchaseError)
    throw new Error('Failed to create purchase')
  }

  if (data.items && data.items.length > 0) {
    // Create PurchaseItems
    const itemsToInsert = data.items.map((item: any) => ({
      purchaseId: purchase.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      inPrice: item.inPrice,
      batchNo: item.batchNo || null,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null
    }))

    const { error: itemsError } = await supabase
      .from('PurchaseItem')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating purchase items:', itemsError)
      throw new Error('Failed to create purchase items')
    }

    // Create StockMovements
    const movementsToInsert = data.items.map((item: any) => ({
      medicineId: item.medicineId,
      type: 'purchase',
      quantity: item.quantity, // Positive for purchases
      referenceId: purchase.id,
      notes: `Purchase ${purchase.purchaseNo}`
    }))

    const { error: movementsError } = await supabase
      .from('StockMovement')
      .insert(movementsToInsert)

    if (movementsError) {
      console.error('Error creating stock movements:', movementsError)
      throw new Error('Failed to create stock movements')
    }
  }

  revalidatePath('/pharmacy/purchases')
  revalidatePath('/pharmacy/medicines')
  return purchase
}
