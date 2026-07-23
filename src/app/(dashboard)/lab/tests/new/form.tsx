'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus } from 'lucide-react'
import { createLabTest, createLabCategory } from '@/app/actions/lab-test'
import Link from 'next/link'

export function LabTestForm({ initialCategories }: { initialCategories: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState(initialCategories)
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    categoryId: '',
    price: '',
    sampleType: '',
    turnaroundHours: '',
    isActive: true
  })

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const newCat = await createLabCategory(newCategoryName)
      setCategories([...categories, newCat].sort((a, b) => a.name.localeCompare(b.name)))
      setFormData(prev => ({ ...prev, categoryId: newCat.id }))
      setIsAddingCategory(false)
      setNewCategoryName('')
    } catch (err) {
      setError('Failed to create category')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      await createLabTest({
        ...formData,
        price: Number(formData.price),
        turnaroundHours: formData.turnaroundHours ? Number(formData.turnaroundHours) : null
      })
      router.push('/lab/tests')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input 
                id="name" 
                required 
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Test Code</Label>
              <Input 
                id="code" 
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. CBC-01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <Input 
                    autoFocus
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                  <Button type="button" onClick={handleAddCategory} disabled={isLoading}>Add</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.categoryId}
                    onValueChange={val => setFormData(prev => ({ ...prev, categoryId: val || "" }))}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingCategory(true)} title="Add new category">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs.) *</Label>
              <Input 
                id="price" 
                type="number" 
                min="0"
                step="0.01"
                required 
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleType">Sample Type</Label>
              <Input 
                id="sampleType" 
                value={formData.sampleType}
                onChange={e => setFormData(prev => ({ ...prev, sampleType: e.target.value }))}
                placeholder="e.g. Blood, Urine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="turnaroundHours">Turnaround Time (Hours)</Label>
              <Input 
                id="turnaroundHours" 
                type="number"
                min="0"
                value={formData.turnaroundHours}
                onChange={e => setFormData(prev => ({ ...prev, turnaroundHours: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="active" 
                checked={formData.isActive}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="active">Active Test</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t p-6">
          <Link href="/lab/tests">
            <Button type="button" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Lab Test'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
