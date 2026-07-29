'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserRole, getCurrentDoctorId, hasAccess } from '@/lib/auth-utils'
import { generateLabOrderNo, generateInvoiceNo } from '@/lib/id-generator'

export async function getLabOrders(query?: string) {
  const { role } = await getCurrentUserRole();
  const supabase = await createClient()

  let request = supabase
    .from('LabOrder')
    .select(`
      *,
      Patient:patientId (id, name, mrn),
      Doctor:doctorId (id)
    `)
    .order('orderedAt', { ascending: false })

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (currentDoctorId) {
      request = request.eq('doctorId', currentDoctorId);
    } else {
      return [];
    }
  }

  const { data, error } = await request

  if (error) {
    console.error('Error fetching lab orders:', error)
    return []
  }

  let orders = data || []
  if (query) {
    const q = query.toLowerCase()
    orders = orders.filter((o: any) => 
      o.orderNo?.toLowerCase().includes(q) ||
      o.Patient?.name?.toLowerCase().includes(q)
    )
  }

  return orders
}

export async function createLabOrder(data: {
  patientId: string,
  doctorId?: string,
  notes?: string,
  tests: { testId: string, price: number }[]
}) {
  const { role } = await getCurrentUserRole();
  if (!hasAccess(role, 'lab', 'write')) {
    throw new Error('Unauthorized');
  }

  if (role?.toLowerCase() === 'doctor') {
    const currentDoctorId = await getCurrentDoctorId();
    if (!currentDoctorId) {
      throw new Error('Doctor profile not found');
    }
    data.doctorId = currentDoctorId;
  }

  const supabase = await createClient()

  const orderNo = await generateLabOrderNo()
  const totalAmount = data.tests.reduce((sum, t) => sum + Number(t.price), 0)

  // 1. Create LabOrder
  const { data: order, error: orderError } = await supabase
    .from('LabOrder')
    .insert({
      orderNo,
      patientId: data.patientId,
      doctorId: data.doctorId || null,
      status: 'pending',
      notes: data.notes
    })
    .select()
    .single()

  if (orderError) {
    console.error('Error creating lab order:', orderError)
    throw new Error('Failed to create lab order')
  }

  // 2. Create LabOrderItems
  if (data.tests.length > 0) {
    const items = data.tests.map(t => ({
      labOrderId: order.id,
      testId: t.testId,
      price: t.price
    }))

    const { error: itemsError } = await supabase
      .from('LabOrderItem')
      .insert(items)

    if (itemsError) {
      console.error('Error creating lab order items:', itemsError)
      throw new Error('Failed to create lab order items')
    }
  }

  // 3. Billing Integration (Invoice)
  const invoiceNo = await generateInvoiceNo()

  const { data: invoice, error: invoiceError } = await supabase
    .from("Invoice")
    .insert({
      invoiceNo,
      sourceType: 'Lab',
      sourceId: order.id,
      patientId: data.patientId, // Patient is required in LabOrder, so we have it
      subtotal: totalAmount,
      aoDiscountPct: 0,
      discountAmt: 0,
      total: totalAmount,
      status: 'unpaid',
      notes: `Lab Order: ${order.orderNo}`
    })
    .select()
    .single()

  if (!invoiceError && invoice && data.tests.length > 0) {
    // Fetch LabTest names for descriptions
    const testIds = data.tests.map((t: any) => t.testId);
    const { data: tests } = await supabase
      .from("LabTest")
      .select("id, name")
      .in("id", testIds);
      
    const testNameMap = new Map();
    if (tests) {
      tests.forEach((t: any) => testNameMap.set(t.id, t.name));
    }

    // Add items to InvoiceItem
    const invoiceItems = data.tests.map((t: any) => {
      const testName = testNameMap.get(t.testId) || `Test ID: ${t.testId}`;
      return {
        invoiceId: invoice.id,
        description: `Lab Test: ${testName}`,
        quantity: 1,
        unitPrice: t.price,
        total: t.price,
      }
    })
    
    await supabase.from("InvoiceItem").insert(invoiceItems)
  } else if (invoiceError) {
    console.error("Failed to create billing invoice for lab order:", invoiceError)
    throw new Error(`Failed to create billing invoice: ${invoiceError?.message}`)
  }

  revalidatePath('/lab/orders')
  revalidatePath('/billing')
  return order
}
