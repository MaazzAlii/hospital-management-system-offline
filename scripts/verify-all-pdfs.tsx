import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '../src/components/pdf/InvoicePDF';
import { LabReportPDF } from '../src/components/pdf/LabReportPDF';
import { PurchaseInvoicePDF } from '../src/components/pdf/PurchaseInvoicePDF';
import { getLogoBase64 } from '../src/lib/pdf-utils';
import fs from 'fs';
import path from 'path';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function verifyAllPdfs() {
  console.log('--- Verifying PDF Generation ---');
  const logoBase64 = getLogoBase64();
  console.log(`Logo loaded as base64: ${Boolean(logoBase64)} (length: ${logoBase64?.length || 0})`);

  const mockSettings = {
    clinicName: 'Life Care Clinic, Nawagai Buner',
    address: 'Nawagai, Buner, Khyber Pakhtunkhwa',
    phone: '03439626941',
    email: 'shakeelbuneri933@gmail.com',
    currency: 'PKR',
  };

  // 1. Test InvoicePDF (Sales / Distributor format)
  console.log('\n1. Testing InvoicePDF (Sales)...');
  const mockSale = {
    saleNo: 'SAL-2026-001',
    saleDate: new Date(),
    customerName: 'Test Customer Pharmacy',
    customerPhone: '03001234567',
    customerAddress: 'Buner Main Bazaar',
    accountCode: 'ACC-1001',
    licenseNo: 'DL-9922',
    ntn: '1234567-8',
    summaryPrsNo: 'PRS-100',
    bookedBy: 'Tariq Mehmood',
    salesmanMobile: '03217654321',
    suppliedBy: 'Life Care Pharmacy',
    territory: 'Buner North',
    items: [
      {
        id: '1',
        medicine: { name: 'Panadol Extra 500mg' },
        batchNo: 'B-88392',
        expiryDate: new Date(2027, 5, 1),
        quantity: 10,
        freeQty: 1,
        tradePrice: 120,
        grossAmount: 1200,
        discountPercent: 5,
        discountAmount: 60,
        sTax: 0,
        gst: 0,
        netAmount: 1140,
      },
    ],
  };

  const invoiceStream = await renderToStream(
    <InvoicePDF invoice={mockSale} settings={mockSettings} logoUrl={logoBase64} />
  );
  const invoiceBuf = await streamToBuffer(invoiceStream as any);
  console.log(`✅ InvoicePDF generated successfully: ${invoiceBuf.length} bytes`);

  // 2. Test LabReportPDF
  console.log('\n2. Testing LabReportPDF...');
  const mockOrder = {
    orderNo: 'LAB-2026-001',
    createdAt: new Date(),
    patient: {
      name: 'Muhammad Ali',
      mrn: 'MRN-001',
      age: 35,
      gender: 'Male',
      phone: '03451122334',
    },
    doctor: {
      name: 'Dr. Shakeel Buneri',
    },
    items: [
      { id: 'item1', testId: 'test1', test: { name: 'Complete Blood Count (CBC)' } },
    ],
    results: [
      {
        labOrderItemId: 'item1',
        parameterName: 'Hemoglobin',
        numericValue: 14.5,
        unit: 'g/dL',
        referenceRange: '13.5 - 17.5 g/dL',
        status: 'Normal',
      },
    ],
  };

  const labStream = await renderToStream(
    <LabReportPDF order={mockOrder} invoice={null} settings={mockSettings} logoUrl={logoBase64} />
  );
  const labBuf = await streamToBuffer(labStream as any);
  console.log(`✅ LabReportPDF generated successfully: ${labBuf.length} bytes`);

  // 3. Test PurchaseInvoicePDF
  console.log('\n3. Testing PurchaseInvoicePDF...');
  const mockPurchase = {
    purchaseNo: 'PUR-2026-001',
    purchaseDate: new Date(),
    status: 'completed',
    notes: 'Received in good condition from Swat Distributors',
    totalAmount: 15400,
    supplier: {
      name: 'Swat Distributors Pvt Ltd',
      contactPerson: 'Kareem Khan',
      phone: '03129876543',
      email: 'sales@swatdistributors.com',
      address: 'Mingora, Swat',
    },
    items: [
      {
        id: 'pitem1',
        medicine: { name: 'Amoxicillin 500mg Cap', genericName: 'Amoxicillin Trihydrate' },
        batchNo: 'AMX-2026-99',
        expiryDate: new Date(2028, 1, 1),
        quantity: 50,
        unitPrice: 150,
        totalPrice: 7500,
      },
      {
        id: 'pitem2',
        medicine: { name: 'Cefixime 400mg Tab', genericName: 'Cefixime USP' },
        batchNo: 'CFX-2026-12',
        expiryDate: new Date(2027, 10, 1),
        quantity: 20,
        unitPrice: 395,
        totalPrice: 7900,
      },
    ],
  };

  const purchaseStream = await renderToStream(
    <PurchaseInvoicePDF purchase={mockPurchase} settings={mockSettings} logoUrl={logoBase64} />
  );
  const purchaseBuf = await streamToBuffer(purchaseStream as any);
  console.log(`✅ PurchaseInvoicePDF generated successfully: ${purchaseBuf.length} bytes`);

  // 4. Test missing logo graceful fallback (undefined logo)
  console.log('\n4. Testing PDF generation with missing/undefined logo...');
  const noLogoStream = await renderToStream(
    <PurchaseInvoicePDF purchase={mockPurchase} settings={mockSettings} logoUrl={undefined} />
  );
  const noLogoBuf = await streamToBuffer(noLogoStream as any);
  console.log(`✅ Graceful missing-logo PDF generated successfully: ${noLogoBuf.length} bytes`);

  console.log('\n🎉 ALL PDF TESTS PASSED PERFECTLY!');
}

verifyAllPdfs().catch((err) => {
  console.error('❌ PDF Verification failed:', err);
  process.exit(1);
});
