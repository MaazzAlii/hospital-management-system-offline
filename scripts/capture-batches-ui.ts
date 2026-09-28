import puppeteer from 'puppeteer';
import path from 'path';
import { prisma } from '../src/lib/prisma';

async function main() {
  const artifactDir = '/home/maazzalii/.gemini/antigravity-ide/brain/8755d35f-e0e6-4be2-b762-225bbea2a751';

  // 1. Create a category and medicine with 2 batches
  let category = await prisma.medicineCategory.findFirst();
  if (!category) {
    category = await prisma.medicineCategory.create({ data: { name: 'Antibiotics' } });
  }

  const med = await prisma.medicine.create({
    data: {
      name: 'Panadol Extra 500mg',
      categoryId: category.id,
      manufacturer: 'GSK Pakistan',
      unitPrice: 35,
      sellingPrice: 50,
      unit: 'Tablet',
      reorderLevel: 10,
    },
  });

  const purchase = await prisma.purchase.create({
    data: {
      purchaseNo: `PUR-${Date.now().toString().slice(-6)}`,
      totalAmount: 3500,
      status: 'completed',
    },
  });

  const pi1 = await prisma.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      medicineId: med.id,
      batchNo: 'PAN-2026-A1',
      expiryDate: new Date('2027-06-30'),
      quantity: 100,
      unitPrice: 35,
      totalPrice: 3500,
    },
  });

  await prisma.batch.create({
    data: {
      medicineId: med.id,
      purchaseItemId: pi1.id,
      batchNo: 'PAN-2026-A1',
      expiryDate: new Date('2027-06-30'),
      quantityReceived: 100,
      quantityRemaining: 85,
    },
  });

  await prisma.batch.create({
    data: {
      medicineId: med.id,
      batchNo: 'PAN-2026-B2',
      expiryDate: new Date('2028-01-15'),
      quantityReceived: 50,
      quantityRemaining: 50,
    },
  });

  await prisma.stockMovement.create({
    data: {
      medicineId: med.id,
      type: 'purchase',
      quantity: 135,
      referenceType: 'Purchase',
      referenceId: purchase.id,
    },
  });

  console.log(`Created test medicine ${med.name} with 2 active batches.`);

  // 2. Launch browser and navigate
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 950 });

  // Login
  await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="email"], input[type="email"]');
  await page.type('input[name="email"], input[type="email"]', 'admin@lifecare.com');
  await page.type('input[name="password"], input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Go to Edit form
  await page.goto(`http://localhost:3456/pharmacy/medicines/${med.id}/edit`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'medicine_edit_with_batches.png') });
  console.log('✅ Captured medicine_edit_with_batches.png with real batches!');

  // Edit the first batch
  const batchInputs = await page.$$('input[placeholder*="B-10294"]');
  if (batchInputs.length > 0) {
    await batchInputs[0].click({ clickCount: 3 });
    await batchInputs[0].type('PAN-2026-A1-UPDATED');

    const saveBtns = await page.$$('button ::-p-text(Save Batch)');
    if (saveBtns.length > 0) {
      await saveBtns[0].click();
      await new Promise((r) => setTimeout(r, 800));
      await page.screenshot({ path: path.join(artifactDir, 'batch_saved_success.png') });
      console.log('✅ Captured batch_saved_success.png with Save confirmation!');
    }
  }

  // Go to Medicines Master list
  await page.goto('http://localhost:3456/pharmacy/medicines', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'medicines_master_list.png') });
  console.log('✅ Captured medicines_master_list.png with updated medicine & stock!');

  // Go to Expiry Report
  await page.goto('http://localhost:3456/pharmacy/expiry-report', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'expiry_report.png') });
  console.log('✅ Captured expiry_report.png!');

  await browser.close();
  await prisma.$disconnect();
}

main().catch(console.error);
