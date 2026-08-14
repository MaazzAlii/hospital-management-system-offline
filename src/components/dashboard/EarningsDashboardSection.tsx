'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, ShoppingBag, Receipt, Calendar, Loader2, TrendingUp, Filter } from 'lucide-react'
import { getEarningsData, EarningsData, EarningsFilterType } from '@/app/actions/earnings'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export function EarningsDashboardSection({ initialData }: { initialData: EarningsData }) {
  const [filterType, setFilterType] = useState<EarningsFilterType>('monthly')
  const [dateParam, setDateParam] = useState(() => new Date().toISOString().split('T')[0])
  const [monthParam, setMonthParam] = useState<number>(() => new Date().getMonth() + 1)
  const [yearParam, setYearParam] = useState<number>(() => new Date().getFullYear())

  const [data, setData] = useState<EarningsData>(initialData)
  const [isPending, startTransition] = useTransition()

  const loadData = () => {
    startTransition(async () => {
      try {
        const result = await getEarningsData(filterType, dateParam, monthParam, yearParam)
        setData(result)
      } catch (err) {
        console.error('Failed to load earnings data:', err)
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [filterType, dateParam, monthParam, yearParam])

  return (
    <Card className="rounded-xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Earnings & Revenue Analytics
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Financial summary across Pharmacy Sales and Clinic Services for{' '}
              <span className="font-semibold text-foreground">{data.periodLabel}</span>
            </p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
              {(['daily', 'weekly', 'monthly', 'yearly'] as EarningsFilterType[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterType(tab)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-all capitalize ${
                    filterType === tab
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date / Month / Year Selectors */}
        <div className="mt-3 flex flex-wrap items-center gap-3 pt-2">
          {filterType === 'daily' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Select Day:</span>
              <Input
                type="date"
                value={dateParam}
                onChange={(e) => setDateParam(e.target.value)}
                className="h-8 text-xs w-40"
              />
            </div>
          )}

          {filterType === 'weekly' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Select Week Containing:</span>
              <Input
                type="date"
                value={dateParam}
                onChange={(e) => setDateParam(e.target.value)}
                className="h-8 text-xs w-40"
              />
            </div>
          )}

          {filterType === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Select Month & Year:</span>
              <Select
                value={String(monthParam)}
                onValueChange={(val) => setMonthParam(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="2020"
                max="2035"
                value={yearParam}
                onChange={(e) => setYearParam(Number(e.target.value))}
                className="h-8 text-xs w-24"
              />
            </div>
          )}

          {filterType === 'yearly' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Select Year:</span>
              <Input
                type="number"
                min="2020"
                max="2035"
                value={yearParam}
                onChange={(e) => setYearParam(Number(e.target.value))}
                className="h-8 text-xs w-28"
              />
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Calculating...
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Net Revenue */}
          <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Total Revenue
              </span>
              <div className="rounded-lg p-2 bg-primary/20 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                ₨ {data.totalRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {data.periodLabel} (Pharmacy + Clinic)
              </p>
            </div>
          </div>

          {/* Pharmacy Revenue */}
          <div className="rounded-xl border bg-card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pharmacy Sales
              </span>
              <div className="rounded-lg p-2 bg-blue-500/10 text-blue-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
                ₨ {data.pharmacyRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {data.totalSalesCount} completed sale{data.totalSalesCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Clinic Revenue */}
          <div className="rounded-xl border bg-card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinic Invoices
              </span>
              <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                ₨ {data.clinicRevenue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {data.totalInvoicesCount} paid/partial invoice{data.totalInvoicesCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
