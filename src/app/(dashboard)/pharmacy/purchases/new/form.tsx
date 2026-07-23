'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import { createPurchase } from '@/app/actions/purchase'
import Link from 'next/link'

type PurchaseItem = {
  id: string; // for React key
  medicineId: string;
  quantity: number;
  inPrice: number;
  batchNo: string;
  expiryDate: string;
}

export function PurchaseForm({ suppliers, medicines }: { suppliers: any[], medicines: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      medicineId: '',
      quantity: 1,
      inPrice: 0,
      batchNo: '',
      expiryDate: ''
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // Auto-fill price when medicine is selected
        if (field === 'medicineId') {
          const med = medicines.find(m => m.id === value)
          if (med) {
            updated.inPrice = med.inPrice || 0
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = (item.quantity || 0) * (item.inPrice || 0)
      return sum + lineTotal
    }, 0)
  }, [items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!supplierId) {
      setError("Please select a supplier")
      return
    }
    
    if (items.length === 0) {
      setError("Please add at least one item")
      return
    }
    
    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicineId) {
        setError(`Please select a medicine for item ${i + 1}`)
        return
      }
      if (items[i].quantity <= 0) {
        setError(`Quantity must be greater than 0 for item ${i + 1}`)
        return
      }
      if (items[i].inPrice < 0) {
        setError(`Price cannot be negative for item ${i + 1}`)
        return
      }
    }

    setIsLoading(true)
    
    try {
      await createPurchase({
        supplierId,
        notes,
        totalAmount,
        items: items.map(({ medicineId, quantity, inPrice, batchNo, expiryDate }) => ({
          medicineId,
          quantity: Number(quantity),
          inPrice: Number(inPrice),
          batchNo,
          expiryDate
        }))
      })
      
      router.push('/pharmacy/purchases')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create purchase')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={v => setSupplierId(v || '')}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input 
                id="notes" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Optional notes" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            <div className="rounded-md border divide-y">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No items added yet. Click 'Add Item' to start.
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.id} className="p-4 grid gap-4 sm:grid-cols-12 items-start bg-muted/20">
                    <div className="sm:col-span-4 space-y-2">
                      <Label className="text-xs text-muted-foreground">Medicine</Label>
                      <Select 
                        value={item.medicineId} 
                        onValueChange={v => updateItem(item.id, 'medicineId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine..." />
                        </SelectTrigger>
                        <SelectContent>
                          {medicines.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} 
                      />
                    </div>
                    
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs text-muted-foreground">In Price</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.inPrice} 
                        onChange={e => updateItem(item.id, 'inPrice', Number(e.target.value))} 
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                      <Input 
                        type="date" 
                        value={item.expiryDate} 
                        onChange={e => updateItem(item.id, 'expiryDate', e.target.value)} 
                      />
                    </div>
                    
                    <div className="sm:col-span-1 pt-7 text-right flex flex-col items-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="text-xs font-medium mt-2">
                        Rs {(item.quantity * item.inPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end p-4 border rounded-md bg-muted/50">
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-4">Total Amount</span>
                <span className="text-2xl font-bold">Rs {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t p-6">
          <Link href="/pharmacy/purchases">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || items.length === 0}>
            {isLoading ? 'Saving...' : 'Complete Purchase'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
