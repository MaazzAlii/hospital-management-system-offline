'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLabTests(query?: string) {
  const supabase = await createClient()

  let request = supabase
    .from('LabTest')
    .select(`
      *,
      LabCategory:categoryId (id, name)
    `)
    .order('name', { ascending: true })

  const { data, error } = await request

  if (error) {
    console.error('Error fetching lab tests:', error)
    return []
  }

  let tests = data || []
  if (query) {
    const q = query.toLowerCase()
    tests = tests.filter((t: any) => 
      t.name?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q) ||
      t.LabCategory?.name?.toLowerCase().includes(q)
    )
  }

  return tests
}

export async function getLabCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('LabCategory')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching lab categories:', error)
    return []
  }
  return data || []
}

export async function createLabCategory(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('LabCategory')
    .insert({ name })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create category')
  }
  return data
}

export async function createLabTest(data: any) {
  const supabase = await createClient()

  const { data: test, error } = await supabase
    .from('LabTest')
    .insert({
      name: data.name,
      categoryId: data.categoryId,
      code: data.code,
      price: data.price,
      sampleType: data.sampleType,
      turnaroundHours: data.turnaroundHours,
      isActive: data.isActive ?? true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lab test:', error)
    throw new Error('Failed to create lab test')
  }

  revalidatePath('/lab/tests')
  return test
}
