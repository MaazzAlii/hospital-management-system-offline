'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUserRole } from '@/lib/auth-utils'

export type EarningsFilterType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface EarningsData {
  periodLabel: string
  startDate: string
  endDate: string
  totalRevenue: number
  pharmacyRevenue: number
  clinicRevenue: number
  totalSalesCount: number
  totalInvoicesCount: number
  dailyBreakdown?: { date: string; label: string; pharmacy: number; clinic: number; total: number }[]
}

export async function getEarningsData(
  filterType: EarningsFilterType = 'monthly',
  dateParam?: string, // 'YYYY-MM-DD'
  monthParam?: number, // 1-12
  yearParam?: number
): Promise<EarningsData> {
  await getCurrentUserRole()

  const now = new Date()
  const year = yearParam || now.getFullYear()
  const month = monthParam !== undefined ? monthParam : now.getMonth() + 1 // 1-indexed

  let start: Date
  let end: Date
  let periodLabel = ''

  if (filterType === 'daily') {
    const selectedDate = dateParam ? new Date(dateParam) : now
    start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999)
    periodLabel = start.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } else if (filterType === 'weekly') {
    // Week starting Monday (ISO convention standard in Pakistan healthcare/business)
    const baseDate = dateParam ? new Date(dateParam) : now
    const dayOfWeek = baseDate.getDay() // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + diffToMonday, 0, 0, 0, 0)
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)

    const startStr = start.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })
    periodLabel = `Week (${startStr} – ${endStr})`
  } else if (filterType === 'yearly') {
    start = new Date(year, 0, 1, 0, 0, 0, 0)
    end = new Date(year, 11, 31, 23, 59, 59, 999)
    periodLabel = `Year ${year}`
  } else {
    // Default Monthly
    start = new Date(year, month - 1, 1, 0, 0, 0, 0)
    end = new Date(year, month, 0, 23, 59, 59, 999)
    const monthName = start.toLocaleDateString('en-PK', { month: 'long' })
    periodLabel = `${monthName} ${year}`
  }

  // 1. Query Pharmacy Sales
  const sales = await prisma.sale.findMany({
    where: {
      status: 'completed',
      saleDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      totalAmount: true,
      saleDate: true,
    },
  })

  // 2. Query Clinic Invoices (paid and partial)
  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ['paid', 'partial'],
      },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
    },
  })

  const pharmacyRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const clinicRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalRevenue = pharmacyRevenue + clinicRevenue

  return {
    periodLabel,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    totalRevenue,
    pharmacyRevenue,
    clinicRevenue,
    totalSalesCount: sales.length,
    totalInvoicesCount: invoices.length,
  }
}
