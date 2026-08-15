'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUserRole } from '@/lib/auth-utils'

export interface SystemNotificationItem {
  id: string
  title: string
  message: string
  type: 'expired' | 'expiring_soon' | 'low_stock' | 'info' | 'warning' | 'error'
  severity: 'error' | 'warning' | 'info'
  href?: string
  createdAt: string
  isRead?: boolean
}

export interface NotificationFeedResponse {
  unreadCount: number
  notifications: SystemNotificationItem[]
}

export async function getSystemNotifications(): Promise<NotificationFeedResponse> {
  await getCurrentUserRole()

  const now = new Date()
  const ninetyDaysFromNow = new Date()
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)

  const items: SystemNotificationItem[] = []

  try {
    // 1. Fetch DB notifications
    const dbNotifications = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    for (const n of dbNotifications) {
      items.push({
        id: n.id,
        title: n.title,
        message: n.message,
        type: (n.type as any) || 'info',
        severity: n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info',
        createdAt: n.createdAt.toISOString(),
        isRead: n.isRead,
      })
    }

    // 2. Fetch Expired & Expiring Soon Batches with remaining stock
    const activeBatches = await prisma.batch.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: { lte: ninetyDaysFromNow },
      },
      include: {
        medicine: {
          select: { name: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
      take: 15,
    })

    for (const b of activeBatches) {
      const exp = new Date(b.expiryDate)
      const diffMs = exp.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays <= 0) {
        items.push({
          id: `batch-expired-${b.id}`,
          title: `Expired Batch: ${b.medicine.name}`,
          message: `Batch #${b.batchNo} expired ${Math.abs(diffDays)} days ago with ${b.quantityRemaining} units remaining. Quarantine immediately.`,
          type: 'expired',
          severity: 'error',
          href: '/pharmacy/expiry-report',
          createdAt: b.expiryDate.toISOString(),
        })
      } else {
        items.push({
          id: `batch-expiring-${b.id}`,
          title: `Expiring Soon: ${b.medicine.name}`,
          message: `Batch #${b.batchNo} (${b.quantityRemaining} units) expires in ${diffDays} days on ${exp.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
          type: 'expiring_soon',
          severity: 'warning',
          href: '/pharmacy/expiry-report',
          createdAt: b.updatedAt ? b.updatedAt.toISOString() : now.toISOString(),
        })
      }
    }

    // 3. Fetch Low Stock / Out of Stock Medicines
    const lowStockMedicines = await prisma.medicine.findMany({
      where: {
        reorderLevel: { gt: 0 },
      },
      include: {
        batches: {
          select: { quantityRemaining: true },
        },
      },
      take: 20,
    })

    for (const med of lowStockMedicines) {
      const totalStock = med.batches.reduce((sum, b) => sum + (b.quantityRemaining || 0), 0)
      if (totalStock <= med.reorderLevel) {
        items.push({
          id: `stock-low-${med.id}`,
          title: totalStock === 0 ? `Out of Stock: ${med.name}` : `Low Stock: ${med.name}`,
          message: totalStock === 0 
            ? `Stock is completely depleted (0 units). Reorder level is ${med.reorderLevel}.`
            : `Current stock (${totalStock} units) has reached reorder threshold of ${med.reorderLevel}.`,
          type: 'low_stock',
          severity: totalStock === 0 ? 'error' : 'warning',
          href: '/pharmacy/medicines',
          createdAt: med.updatedAt ? med.updatedAt.toISOString() : now.toISOString(),
        })
      }
    }
  } catch (error) {
    console.error('[getSystemNotifications] Error:', error)
  }

  // Sort by severity (error -> warning -> info) then date
  const severityWeight = { error: 3, warning: 2, info: 1 }
  items.sort((a, b) => {
    const weightDiff = severityWeight[b.severity] - severityWeight[a.severity]
    if (weightDiff !== 0) return weightDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return {
    unreadCount: items.length,
    notifications: items,
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    if (!id.startsWith('batch-') && !id.startsWith('stock-')) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      })
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function markAllNotificationsAsRead() {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
