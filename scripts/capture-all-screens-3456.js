const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('🚀 Starting Complete HMS Screen Capture on http://localhost:3456...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  async function capture(name, desc) {
    const filePath = path.join(screenshotsDir, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`✅ [${name}] ${desc}`);
  }

  // 1. Login Page
  console.log('\n--- 1. Login Page ---');
  await page.goto('http://localhost:3456/login', { waitUntil: 'networkidle2' });
  await capture('01-login.png', 'Clean Production Login Screen');

  // Submit login
  await page.type('input[name="email"]', 'admin@lifecare.com');
  await page.type('input[name="password"]', 'password123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  // 2. Dashboard Overview
  console.log('\n--- 2. Dashboard & Earnings ---');
  await page.goto('http://localhost:3456/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  await capture('02-dashboard-overview.png', 'Dashboard Overview with Metric Cards');

  // Notification Bell Popover
  const bellButton = await page.$('button[title="Notifications"], button:has(svg.lucide-bell), button.relative:has(svg)');
  if (bellButton) {
    await bellButton.click();
    await new Promise(r => setTimeout(r, 600));
    await capture('03-dashboard-notifications.png', 'Notifications Popover & Expiry/Stock Alerts');
    await bellButton.click(); // Close
    await new Promise(r => setTimeout(r, 400));
  }

  // Earnings Time Period Views
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), b);
    if (text === 'Daily') {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      await capture('05-dashboard-earnings-daily.png', 'Daily Earnings Analytics View');
    }
  }
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), b);
    if (text === 'Weekly') {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      await capture('06-dashboard-earnings-weekly.png', 'Weekly Earnings Analytics View');
    }
  }
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), b);
    if (text === 'Yearly') {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      await capture('07-dashboard-earnings-yearly.png', 'Yearly Earnings Analytics View');
    }
  }
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), b);
    if (text === 'Monthly') {
      await b.click();
      await new Promise(r => setTimeout(r, 600));
      await capture('04-dashboard-earnings-monthly.png', 'Monthly Earnings Analytics View');
    }
  }

  // 3. Patients Module
  console.log('\n--- 3. Patients Module ---');
  await page.goto('http://localhost:3456/patients', { waitUntil: 'networkidle2' });
  await capture('08-patients-list.png', 'Patients Directory List');

  // Register New Patient form
  await page.goto('http://localhost:3456/patients/new', { waitUntil: 'networkidle2' });
  await page.type('input[name="name"]', 'Muhammad Bilal');
  const phoneInput = await page.$('input[placeholder="3XX XXXXXXX"], input[placeholder="3XXXXXXXXX"], input[type="tel"]');
  if (phoneInput) {
    await phoneInput.type('03027891234');
    await new Promise(r => setTimeout(r, 400));
  }
  await capture('09-patient-register-phone-validation.png', 'Patient Registration with +92 Phone Input & Live Validation');

  // Patient Details & Edit (find first patient if exists)
  await page.goto('http://localhost:3456/patients', { waitUntil: 'networkidle2' });
  const viewLink = await page.$('a[href^="/patients/"]');
  if (viewLink) {
    const href = await page.evaluate(el => el.getAttribute('href'), viewLink);
    if (href && !href.includes('/new')) {
      await page.goto(`http://localhost:3456${href}`, { waitUntil: 'networkidle2' });
      await capture('10-patient-details.png', 'Patient Full Profile, Medical Records & Visit History');

      await page.goto(`http://localhost:3456${href}/edit`, { waitUntil: 'networkidle2' });
      await capture('11-patient-edit.png', 'Edit Patient Form with Standardized Phone Input');
    }
  }

  // 4. Doctors Module
  console.log('\n--- 4. Doctors Module ---');
  await page.goto('http://localhost:3456/doctors', { waitUntil: 'networkidle2' });
  await capture('13-doctors-list.png', 'Doctors Directory & Specializations');

  await page.goto('http://localhost:3456/doctors/new', { waitUntil: 'networkidle2' });
  await capture('14-doctor-new.png', 'Add New Doctor Profile & Consultation Fee');

  // 5. Appointments Module
  console.log('\n--- 5. Appointments Module ---');
  await page.goto('http://localhost:3456/appointments', { waitUntil: 'networkidle2' });
  await capture('16-appointments-list.png', 'Appointments Queue & Status Tracking');

  await page.goto('http://localhost:3456/appointments/new', { waitUntil: 'networkidle2' });
  await capture('17-appointment-new.png', 'Book New Patient Appointment Form');

  // 6. OPD Visits Module
  console.log('\n--- 6. OPD Visits Module ---');
  await page.goto('http://localhost:3456/opd', { waitUntil: 'networkidle2' });
  await capture('19-opd-visits-list.png', 'OPD Clinical Visits Directory');

  await page.goto('http://localhost:3456/opd/new', { waitUntil: 'networkidle2' });
  await capture('20-opd-visit-new.png', 'New OPD Clinical Consultation & Prescription Form');

  // 7. Pharmacy Module
  console.log('\n--- 7. Pharmacy Module ---');
  await page.goto('http://localhost:3456/pharmacy/medicines', { waitUntil: 'networkidle2' });
  await capture('21-pharmacy-medicines-batches.png', 'Pharmacy Inventory with FEFO Batches & Expiry Status');

  await page.goto('http://localhost:3456/pharmacy/medicines/new', { waitUntil: 'networkidle2' });
  await capture('22-pharmacy-medicine-new.png', 'Add New Medicine Product Form');

  // Wholesale Distributor Sale / POS
  await page.goto('http://localhost:3456/pharmacy/sales/new', { waitUntil: 'networkidle2' });
  const telInputs = await page.$$('input[type="tel"]');
  if (telInputs.length >= 1) await telInputs[0].type('03124567890');
  if (telInputs.length >= 2) await telInputs[1].type('03338901234');
  await new Promise(r => setTimeout(r, 400));
  await capture('23-pharmacy-distributor-sale-new.png', 'Wholesale Distributor POS with +92 Customer Phone & Salesman Mobile');

  await page.goto('http://localhost:3456/pharmacy/sales', { waitUntil: 'networkidle2' });
  await capture('24-pharmacy-sales-history.png', 'Pharmacy Sales & Wholesale Invoices History');

  await page.goto('http://localhost:3456/pharmacy/returns', { waitUntil: 'networkidle2' });
  await capture('25-pharmacy-daily-returns.png', 'Daily Sale Returns & Batch Stock Restoration Report');

  await page.goto('http://localhost:3456/pharmacy/returns/new', { waitUntil: 'networkidle2' });
  await capture('26-pharmacy-return-new.png', 'Process Sale Return Form');

  await page.goto('http://localhost:3456/pharmacy/expiry-report', { waitUntil: 'networkidle2' });
  await capture('27-pharmacy-expiry-report.png', 'Medicine Expiry Risk Analysis & Safety Audit');

  await page.goto('http://localhost:3456/pharmacy/suppliers', { waitUntil: 'networkidle2' });
  await capture('28-pharmacy-suppliers-list.png', 'Medicine Suppliers Directory');

  await page.goto('http://localhost:3456/pharmacy/suppliers/new', { waitUntil: 'networkidle2' });
  const suppPhone = await page.$('input[type="tel"]');
  if (suppPhone) await suppPhone.type('03456789012');
  await new Promise(r => setTimeout(r, 400));
  await capture('29-pharmacy-supplier-new.png', 'Add Supplier Form with +92 Phone Input');

  await page.goto('http://localhost:3456/pharmacy/purchases', { waitUntil: 'networkidle2' });
  await capture('30-pharmacy-purchases-list.png', 'Stock Purchases & Goods Received Notes (GRN)');

  await page.goto('http://localhost:3456/pharmacy/purchases/new', { waitUntil: 'networkidle2' });
  await capture('31-pharmacy-purchase-new.png', 'New Medicine Purchase & Batch Stock Inward Entry');

  // 8. Laboratory Module
  console.log('\n--- 8. Laboratory Module ---');
  await page.goto('http://localhost:3456/lab/tests', { waitUntil: 'networkidle2' }).catch(() => page.goto('http://localhost:3456/lab-tests', { waitUntil: 'networkidle2' }));
  await capture('32-lab-tests-list.png', 'Laboratory Test Directory & Parameter Reference Ranges');

  await page.goto('http://localhost:3456/lab/tests/new', { waitUntil: 'networkidle2' }).catch(() => {});
  await capture('33-lab-test-new.png', 'Add Diagnostic Test & Reference Parameter Range Form');

  await page.goto('http://localhost:3456/lab/orders', { waitUntil: 'networkidle2' }).catch(() => page.goto('http://localhost:3456/lab-orders', { waitUntil: 'networkidle2' }));
  await capture('34-lab-orders-list.png', 'Lab Diagnostic Orders & Sample Processing Queue');

  await page.goto('http://localhost:3456/lab/orders/new', { waitUntil: 'networkidle2' }).catch(() => {});
  await capture('35-lab-order-new.png', 'Create New Diagnostic Lab Order Form');

  // 9. Billing Module
  console.log('\n--- 9. Billing Module ---');
  await page.goto('http://localhost:3456/billing', { waitUntil: 'networkidle2' });
  await capture('36-billing-invoices-list.png', 'Hospital Billing Invoices & Multi-Department Receipts');

  // 10. Settings / Profile Module
  console.log('\n--- 10. Settings & Profile ---');
  await page.goto('http://localhost:3456/settings', { waitUntil: 'networkidle2' }).catch(() => page.goto('http://localhost:3456/profile', { waitUntil: 'networkidle2' }));
  await capture('37-settings-profile.png', 'System Settings & Clinic Configuration');

  await browser.close();
  console.log('\n🎉 Complete HMS Screen Capture Completed Successfully on Port 3456!');
}

run().catch(err => {
  console.error('Screen Capture Error:', err);
  process.exit(1);
});
