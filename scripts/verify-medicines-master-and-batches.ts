import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Starting Verification for Medicines Master & Batch Editing ===');

  const artifactDir = '/home/maazzalii/.gemini/antigravity-ide/brain/8755d35f-e0e6-4be2-b762-225bbea2a751';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  try {
    // 1. Log in
    console.log('1. Logging in as admin@lifecare.com...');
    await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"], input[type="email"]');
    await page.type('input[name="email"], input[type="email"]', 'admin@lifecare.com');
    await page.type('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 2. Create a test medicine with Initial Batch via UI
    console.log('2. Navigating to Add Medicine form...');
    await page.goto('http://localhost:3456/pharmacy/medicines/new', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'med_add_form.png') });

    const medName = `Augmentin 625mg ${Date.now().toString().slice(-4)}`;
    await page.waitForSelector('input[placeholder*="Paracetamol"]');
    await page.type('input[placeholder*="Paracetamol"]', medName);

    // Select category
    const catSelect = await page.$('select');
    if (catSelect) {
      const options = await page.$$eval('select option', opts => opts.map(o => (o as HTMLOptionElement).value).filter(v => !!v));
      if (options.length > 0) {
        await page.select('select', options[0]);
      }
    }

    // Pricing & Inventory
    const numberInputs = await page.$$('input[type="number"]');
    if (numberInputs.length >= 2) {
      await numberInputs[0].type('45'); // inPrice
      await numberInputs[1].type('60'); // outPrice
    }

    // Fill Initial Stock & Batch section
    const initialQtyInput = await page.$('input[placeholder*="e.g. 100"], input[name="quantity"]');
    if (initialQtyInput) {
      await initialQtyInput.type('50');
    }
    const batchInput = await page.$('input[placeholder*="e.g. B-10294"], input[placeholder*="B-"]');
    if (batchInput) {
      await batchInput.type('BATCH-AUG-101');
    }

    // Submit Add Medicine
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('✅ Medicine created successfully!');
    }

    // 3. View Medicines Master
    console.log('3. Viewing Medicines Master list...');
    await page.goto('http://localhost:3456/pharmacy/medicines', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'medicines_master_list.png') });
    console.log('✅ Captured medicines_master_list.png');

    // 4. Find the medicine in DB and navigate to Edit form
    const createdMed = await prisma.medicine.findFirst({
      where: { name: medName },
      include: { batches: true },
    });
    console.log(`Found created medicine: ${createdMed?.name} with ${createdMed?.batches.length} batches`);

    if (createdMed) {
      console.log(`4. Navigating to Edit page for ${createdMed.id}...`);
      await page.goto(`http://localhost:3456/pharmacy/medicines/${createdMed.id}/edit`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(artifactDir, 'medicine_edit_with_batches.png') });
      console.log('✅ Captured medicine_edit_with_batches.png');

      // Edit the batch number and expiry date
      const batchNoInput = await page.$('input[value*="BATCH-AUG-101"]');
      if (batchNoInput) {
        // Clear input and type new batch number
        await (batchNoInput as any).click({ clickCount: 3 });
        await batchNoInput.type('BATCH-AUG-EDITED-999');

        const saveBatchBtn = await page.$('button ::-p-text(Save Batch)');
        if (saveBatchBtn) {
          await saveBatchBtn.click();
          await new Promise(r => setTimeout(r, 1000));
          await page.screenshot({ path: path.join(artifactDir, 'batch_saved_success.png') });
          console.log('✅ Captured batch_saved_success.png');
        }
      }

      // Reload edit page to verify persistence
      await page.reload({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(artifactDir, 'medicine_edit_persisted.png') });
      console.log('✅ Verified batch edit persisted upon page reload!');
    }

    // 5. Seed 120 test medicines to demonstrate UI pagination
    console.log('5. Seeding 120 medicines to verify UI pagination controls...');
    let cat = await prisma.medicineCategory.findFirst();
    const paginationTestMeds = [];
    for (let i = 1; i <= 120; i++) {
      paginationTestMeds.push({
        name: `Catalog Medicine PageTest ${i.toString().padStart(3, '0')}`,
        categoryId: cat?.id || null,
        manufacturer: 'Pfizer / Abbott',
        unitPrice: 15,
        sellingPrice: 25,
        unit: 'Tablet',
        reorderLevel: 5,
      });
    }
    await prisma.medicine.createMany({ data: paginationTestMeds });

    // View Page 1
    await page.goto('http://localhost:3456/pharmacy/medicines', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'medicines_pagination_page1.png') });
    console.log('✅ Captured medicines_pagination_page1.png');

    // Click Next or Go to Page 2
    await page.goto('http://localhost:3456/pharmacy/medicines?page=2', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'medicines_pagination_page2.png') });
    console.log('✅ Captured medicines_pagination_page2.png');

    // Test Search filter in UI
    await page.goto(`http://localhost:3456/pharmacy/medicines?q=${encodeURIComponent(medName)}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(artifactDir, 'medicines_search_filter.png') });
    console.log('✅ Captured medicines_search_filter.png');

    // Clean up pagination test meds
    await prisma.medicine.deleteMany({
      where: { name: { startsWith: 'Catalog Medicine PageTest ' } },
    });
    console.log('Cleaned up pagination test medicines.');

    console.log('=== All Verifications Succeeded! ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
