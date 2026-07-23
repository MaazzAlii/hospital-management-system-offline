import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { InvoicePDF } from '../src/components/pdf/InvoicePDF';

async function main() {
  const mockInvoice = {
    invoiceNo: 'INV-1001',
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    patient: {
      name: 'John Doe',
      mrn: 'MRN-12345',
      phone: '123-456-7890',
      address: '123 Main St, City'
    },
    items: [
      {
        description: 'General Consultation',
        quantity: 1,
        unitPrice: 500,
        total: 500
      },
      {
        description: 'Complete Blood Count',
        quantity: 1,
        unitPrice: 1500,
        total: 1500
      }
    ],
    subtotal: 2000,
    discountPercent: 10,
    discountAmount: 200,
    total: 1800,
    amountPaid: 0
  };

  const mockSettings = {
    clinicName: 'Life Care Clinic',
    address: 'Nawagai Buner',
    phone: '0300-1234567',
    email: 'contact@lifecare.com',
    taxPercent: 0
  };

  await renderToFile(
    <InvoicePDF invoice={mockInvoice} settings={mockSettings} />,
    'invoice_sample.pdf'
  );
  console.log('Successfully generated invoice_sample.pdf');
}

main().catch(console.error);
