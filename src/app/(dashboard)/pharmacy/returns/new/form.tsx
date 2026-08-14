'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Search } from 'lucide-react'
import { getSaleBySaleNo, processReturn } from '@/app/actions/return'
import Link from 'next/link'

type SaleItem = {
  id: string;
  medicineId: string;
  medicine?: { name: string };
  Medicine?: { name: string };
  quantity: number;
  unitPrice?: number;
  outPrice?: number;
  totalPrice?: number;
  // UI state
  returnQuantity: number;
  reason: string;
}

export function ReturnForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [saleNo, setSaleNo] = useState('')
  const [saleData, setSaleData] = useState<any>(null)
  const [items, setItems] = useState<SaleItem[]>([])

  const searchSale = async () => {
    if (!saleNo) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSaleBySaleNo(saleNo)
      if (!data) {
        setError('Sale not found')
        setSaleData(null)
        setItems([])
      } else {
        setSaleData(data)
        const saleItems = (data as any).items || (data as any).SaleItem || [];
        setItems(saleItems.map((item: any) => ({
          ...item,
          returnQuantity: 0,
          reason: ''
        })))
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching sale')
    } finally {
      setIsLoading(false)
    }
  }

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const itemsToReturn = items.filter(i => i.returnQuantity > 0)
    
    if (itemsToReturn.length === 0) {
      setError("Please specify at least one item to return")
      return
    }
    
    for (const item of itemsToReturn) {
      const medName = item.medicine?.name || item.Medicine?.name || "Medicine";
      if (item.returnQuantity > item.quantity) {
        setError(`Return quantity for ${medName} cannot exceed sold quantity (${item.quantity})`)
        return
      }
    }

    setIsLoading(true)
    
    try {
      await processReturn(saleData.id, itemsToReturn)
      router.push('/pharmacy/returns')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to process return')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Return Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label htmlFor="saleNo">Sale No</Label>
              <Input 
                id="saleNo" 
                value={saleNo}
                onChange={e => setSaleNo(e.target.value)}
                placeholder="e.g. SALE-2026-0001"
              />
            </div>
            <Button type="button" onClick={searchSale} disabled={isLoading || !saleNo}>
              <Search className="h-4 w-4 mr-2" />
              Find Sale
            </Button>
          </div>

          {saleData && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span><strong>Patient:</strong> {saleData.patient?.name || saleData.customerName || 'Walk-in'}</span>
                <span><strong>Date:</strong> {new Date(saleData.createdAt).toLocaleDateString()}</span>
                <span><strong>Total:</strong> Rs {saleData.totalAmount?.toFixed(2)}</span>
              </div>
              
              <div className="rounded-md border divide-y">
                {items.map((item) => {
                  const medName = item.medicine?.name || item.Medicine?.name || "Medicine";
                  const price = item.unitPrice ?? item.outPrice ?? 0;
                  return (
                    <div key={item.id} className="p-4 grid gap-4 sm:grid-cols-12 items-start bg-muted/20">
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs text-muted-foreground">Medicine</Label>
                        <div className="font-medium">{medName}</div>
                        <div className="text-xs text-muted-foreground">Sold: {item.quantity} | Price: Rs {price}</div>
                      </div>
                      
                      <div className="sm:col-span-3 space-y-2">
                        <Label className="text-xs text-muted-foreground">Return Qty</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={item.quantity}
                          value={item.returnQuantity} 
                          onChange={e => updateItem(item.id, 'returnQuantity', Number(e.target.value))} 
                        />
                      </div>
                      
                      <div className="sm:col-span-5 space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Input 
                          placeholder="e.g. Expired, damaged"
                          value={item.reason} 
                          onChange={e => updateItem(item.id, 'reason', e.target.value)} 
                          disabled={item.returnQuantity === 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between border-t p-6">
          <Link href="/pharmacy/medicines">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !saleData}>
            {isLoading ? 'Processing...' : 'Process Return'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
