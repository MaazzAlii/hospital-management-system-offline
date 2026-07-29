'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, hasAccess } from "@/lib/auth-utils"

export async function getLabOrderDetails(id: string) {
  const supabase = await createClient()

  // 1. Fetch Order with Patient
  const { data: order, error: orderError } = await supabase
    .from('LabOrder')
    .select(`
      *,
      Patient:patientId (id, name, mrn, dob, gender),
      Doctor:doctorId (id)
    `)
    .eq('id', id)
    .single()

  if (orderError || !order) {
    console.error('Error fetching lab order:', orderError)
    throw new Error('Order not found')
  }

  // 2. Fetch Order Items with Test Details
  const { data: items } = await supabase
    .from('LabOrderItem')
    .select(`
      *,
      LabTest:testId (id, name, code, sampleType, turnaroundHours)
    `)
    .eq('labOrderId', id)

  order.items = items || []

  // 3. Fetch Samples
  const { data: samples } = await supabase
    .from('Sample')
    .select('*')
    .eq('labOrderId', id)
    
  order.samples = samples || []

  // 4. Fetch Results
  const sampleIds = order.samples.map((s: any) => s.id)
  if (sampleIds.length > 0) {
    const { data: results } = await supabase
      .from('LabResult')
      .select('*')
      .in('sampleId', sampleIds)
    
    order.results = results || []
  } else {
    order.results = []
  }

  return order
}

export async function collectSample(labOrderId: string, sampleType: string) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient()
  
  const sampleNo = `SMP-${Date.now().toString().slice(-6)}`
  
  const { data, error } = await supabase
    .from('Sample')
    .insert({
      sampleNo,
      labOrderId,
      sampleType,
      collectedAt: new Date().toISOString(),
      status: 'collected'
    })
    .select()
    .single()

  if (error) {
    console.error('Error collecting sample:', error)
    throw new Error('Failed to collect sample')
  }

  revalidatePath(`/lab/orders/${labOrderId}`)
  return data
}

export async function saveResult(data: {
  labOrderItemId: string,
  sampleId: string,
  resultValue: string,
  unit?: string,
  testId: string,
  patientGender?: string,
  patientDob?: string,
  labOrderId: string
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient()

  // Auto-flagging logic
  let flag = 'Normal'
  
  // Try to find a matching reference range
  const { data: ranges } = await supabase
    .from('ReferenceRange')
    .select('*')
    .eq('testId', data.testId)

  if (ranges && ranges.length > 0) {
    // Basic matching: try to match gender if specified in range
    // A robust system would calculate age and match ageMin/ageMax
    let matchedRange = ranges.find(r => r.gender === data.patientGender || r.gender === 'All')
    
    if (!matchedRange) {
      matchedRange = ranges[0] // fallback to first range
    }
    
    if (matchedRange && matchedRange.lowValue !== null && matchedRange.highValue !== null) {
      const numValue = parseFloat(data.resultValue)
      if (!isNaN(numValue)) {
        if (numValue < matchedRange.lowValue) flag = 'Low'
        else if (numValue > matchedRange.highValue) flag = 'High'
      }
    }
  }

  // Check if result already exists for this item
  const { data: existing } = await supabase
    .from('LabResult')
    .select('id')
    .eq('labOrderItemId', data.labOrderItemId)
    .maybeSingle()

  let resultError;
  
  if (existing) {
    // Update
    const { error } = await supabase
      .from('LabResult')
      .update({
        resultValue: data.resultValue,
        unit: data.unit,
        flag,
        status: 'pending' // Entering a new value resets to pending
      })
      .eq('id', existing.id)
    resultError = error
  } else {
    // Insert
    const { error } = await supabase
      .from('LabResult')
      .insert({
        labOrderItemId: data.labOrderItemId,
        sampleId: data.sampleId,
        resultValue: data.resultValue,
        unit: data.unit,
        flag,
        status: 'pending'
      })
    resultError = error
  }

  if (resultError) {
    console.error('Error saving result:', resultError)
    throw new Error('Failed to save result')
  }

  // Update order status to in_progress if not already
  await supabase.from('LabOrder').update({ status: 'in_progress' }).eq('id', data.labOrderId)

  revalidatePath(`/lab/orders/${data.labOrderId}`)
  return { success: true }
}

export async function verifyResult(resultId: string, labOrderId: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'lab', 'verify_lab')) {
      throw new Error("Unauthorized to verify lab results");
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const verifiedBy = user ? user.id : 'system'

    const { error } = await supabase
      .from('LabResult')
      .update({
        status: 'verified',
        verifiedBy,
        verifiedAt: new Date().toISOString()
      })
      .eq('id', resultId)

    if (error) {
      console.error('Error verifying result:', error)
      throw new Error('Failed to verify result')
    }

    revalidatePath(`/lab/orders/${labOrderId}`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Failed to verify result" }
  }
}
