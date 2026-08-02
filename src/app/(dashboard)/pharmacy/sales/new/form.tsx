'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import { createSale } from '@/app/actions/sale'
import Link from 'next/link'

type SaleItem = {
  id: string; // for React key
  medicineId: string;
  quantity: number;
  outPrice: number;
}

export function SaleForm({ patients, medicines }: { patients: any[], medicines: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patientId, setPatientId] = useState('walk-in')
  const [items, setItems] = useState<SaleItem[]>([])

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      medicineId: '',
      quantity: 1,
      outPrice: 0,
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // Auto-fill price when medicine is selected
        if (field === 'medicineId') {
          const med = medicines.find(m => m.id === value)
          if (med) {
            updated.outPrice = med.outPrice || 0
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = (item.quantity || 0) * (item.outPrice || 0)
      return sum + lineTotal
    }, 0)
  }, [items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
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
      if (items[i].outPrice < 0) {
        setError(`Price cannot be negative for item ${i + 1}`)
        return
      }
      
      const med = medicines.find(m => m.id === items[i].medicineId)
      if (med) {
        if (items[i].quantity > med.currentStock) {
          setError(`Quantity for ${med.name} (${items[i].quantity}) exceeds available stock (${med.currentStock})`)
          return
        }
      }
    }

    setIsLoading(true)
    
    try {
      const res = await createSale({
        patientId: patientId === 'walk-in' ? undefined : patientId,
        totalAmount,
        items: items.map(({ medicineId, quantity, outPrice }) => ({
          medicineId,
          quantity: Number(quantity),
          outPrice: Number(outPrice),
        }))
      })
      
      if (res && res.success) {
        router.push('/pharmacy/sales')
        router.refresh()
      } else {
        setError(res?.error || 'Failed to create sale')
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create sale')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Sale Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient</Label>
              <Select value={patientId} onValueChange={v => setPatientId(v || '')}>
                <SelectTrigger id="patient">
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Patient (No Profile)</SelectItem>
                  {patients.map(p => {
                    const displayName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {displayName} {p.mrn ? `- ${p.mrn}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
                items.map((item) => {
                  const med = medicines.find(m => m.id === item.medicineId)
                  const isOverStock = med && item.quantity > med.currentStock
                  
                  return (
                    <div key={item.id} className="p-4 grid gap-4 sm:grid-cols-12 items-start bg-muted/20">
                      <div className="sm:col-span-5 space-y-2">
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
                              <SelectItem key={m.id} value={m.id} disabled={m.currentStock <= 0}>
                                <div className="flex justify-between items-center w-full min-w-[200px]">
                                  <span>{m.name}</span>
                                  <span className={`text-xs ml-4 ${m.currentStock <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    Stock: {m.currentStock}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="sm:col-span-3 space-y-2">
                        <Label className="text-xs text-muted-foreground flex justify-between">
                          <span>Quantity</span>
                          {med && <span className="text-[10px]">Max: {med.currentStock}</span>}
                        </Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max={med?.currentStock}
                          value={item.quantity} 
                          onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} 
                          className={isOverStock ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {isOverStock && (
                          <p className="text-[10px] text-destructive m-0">Exceeds stock</p>
                        )}
                      </div>
                      
                      <div className="sm:col-span-3 space-y-2">
                        <Label className="text-xs text-muted-foreground">Out Price</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={item.outPrice} 
                          onChange={e => updateItem(item.id, 'outPrice', Number(e.target.value))} 
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
                          Rs {(item.quantity * item.outPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )
                })
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
          <Link href="/pharmacy/sales">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || items.length === 0}>
            {isLoading ? 'Saving...' : 'Complete Sale'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
