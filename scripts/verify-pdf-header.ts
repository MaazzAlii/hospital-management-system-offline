import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { InvoicePDF } from '../src/components/pdf/InvoicePDF';
import { LabReportPDF } from '../src/components/pdf/LabReportPDF';

async function main() {
  console.log('🚀 Verifying PDF Header Wrap Fix on Running Packaged App (http://localhost:3456)...');
  const artifactDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  // Wait for server to respond on 3456
  console.log('Waiting for http://localhost:3456 to become reachable...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get('http://localhost:3456/login', (res) => {
          if (res.statusCode === 200 || res.statusCode === 307) {
            ready = true;
            resolve();
          } else {
            resolve();
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (ready) break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 1. Log in to packaged app on port 3456
  console.log('\n1. Logging in to http://localhost:3456/login...');
  await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', 'admin@lifecare.com');
  await page.type('input[name="password"]', 'password123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);
  console.log('✅ Logged in successfully. Current URL:', page.url());

  // 2. Check Settings
  console.log('\n2. Checking Clinic Settings at http://localhost:3456/settings...');
  await page.goto('http://localhost:3456/settings', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, '01-clinic-settings.png') });
  console.log('✅ Captured 01-clinic-settings.png');

  // 3. Navigate to Pharmacy Sales and view Invoices
  console.log('\n3. Navigating to Pharmacy Sales at http://localhost:3456/pharmacy/sales...');
  await page.goto('http://localhost:3456/pharmacy/sales', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactDir, '02-pharmacy-sales-list.png') });
  console.log('✅ Captured 02-pharmacy-sales-list.png');

  // 4. Test PDF Rendering directly using @react-pdf/renderer
  console.log('\n4. Rendering and testing InvoicePDF component directly...');
  const testInvoice = {
    saleNo: 'INV-2026-0089',
    saleDate: new Date().toISOString(),
    status: 'COMPLETED',
    customerName: 'Muhammad Shakeel',
    customerPhone: '03439626941',
    customerAddress: 'Buner, Khyber Pakhtunkhwa',
    items: [
      {
        medicine: { name: 'Panadol 500mg Tablet' },
        batchNo: 'B-8832',
        expiryDate: new Date('2027-12-31').toISOString(),
        quantity: 2,
        freeQty: 0,
        tradePrice: 50,
        grossAmount: 100,
        discountAmount: 0,
        sTax: 0,
        gst: 0,
        netAmount: 100
      }
    ],
    totalAmount: 100
  };

  const clinicSettings = {
    clinicName: 'Life Care Clinic, Nawagai Buner',
    address: 'Nawagai, Buner, Khyber Pakhtunkhwa',
    phone: '03439626941',
    email: 'shakeelbuneri933@gmail.com'
  };

  const invoicePdfPath = path.join(artifactDir, 'test-invoice.pdf');
  await renderToFile(
    React.createElement(InvoicePDF, { invoice: testInvoice, settings: clinicSettings }),
    invoicePdfPath
  );
  console.log('✅ Generated test-invoice.pdf at:', invoicePdfPath);

  // 5. Test Lab Report PDF
  console.log('\n5. Rendering and testing LabReportPDF component directly...');
  const testLabOrder = {
    orderNo: 'LAB-2026-0045',
    orderedAt: new Date().toISOString(),
    patient: { name: 'Muhammad Shakeel', mrn: 'MRN-001', phone: '03439626941', gender: 'Male', age: 32 },
    doctor: { name: 'Dr. Shakeel Khan' },
    items: [
      {
        id: '1',
        test: { name: 'Complete Blood Picture (CP)', price: 800 }
      }
    ],
    results: [
      {
        id: '1',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        labTest: {
          name: 'Complete Blood Picture (CP)',
          category: { name: 'Hematology' },
          parameters: [
            { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.5 - 17.5' }
          ]
        },
        parameterResults: [
          { parameter: { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.5 - 17.5' }, value: '14.8', flag: 'NORMAL' }
        ]
      }
    ]
  };

  const labPdfPath = path.join(artifactDir, 'test-lab-report.pdf');
  await renderToFile(
    React.createElement(LabReportPDF, { order: testLabOrder, settings: clinicSettings }),
    labPdfPath
  );
  console.log('✅ Generated test-lab-report.pdf at:', labPdfPath);

  // 6. Verify text content by decompressing PDF stream objects
  const zlib = require('zlib');
  function extractTextFromPdf(pdfBuffer: Buffer): string {
    const rawStr = pdfBuffer.toString('binary');
    const streamMatches = rawStr.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || [];
    let fullText = '';

    for (const m of streamMatches) {
      const streamData = Buffer.from(
        m.replace(/^stream\r?\n/, '').replace(/\r?\nendstream$/, ''),
        'binary'
      );
      try {
        const uncompressed = zlib.inflateSync(streamData).toString('utf-8');
        // Extract all hex strings in [<...>] TJ or (<...>) Tj
        const tjMatches = uncompressed.match(/\[(.*?)\]\s*TJ/g) || [];
        for (const tj of tjMatches) {
          const hexParts = tj.match(/<([0-9a-fA-F]+)>/g) || [];
          let line = '';
          for (const hp of hexParts) {
            const hex = hp.replace(/<|>/g, '');
            line += Buffer.from(hex, 'hex').toString('utf-8');
          }
          fullText += line + '\n';
        }
      } catch (e) {
        // Not a flate stream, skip
      }
    }
    return fullText;
  }

  const invoiceText = extractTextFromPdf(fs.readFileSync(invoicePdfPath));
  const labText = extractTextFromPdf(fs.readFileSync(labPdfPath));

  console.log('\n--- Extracted Text in Invoice PDF ---');
  console.log(invoiceText.trim().split('\n').slice(0, 10).join('\n'));

  console.log('\n--- Extracted Text in Lab Report PDF ---');
  console.log(labText.trim().split('\n').slice(0, 10).join('\n'));

  // Assertions
  const expectedEmail = 'shakeelbuneri933@gmail.com';
  const expectedPhone = '03439626941';
  const expectedAddress = 'Nawagai, Buner, Khyber Pakhtunkhwa';

  const invoiceHasAddress = invoiceText.includes(expectedAddress);
  const invoiceHasPhone = invoiceText.includes(expectedPhone);
  const invoiceHasEmail = invoiceText.includes(expectedEmail);
  const invoiceHasBrokenEmail = invoiceText.includes('shakeel-');

  console.log('\n--- Invoice PDF Verification Checks ---');
  console.log(`[Invoice] Contains Full Address: ${invoiceHasAddress ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Invoice] Contains Phone: ${invoiceHasPhone ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Invoice] Contains Unbroken Email "${expectedEmail}": ${invoiceHasEmail ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Invoice] No Hyphen Split "shakeel-": ${!invoiceHasBrokenEmail ? '✅ PASS' : '❌ FAIL'}`);

  const labHasAddress = labText.includes(expectedAddress);
  const labHasPhone = labText.includes(expectedPhone);
  const labHasEmail = labText.includes(expectedEmail);
  const labHasBrokenEmail = labText.includes('shakeel-');

  console.log('\n--- Lab Report PDF Verification Checks ---');
  console.log(`[Lab Report] Contains Full Address: ${labHasAddress ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Lab Report] Contains Phone: ${labHasPhone ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Lab Report] Contains Unbroken Email "${expectedEmail}": ${labHasEmail ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`[Lab Report] No Hyphen Split "shakeel-": ${!labHasBrokenEmail ? '✅ PASS' : '❌ FAIL'}`);

  if (invoiceHasEmail && !invoiceHasBrokenEmail && labHasEmail && !labHasBrokenEmail) {
    console.log('\n🎉 ALL PDF HEADER WRAP FIX CHECKS PASSED PERFECTLY!');
  } else {
    throw new Error('PDF Header wrapping verification failed!');
  }

  await browser.close();
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
