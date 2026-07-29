const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log("Testing Login with Admin...");
  await page.goto('http://localhost:3000/login');
  
  await page.type('input[type="email"]', 'admin@lifecare.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log("Navigation timeout or no navigation."));

  const currentUrl = page.url();
  console.log("Current URL after login:", currentUrl);

  if (currentUrl.includes('/dashboard')) {
    console.log("Admin Login Successful! Redirected to /dashboard.");
  } else {
    console.log("Admin Login Failed or did not redirect to /dashboard.");
    const html = await page.content();
    console.log("Page title:", await page.title());
    await page.screenshot({ path: 'admin_login_error.png' });
    
    // Quick test over, let's close to report
    await browser.close();
    return;
  }

  console.log("Testing Receptionist...");
  await page.goto('http://localhost:3000/login');
  await page.type('input[type="email"]', 'reception@lifecare.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log("Navigation issue."));
  
  console.log("Receptionist URL:", page.url());
  await page.screenshot({ path: 'reception_dashboard.png' });

  console.log("Navigating to /billing/new...");
  await page.goto('http://localhost:3000/billing/new', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'reception_billing_new.png' });

  console.log("Testing direct URL access to /pharmacy/medicines...");
  await page.goto('http://localhost:3000/pharmacy/medicines', { waitUntil: 'networkidle0' });
  console.log("Receptionist Pharmacy URL:", page.url());
  await page.screenshot({ path: 'reception_pharmacy_medicines.png' });

  console.log("Testing Doctor...");
  await page.goto('http://localhost:3000/login');
  await page.type('input[type="email"]', 'doctor@lifecare.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log("Navigation issue."));
  
  console.log("Doctor URL:", page.url());
  await page.screenshot({ path: 'doctor_dashboard.png' });

  await browser.close();
})();
