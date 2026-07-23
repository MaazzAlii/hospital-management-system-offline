'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { createLabOrder } from '@/app/actions/lab-order'
import Link from 'next/link'

export function LabOrderForm({ tests, patients }: { tests: any[], patients: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [patientId, setPatientId] = useState('')
  const [notes, setNotes] = useState('')
  
  const [selectedTests, setSelectedTests] = useState<any[]>([])

  const availableTests = tests.filter(t => !selectedTests.find(st => st.id === t.id) && t.isActive)
  const totalAmount = selectedTests.reduce((sum, t) => sum + Number(t.price), 0)

  const handleAddTest = (testId: string) => {
    const test = tests.find(t => t.id === testId)
    if (test) {
      setSelectedTests([...selectedTests, test])
    }
  }

  const handleRemoveTest = (testId: string) => {
    setSelectedTests(selectedTests.filter(t => t.id !== testId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) {
      setError("Please select a patient")
      return
    }
    if (selectedTests.length === 0) {
      setError("Please select at least one test")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      await createLabOrder({
        patientId,
        notes,
        tests: selectedTests.map(t => ({ testId: t.id, price: t.price }))
      })
      router.push('/lab/orders')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create lab order')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={patientId} onValueChange={(val) => setPatientId(val || "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.mrn})
                    </SelectItem>
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
                placeholder="Clinical notes..."
              />
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Tests Selection</h3>
            
            <div className="flex gap-2 max-w-sm">
              <Select onValueChange={(val) => { if (val) handleAddTest(val); }} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Add a test..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTests.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (Rs. {t.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTests.length > 0 && (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="py-2 px-4 text-left font-medium">Test Name</th>
                      <th className="py-2 px-4 text-left font-medium">Sample Type</th>
                      <th className="py-2 px-4 text-right font-medium">Price</th>
                      <th className="py-2 px-4 text-center font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTests.map(t => (
                      <tr key={t.id}>
                        <td className="py-2 px-4">{t.name}</td>
                        <td className="py-2 px-4">{t.sampleType || '—'}</td>
                        <td className="py-2 px-4 text-right font-medium">Rs. {Number(t.price).toFixed(2)}</td>
                        <td className="py-2 px-4 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveTest(t.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-right font-medium">Total:</td>
                      <td className="py-3 px-4 text-right font-bold text-lg">Rs. {totalAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {selectedTests.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/20 text-center">
                No tests selected yet.
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t p-6">
          <Link href="/lab/orders">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || selectedTests.length === 0}>
            {isLoading ? 'Creating...' : 'Create Order & Invoice'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
