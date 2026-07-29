'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole, hasAccess } from '@/lib/auth-utils'

export async function getExpiringItems() {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'pharmacy', 'read')) {
    throw new Error('Unauthorized to view expiry report');
  }

  const supabase = await createClient()

  // Get items expiring in the next 30 days or already expired
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const { data, error } = await supabase
    .from('PurchaseItem')
    .select(`
      id,
      batchNo,
      expiryDate,
      quantity,
      Medicine (
        id,
        name,
        unit
      ),
      Purchase (
        purchaseNo,
        createdAt
      )
    `)
    .not('expiryDate', 'is', null)
    .lte('expiryDate', thirtyDaysFromNow.toISOString())
    .order('expiryDate', { ascending: true })

  if (error) {
    console.error('Error fetching expiring items:', error)
    return []
  }

  return data || []
}
