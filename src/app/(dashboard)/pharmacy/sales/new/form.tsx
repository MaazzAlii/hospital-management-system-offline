'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, ArrowLeft, AlertCircle, CheckCircle, Clock, FileText, ShoppingCart } from 'lucide-react'
import { createSale } from '@/app/actions/sale'
import Link from 'next/link'

type BatchOption = {
  id: string;
  batchNo: string;
  expiryDate: string | Date;
  quantityRemaining: number;
  expiryStatus: 'expired' | 'expiring_soon' | 'valid';
  isExpired: boolean;
}

type MedicineOption = {
  id: string;
  name: string;
  unit?: string;
  outPrice: number;
  inPrice?: number;
  currentStock: number;
  batches?: BatchOption[];
}

type InvoiceLineItem = {
  id: string;
  medicineId: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  expiryStatus: 'expired' | 'expiring_soon' | 'valid' | 'none';
  availableStock: number;
  quantity: number;
  freeQty: number;
  tradePrice: number;
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  sTax: number;
  gst: number;
  netAmount: number;
}

export function SaleForm({
  patients,
  medicines,
  settings,
}: {
  patients: any[];
  medicines: MedicineOption[];
  settings?: any;
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Header State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0])
  const [patientId, setPatientId] = useState('walk-in')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [ntn, setNtn] = useState('')
  const [summaryPrsNo, setSummaryPrsNo] = useState('')
  const [bookedBy, setBookedBy] = useState('')
  const [salesmanMobile, setSalesmanMobile] = useState('')
  const [suppliedBy, setSuppliedBy] = useState(settings?.clinicName || 'Life Care Pharmacy')
  const [territory, setTerritory] = useState('')
  const [remarks, setRemarks] = useState('')

  // Line items state
  const [items, setItems] = useState<InvoiceLineItem[]>([])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        medicineId: '',
        batchId: '',
        batchNo: '',
        expiryDate: '',
        expiryStatus: 'none',
        availableStock: 0,
        quantity: 1,
        freeQty: 0,
        tradePrice: 0,
        grossAmount: 0,
        discountPercent: 0,
        discountAmount: 0,
        sTax: 0,
        gst: 0,
        netAmount: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const recalculateItem = (item: InvoiceLineItem): InvoiceLineItem => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.tradePrice) || 0
    const gross = qty * price
    const discPct = Number(item.discountPercent) || 0
    const discAmt = Number(item.discountAmount) || (gross * discPct) / 100
    const sTax = Number(item.sTax) || 0
    const gst = Number(item.gst) || 0
    const net = Math.max(0, gross - discAmt + sTax + gst)

    return {
      ...item,
      grossAmount: gross,
      discountAmount: discAmt,
      netAmount: net,
    }
  }

  const handleMedicineChange = (id: string, medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId)
    const validBatches = (med?.batches || []).filter((b) => b.quantityRemaining > 0)
    const firstValidBatch = validBatches.find((b) => !b.isExpired) || validBatches[0]

    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated: InvoiceLineItem = {
            ...item,
            medicineId,
            tradePrice: med?.outPrice || 0,
            batchId: firstValidBatch?.id || '',
            batchNo: firstValidBatch?.batchNo || '',
            expiryDate: firstValidBatch ? new Date(firstValidBatch.expiryDate).toISOString().split('T')[0] : '',
            expiryStatus: firstValidBatch?.expiryStatus || 'none',
            availableStock: firstValidBatch?.quantityRemaining || med?.currentStock || 0,
            quantity: 1,
            freeQty: 0,
            discountPercent: 0,
            discountAmount: 0,
            sTax: 0,
            gst: 0,
            grossAmount: 0,
            netAmount: 0,
          }
          return recalculateItem(updated)
        }
        return item
      })
    )
  }

  const handleBatchChange = (id: string, batchId: string) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const med = medicines.find((m) => m.id === item.medicineId)
          const batch = med?.batches?.find((b) => b.id === batchId)

          const updated: InvoiceLineItem = {
            ...item,
            batchId,
            batchNo: batch?.batchNo || '',
            expiryDate: batch ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
            expiryStatus: batch?.expiryStatus || 'none',
            availableStock: batch?.quantityRemaining || 0,
          }
          return recalculateItem(updated)
        }
        return item
      })
    )
  }

  const updateItemField = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          let updated = { ...item, [field]: value }

          // Auto compute discount amount if percent changes
          if (field === 'discountPercent') {
            const gross = (Number(updated.quantity) || 0) * (Number(updated.tradePrice) || 0)
            updated.discountAmount = (gross * (Number(value) || 0)) / 100
          }

          return recalculateItem(updated)
        }
        return item
      })
    )
  }

  // Aggregate Totals
  const totals = useMemo(() => {
    let totalItemsCount = items.length
    let totalQty = 0
    let totalFreeQty = 0
    let totalGross = 0
    let totalDiscount = 0
    let totalSTax = 0
    let totalGst = 0
    let netInvoiceAmount = 0

    for (const it of items) {
      totalQty += Number(it.quantity) || 0
      totalFreeQty += Number(it.freeQty) || 0
      totalGross += Number(it.grossAmount) || 0
      totalDiscount += Number(it.discountAmount) || 0
      totalSTax += Number(it.sTax) || 0
      totalGst += Number(it.gst) || 0
      netInvoiceAmount += Number(it.netAmount) || 0
    }

    return {
      totalItemsCount,
      totalQty,
      totalFreeQty,
      totalGross,
      totalDiscount,
      totalSTax,
      totalGst,
      netInvoiceAmount,
    }
  }, [items])

  const handlePatientSelect = (val: string) => {
    setPatientId(val)
    if (val !== 'walk-in') {
      const p = patients.find((pat) => pat.id === val)
      if (p) {
        setCustomerName(p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim())
        setCustomerPhone(p.phone || '')
        setCustomerAddress(p.address || '')
      }
    } else {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (items.length === 0) {
      setError('Please add at least one line item to the invoice.')
      return
    }

    // Validation checks
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.medicineId) {
        setError(`Please select a medicine for item row ${i + 1}`)
        return
      }

      if (it.expiryStatus === 'expired') {
        setError(`Item ${i + 1} has EXPIRED (${it.batchNo} - ${it.expiryDate}). Expired medicines cannot be sold.`)
        return
      }

      const totalReq = (Number(it.quantity) || 0) + (Number(it.freeQty) || 0)
      if (totalReq <= 0) {
        setError(`Item row ${i + 1} must have a quantity greater than 0`)
        return
      }

      if (it.availableStock > 0 && totalReq > it.availableStock) {
        setError(
          `Requested total quantity (${totalReq}) for item ${i + 1} exceeds available batch stock (${it.availableStock})`
        )
        return
      }
    }

    setIsLoading(true)

    try {
      const payload = {
        saleDate,
        patientId: patientId === 'walk-in' ? undefined : patientId,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        accountCode: accountCode || undefined,
        licenseNo: licenseNo || undefined,
        ntn: ntn || undefined,
        summaryPrsNo: summaryPrsNo || undefined,
        bookedBy: bookedBy || undefined,
        salesmanMobile: salesmanMobile || undefined,
        suppliedBy: suppliedBy || undefined,
        territory: territory || undefined,
        totalAmount: totals.netInvoiceAmount,
        status: 'completed',
        items: items.map((it) => ({
          medicineId: it.medicineId,
          batchId: it.batchId || undefined,
          batchNo: it.batchNo || undefined,
          expiryDate: it.expiryDate || undefined,
          quantity: Number(it.quantity),
          freeQty: Number(it.freeQty || 0),
          tradePrice: Number(it.tradePrice),
          grossAmount: Number(it.grossAmount),
          discountPercent: Number(it.discountPercent || 0),
          discountAmount: Number(it.discountAmount || 0),
          sTax: Number(it.sTax || 0),
          gst: Number(it.gst || 0),
          netAmount: Number(it.netAmount),
        })),
      }

      const res = await createSale(payload)

      if (res && res.success && res.sale) {
        router.push(`/pharmacy/sales/${res.sale.id}`)
        router.refresh()
      } else {
        setError(res?.error || 'Failed to create sale invoice')
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create sale invoice')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-destructive/15 text-destructive p-4 rounded-lg text-sm border border-destructive/30">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Distributor Invoice Header Information */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Distributor Invoice Header & Customer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sale / Invoice Date */}
            <div className="space-y-1.5">
              <Label htmlFor="saleDate" className="text-xs font-medium text-muted-foreground">
                Invoice Date *
              </Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>

            {/* Patient / Customer Select */}
            <div className="space-y-1.5">
              <Label htmlFor="patientSelect" className="text-xs font-medium text-muted-foreground">
                Customer / Patient Profile
              </Label>
              <Select value={patientId} onValueChange={handlePatientSelect}>
                <SelectTrigger id="patientSelect">
                  <SelectValue placeholder="Select patient / customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in / Wholesale Customer</SelectItem>
                  {patients.map((p) => {
                    const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {name} {p.mrn ? `(${p.mrn})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Account Code */}
            <div className="space-y-1.5">
              <Label htmlFor="accountCode" className="text-xs font-medium text-muted-foreground">
                Account Code
              </Label>
              <Input
                id="accountCode"
                placeholder="e.g. ACC-2004"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
              />
            </div>

            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="customerName" className="text-xs font-medium text-muted-foreground">
                Customer Name
              </Label>
              <Input
                id="customerName"
                placeholder="Customer or Medical Store Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Customer Mobile */}
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone" className="text-xs font-medium text-muted-foreground">
                Contact / Mobile No
              </Label>
              <Input
                id="customerPhone"
                placeholder="e.g. 0300-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* License No */}
            <div className="space-y-1.5">
              <Label htmlFor="licenseNo" className="text-xs font-medium text-muted-foreground">
                Drug License No.
              </Label>
              <Input
                id="licenseNo"
                placeholder="e.g. 05-A/2024"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
              />
            </div>

            {/* NTN No */}
            <div className="space-y-1.5">
              <Label htmlFor="ntn" className="text-xs font-medium text-muted-foreground">
                NTN No.
              </Label>
              <Input
                id="ntn"
                placeholder="e.g. 1234567-8"
                value={ntn}
                onChange={(e) => setNtn(e.target.value)}
              />
            </div>

            {/* Summary / PRS No */}
            <div className="space-y-1.5">
              <Label htmlFor="summaryPrsNo" className="text-xs font-medium text-muted-foreground">
                Summary / PRS No.
              </Label>
              <Input
                id="summaryPrsNo"
                placeholder="e.g. PRS-0941"
                value={summaryPrsNo}
                onChange={(e) => setSummaryPrsNo(e.target.value)}
              />
            </div>

            {/* Booked By */}
            <div className="space-y-1.5">
              <Label htmlFor="bookedBy" className="text-xs font-medium text-muted-foreground">
                Booked By (Order Booker)
              </Label>
              <Input
                id="bookedBy"
                placeholder="e.g. Tariq Mehmood"
                value={bookedBy}
                onChange={(e) => setBookedBy(e.target.value)}
              />
            </div>

            {/* Salesman Mobile */}
            <div className="space-y-1.5">
              <Label htmlFor="salesmanMobile" className="text-xs font-medium text-muted-foreground">
                Salesman Mobile #
              </Label>
              <Input
                id="salesmanMobile"
                placeholder="e.g. 0321-7654321"
                value={salesmanMobile}
                onChange={(e) => setSalesmanMobile(e.target.value)}
              />
            </div>

            {/* Supplied By */}
            <div className="space-y-1.5">
              <Label htmlFor="suppliedBy" className="text-xs font-medium text-muted-foreground">
                Supplied By
              </Label>
              <Input
                id="suppliedBy"
                value={suppliedBy}
                onChange={(e) => setSuppliedBy(e.target.value)}
              />
            </div>

            {/* Territory */}
            <div className="space-y-1.5">
              <Label htmlFor="territory" className="text-xs font-medium text-muted-foreground">
                Territory / Area
              </Label>
              <Input
                id="territory"
                placeholder="e.g. Rawalpindi Central"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
              />
            </div>
          </div>

          {/* Customer Address */}
          <div className="space-y-1.5">
            <Label htmlFor="customerAddress" className="text-xs font-medium text-muted-foreground">
              Customer / Delivery Address
            </Label>
            <Input
              id="customerAddress"
              placeholder="Shop #, Plaza, Street, City"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Line Items Table (Distributor Product & Multi-Batch Details) */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Line Items (Products, Batches, Discounts & Taxes)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Batch stock is deducted automatically using FEFO order. Expired batches are blocked from sale.
            </p>
          </div>
          <Button type="button" onClick={addItem} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Product Row
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-sm">No items in the invoice</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click 'Add Product Row' to start building this distributor invoice.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
                <Plus className="h-4 w-4 mr-1" /> Add First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-y text-muted-foreground font-semibold">
                    <th className="p-3 min-w-[200px]">Product / Medicine</th>
                    <th className="p-3 min-w-[180px]">Batch & Expiry</th>
                    <th className="p-3 min-w-[70px]">Stock</th>
                    <th className="p-3 min-w-[80px]">Qty</th>
                    <th className="p-3 min-w-[80px]">Free</th>
                    <th className="p-3 min-w-[95px]">Trade Price</th>
                    <th className="p-3 min-w-[95px]">Gross (Rs)</th>
                    <th className="p-3 min-w-[75px]">Disc %</th>
                    <th className="p-3 min-w-[80px]">Disc (Rs)</th>
                    <th className="p-3 min-w-[75px]">STAX</th>
                    <th className="p-3 min-w-[75px]">GST</th>
                    <th className="p-3 min-w-[105px]">Net (Rs)</th>
                    <th className="p-3 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => {
                    const selectedMed = medicines.find((m) => m.id === item.medicineId)
                    const availableBatches = selectedMed?.batches || []
                    const isExceeding =
                      item.availableStock > 0 &&
                      (Number(item.quantity) || 0) + (Number(item.freeQty) || 0) > item.availableStock
                    const isExpired = item.expiryStatus === 'expired'

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isExpired ? 'bg-destructive/10' : isExceeding ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        {/* Medicine Selector */}
                        <td className="p-2.5">
                          <Select
                            value={item.medicineId}
                            onValueChange={(val) => handleMedicineChange(item.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select medicine..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {medicines.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Stock: {m.currentStock} {m.unit || ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Batch & Expiry Selector */}
                        <td className="p-2.5">
                          {availableBatches.length > 0 ? (
                            <div className="space-y-1">
                              <Select
                                value={item.batchId}
                                onValueChange={(val) => handleBatchChange(item.id, val)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select Batch..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableBatches.map((b) => {
                                    const expStr = new Date(b.expiryDate).toLocaleDateString()
                                    return (
                                      <SelectItem key={b.id} value={b.id} disabled={b.isExpired}>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono">{b.batchNo}</span>
                                          <span className="text-[10px] text-muted-foreground">
                                            (Exp: {expStr})
                                          </span>
                                          <span
                                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                              b.expiryStatus === 'expired'
                                                ? 'bg-destructive text-destructive-foreground'
                                                : b.expiryStatus === 'expiring_soon'
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-green-600 text-white'
                                            }`}
                                          >
                                            {b.expiryStatus === 'expired'
                                              ? 'Expired'
                                              : b.expiryStatus === 'expiring_soon'
                                              ? 'Soon'
                                              : 'Valid'}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>

                              {item.batchNo && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  {item.expiryStatus === 'expired' && (
                                    <span className="text-destructive font-semibold flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" /> Expired ({item.expiryDate})
                                    </span>
                                  )}
                                  {item.expiryStatus === 'expiring_soon' && (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> Expiring Soon ({item.expiryDate})
                                    </span>
                                  )}
                                  {item.expiryStatus === 'valid' && (
                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Valid ({item.expiryDate})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              {item.medicineId ? 'No active batch (Auto FEFO)' : 'Select medicine first'}
                            </span>
                          )}
                        </td>

                        {/* Available Stock */}
                        <td className="p-2.5 font-medium">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              item.availableStock <= 0
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {item.availableStock}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemField(item.id, 'quantity', Number(e.target.value))}
                            className={`h-8 text-xs ${isExceeding ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            disabled={isExpired}
                          />
                        </td>

                        {/* Free Qty */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            min="0"
                            value={item.freeQty}
                            onChange={(e) => updateItemField(item.id, 'freeQty', Number(e.target.value))}
                            className="h-8 text-xs"
                            disabled={isExpired}
                          />
                        </td>

                        {/* Trade Price */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.tradePrice}
                            onChange={(e) => updateItemField(item.id, 'tradePrice', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </td>

                        {/* Gross Amount */}
                        <td className="p-2.5 font-mono font-medium">
                          Rs {item.grossAmount.toFixed(2)}
                        </td>

                        {/* Discount % */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => updateItemField(item.id, 'discountPercent', Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </td>

                        {/* Discount Amount */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discountAmount}
                            onChange={(e) => updateItemField(item.id, 'discountAmount', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </td>

                        {/* S.Tax */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.sTax}
                            onChange={(e) => updateItemField(item.id, 'sTax', Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </td>

                        {/* GST */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.gst}
                            onChange={(e) => updateItemField(item.id, 'gst', Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </td>

                        {/* Net Amount */}
                        <td className="p-2.5 font-mono font-bold text-primary">
                          Rs {item.netAmount.toFixed(2)}
                        </td>

                        {/* Delete Action */}
                        <td className="p-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* 3. Invoice Summary & Remarks Footer */}
        <div className="p-6 bg-muted/20 border-t grid gap-6 md:grid-cols-12 items-start">
          <div className="md:col-span-6 space-y-2">
            <Label htmlFor="remarks" className="text-xs font-medium text-muted-foreground">
              Invoice Warranty & Remarks / Notes Block
            </Label>
            <textarea
              id="remarks"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Goods once sold are not returnable without original batch warranty. Storage under 25°C."
              className="w-full text-xs rounded-md border border-input bg-background p-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="md:col-span-6 bg-background p-4 rounded-lg border space-y-2.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>No. of Items:</span>
              <span className="font-semibold text-foreground">{totals.totalItemsCount}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Quantity (Billed + Free):</span>
              <span className="font-semibold text-foreground">
                {totals.totalQty} + {totals.totalFreeQty} Free
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Gross Amount:</span>
              <span className="font-mono text-foreground">Rs {totals.totalGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Discount Amount:</span>
              <span className="font-mono text-foreground">- Rs {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total S.Tax & GST:</span>
              <span className="font-mono text-foreground">
                Rs {(totals.totalSTax + totals.totalGst).toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-2.5 flex justify-between items-center text-base font-bold">
              <span className="text-primary">Net Invoice Amount:</span>
              <span className="font-mono text-primary text-xl">
                Rs {totals.netInvoiceAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <CardFooter className="justify-between border-t p-4 bg-muted/40">
          <Link href="/pharmacy/sales">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales History
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading || items.length === 0}
            className="px-8 shadow-md"
          >
            {isLoading ? 'Creating Invoice & Deducting Stock...' : 'Save & Generate Invoice'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
