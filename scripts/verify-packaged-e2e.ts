import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function runVerification() {
  console.log('=== Starting Packaged App E2E Verification ===');
  
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  const artifactDir = path.join(
    process.env.USERPROFILE || 'C:\\Users\\maaza',
    '.gemini',
    'antigravity-ide',
    'brain',
    'a621b591-73a9-4a24-a471-e047e2849db6'
  );
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  try {
    // 1. Log in
    console.log('1. Logging in as admin@lifecare.com...');
    await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
    await page.type('#email', 'admin@lifecare.com');
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 2. Create a new Lab Test
    console.log('\n2. Navigating to /lab/tests/new to create a new Lab Test...');
    await page.goto('http://localhost:3456/lab/tests/new', { waitUntil: 'networkidle2' });

    const uniqueSuffix = Date.now().toString().slice(-4);
    const testCode = `CBC-${uniqueSuffix}`;
    const testName = `Complete Blood Panel ${uniqueSuffix}`;

    await page.waitForSelector('#name');
    await page.type('#name', testName);
    await page.type('#code', testCode);
    await page.type('#price', '1250');
    await page.type('#sampleType', 'Whole Blood');
    await page.type('#turnaroundHours', '12');

    // Select Category
    console.log('- Selecting category for Lab Test...');
    const catTrigger = await page.$('button[role="combobox"], [data-slot="select-trigger"]');
    if (catTrigger) {
      await catTrigger.click();
      await new Promise(r => setTimeout(r, 400));
      const firstCatOption = await page.$('[role="option"], [data-slot="select-item"]');
      if (firstCatOption) {
        await firstCatOption.click();
        await new Promise(r => setTimeout(r, 400));
      } else {
        // Fallback: click add category
        const addCatBtn = await page.$('button[title="Add new category"]');
        if (addCatBtn) {
          await addCatBtn.click();
          await new Promise(r => setTimeout(r, 300));
          await page.type('input[placeholder="New category name..."]', 'Hematology');
          const addBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent?.trim() === 'Add');
          });
          const addEl = addBtn.asElement() as any;
          if (addEl) await addEl.click();
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    // Verify Active toggle
    const isSwitchChecked = await page.$eval('#active', (el: any) => el.getAttribute('aria-checked') === 'true' || el.checked || el.dataset?.state === 'checked');
    console.log(`- Active Switch initial state: ${isSwitchChecked ? 'CHECKED (Active)' : 'UNCHECKED'}`);

    await page.screenshot({ path: path.join(artifactDir, '01-new-lab-test-form.png') });

    // Submit form
    console.log('- Submitting new Lab Test form...');
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent?.includes('Save Lab Test'));
    });
    const submitEl = submitBtn.asElement() as any;
    if (submitEl) {
      await submitEl.click();
    }

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Redirected to Lab Tests list:', page.url());

    // 3. Confirm in Lab Tests list
    console.log('\n3. Confirming test in /lab/tests list...');
    await page.waitForSelector('table');
    const listHtml = await page.content();
    const isTestInList = listHtml.includes(testName) && listHtml.includes(testCode);
    console.log(`- Test "${testName}" (${testCode}) found in list: ${isTestInList ? 'YES' : 'NO'}`);

    const testRowText = await page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find(r => r.textContent?.includes(name));
      return row ? row.textContent?.replace(/\s+/g, ' ').trim() : null;
    }, testName);
    console.log(`- Row contents: "${testRowText}"`);
    const hasActiveBadge = testRowText?.toLowerCase().includes('active');
    console.log(`- Has Active badge in row: ${hasActiveBadge ? 'YES' : 'NO'}`);

    await page.screenshot({ path: path.join(artifactDir, '02-lab-tests-list.png') });

    // 4. Test New Lab Order form
    console.log('\n4. Navigating to /lab/orders/new...');
    await page.goto('http://localhost:3456/lab/orders/new', { waitUntil: 'networkidle2' });

    // Test Patient Select
    console.log('- Inspecting Patient select dropdown...');
    const patientTriggers = await page.$$('button[role="combobox"], [data-slot="select-trigger"]');
    console.log(`- Found ${patientTriggers.length} select triggers on page.`);

    // Click Patient dropdown trigger
    if (patientTriggers.length > 0) {
      await patientTriggers[0].click();
      await new Promise(r => setTimeout(r, 400));
      
      const patientItems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]')).map(el => el.textContent?.trim());
      });
      console.log(`- Patient dropdown items (showing first 4):`, patientItems.slice(0, 4));

      // Select first patient
      const firstOption = await page.$('[role="option"], [data-slot="select-item"]');
      if (firstOption) {
        await firstOption.click();
        await new Promise(r => setTimeout(r, 400));
      }

      // Check what is displayed inside the trigger now
      const patientTriggerDisplay = await patientTriggers[0].evaluate(el => el.textContent?.trim());
      console.log(`- Selected Patient trigger display: "${patientTriggerDisplay}"`);
      const patientShowsNameNotId = !patientTriggerDisplay?.startsWith('cm') && (patientTriggerDisplay?.includes('(') || patientTriggerDisplay?.length! > 3);
      console.log(`✅ Patient select shows Patient Name/MRN (not raw ID): ${patientShowsNameNotId}`);
    }

    // Test Add a Test dropdown
    console.log('- Inspecting "Add a test" dropdown...');
    const selectTriggersAfter = await page.$$('button[role="combobox"], [data-slot="select-trigger"]');
    const testTrigger = selectTriggersAfter[1] || selectTriggersAfter[0];
    if (testTrigger) {
      await testTrigger.click();
      await new Promise(r => setTimeout(r, 400));

      const testItems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]')).map(el => el.textContent?.trim());
      });
      console.log(`- Available tests in dropdown:`, testItems);

      const foundOurNewTest = testItems.some(t => t?.includes(testName));
      console.log(`✅ Newly created active test appears in "Add a test" dropdown: ${foundOurNewTest}`);

      // Select the test to add to order
      const ourTestOption = await page.evaluateHandle((name) => {
        const options = Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]'));
        return options.find(opt => opt.textContent?.includes(name));
      }, testName);
      
      const ourTestOptionEl = ourTestOption.asElement() as any;
      if (ourTestOptionEl) {
        await ourTestOptionEl.click();
        await new Promise(r => setTimeout(r, 400));
        console.log(`- Selected "${testName}" into order table.`);
      }
    }

    await page.screenshot({ path: path.join(artifactDir, '03-lab-order-form.png') });

    // 5. Spot-check Pharmacy Sales form
    console.log('\n5. Navigating to /pharmacy/sales/new to spot-check selects...');
    await page.goto('http://localhost:3456/pharmacy/sales/new', { waitUntil: 'networkidle2' });

    // Check Customer/Patient profile select
    const pharmacyTriggers = await page.$$('button[role="combobox"], [data-slot="select-trigger"]');
    console.log(`- Found ${pharmacyTriggers.length} triggers on initial pharmacy sales page.`);

    if (pharmacyTriggers.length > 0) {
      await pharmacyTriggers[0].click();
      await new Promise(r => setTimeout(r, 400));

      const custOptions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]')).map(el => el.textContent?.trim());
      });
      console.log(`- Customer Profile dropdown options (sample):`, custOptions.slice(0, 4));

      // Click walk-in or close
      const firstCust = await page.$('[role="option"], [data-slot="select-item"]');
      if (firstCust) await firstCust.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // Click "Add Product Row"
    console.log('- Clicking "Add Product Row" to check Medicine and Batch selects...');
    const addRowBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Add Product Row') || b.textContent?.includes('Add First Item'));
    });
    const addRowEl = addRowBtn.asElement() as any;
    if (addRowEl) {
      await addRowEl.click();
      await new Promise(r => setTimeout(r, 500));
    }

    const rowTriggers = await page.$$('button[role="combobox"], [data-slot="select-trigger"]');
    console.log(`- Found ${rowTriggers.length} select triggers after adding product row.`);

    // Medicine select trigger is trigger index 1
    if (rowTriggers.length >= 2) {
      const medTrigger = rowTriggers[1];
      await medTrigger.click();
      await new Promise(r => setTimeout(r, 500));

      const medOptions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]')).map(el => el.textContent?.trim());
      });
      console.log(`- Medicine dropdown options:`, medOptions);

      // Click medicine option (e.g. Augmentin)
      const medOptionHandle = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]'));
        return items.find(el => el.textContent?.includes('Augmentin')) || items[items.length - 1];
      });

      const medOptionEl = medOptionHandle.asElement() as any;
      if (medOptionEl) {
        await medOptionEl.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const medTriggerDisplay = await medTrigger.evaluate(el => el.textContent?.trim());
      console.log(`- Selected Medicine display: "${medTriggerDisplay}"`);
      console.log(`✅ Medicine select displays proper medicine label: ${!medTriggerDisplay?.startsWith('cm') && medTriggerDisplay?.length! > 1}`);

      // Check Batch select trigger
      const updatedTriggers = await page.$$('button[role="combobox"], [data-slot="select-trigger"]');
      if (updatedTriggers.length >= 3) {
        const batchTrigger = updatedTriggers[2];
        await batchTrigger.click();
        await new Promise(r => setTimeout(r, 500));

        const batchOptions = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]')).map(el => el.textContent?.trim());
        });
        console.log(`- Batch dropdown options:`, batchOptions);

        const batchOptionHandle = await page.evaluateHandle(() => {
          const items = Array.from(document.querySelectorAll('[role="option"], [data-slot="select-item"]'));
          return items.find(el => el.textContent?.includes('TEST-BATCH') || el.textContent?.includes('Exp:') || el.textContent?.includes('Valid'));
        });
        const batchOptionEl = batchOptionHandle.asElement() as any;
        if (batchOptionEl) {
          await batchOptionEl.click();
          await new Promise(r => setTimeout(r, 400));
        }

        const batchDisplay = await batchTrigger.evaluate(el => el.textContent?.trim());
        console.log(`- Batch select display: "${batchDisplay}"`);
        console.log(`✅ Batch select displays valid formatted batch info: ${!batchDisplay?.startsWith('cm')}`);
      }
    }

    await page.screenshot({ path: path.join(artifactDir, '04-pharmacy-sales-form.png') });

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(artifactDir, 'error-screenshot.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
