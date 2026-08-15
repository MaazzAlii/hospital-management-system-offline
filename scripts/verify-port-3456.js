const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  console.log('--- Step 1: Login Page on http://localhost:3456/login ---');
  await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
  
  // Verify test credentials block is absent
  const pageContent = await page.content();
  const hasTestAccounts = pageContent.includes('Test Accounts') || pageContent.includes('password123');
  console.log(`Test accounts block present on login page: ${hasTestAccounts}`);
  
  await page.screenshot({ path: path.join(screenshotsDir, 'live_login_3456.png'), fullPage: false });
  console.log('Saved live_login_3456.png');

  // Fill in login credentials
  await page.type('input[name="email"]', 'admin@lifecare.com');
  await page.type('input[name="password"]', 'password123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  console.log(`Current URL after login: ${page.url()}`);

  console.log('--- Step 2: Dashboard & Notification Dropdown on http://localhost:3456/dashboard ---');
  await page.goto('http://localhost:3456/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Find notification bell and click it
  const bellButton = await page.$('button[title="Notifications"], button:has(svg.lucide-bell), button.relative:has(svg)');
  if (bellButton) {
    await bellButton.click();
    await new Promise(r => setTimeout(r, 800));
    console.log('Clicked notification bell');
  } else {
    console.log('Could not find bell button by selector, searching buttons...');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerHTML, b);
      if (text.includes('lucide-bell') || text.includes('bell') || text.includes('Notifications')) {
        await b.click();
        await new Promise(r => setTimeout(r, 800));
        break;
      }
    }
  }

  await page.screenshot({ path: path.join(screenshotsDir, 'live_notification_dropdown_3456.png'), fullPage: false });
  console.log('Saved live_notification_dropdown_3456.png');

  console.log('--- Step 3: Register Patient Pakistani Phone Input on http://localhost:3456/patients/new ---');
  await page.goto('http://localhost:3456/patients/new', { waitUntil: 'networkidle2' });
  
  // Fill sample name and phone
  await page.type('input[name="name"]', 'Ali Raza');
  const phoneInput = await page.$('input[placeholder="3XX XXXXXXX"], input[placeholder="3XXXXXXXXX"], input[type="tel"]');
  if (phoneInput) {
    await phoneInput.type('03001234567');
    await new Promise(r => setTimeout(r, 500));
    console.log('Typed 03001234567 into phone input');
  }

  await page.screenshot({ path: path.join(screenshotsDir, 'live_patient_phone_input_3456.png'), fullPage: false });
  console.log('Saved live_patient_phone_input_3456.png');

  console.log('--- Step 4: Pharmacy Sales Phone Inputs on http://localhost:3456/pharmacy/sales/new ---');
  await page.goto('http://localhost:3456/pharmacy/sales/new', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const telInputs = await page.$$('input[type="tel"]');
  if (telInputs.length >= 1) {
    await telInputs[0].type('03219876543');
  }
  if (telInputs.length >= 2) {
    await telInputs[1].type('03335551234');
  }
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(screenshotsDir, 'live_pharmacy_phone_input_3456.png'), fullPage: false });
  console.log('Saved live_pharmacy_phone_input_3456.png');

  console.log('--- Step 5: Supplier Phone Input on http://localhost:3456/pharmacy/suppliers/new ---');
  await page.goto('http://localhost:3456/pharmacy/suppliers/new', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const supplierPhone = await page.$('input[type="tel"]');
  if (supplierPhone) {
    await supplierPhone.type('03451122334');
  }
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(screenshotsDir, 'live_supplier_phone_input_3456.png'), fullPage: false });
  console.log('Saved live_supplier_phone_input_3456.png');

  await browser.close();
  console.log('--- Port 3456 Verification Completed Successfully ---');
}

run().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
