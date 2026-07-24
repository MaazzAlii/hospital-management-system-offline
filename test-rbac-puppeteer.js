const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\hamma\\.gemini\\antigravity-ide\\brain\\c19e3534-b2c0-48a9-afbe-58fdf0dfdba7\\scratch';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runTest() {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Receptionist
    console.log('\\n--- Testing Receptionist ---');
    await login(page, 'reception@lifecare.com', 'password123');
    
    await testAccess(page, 'reception-pharmacy', 'http://localhost:3000/pharmacy/medicines');
    await testAccess(page, 'reception-lab', 'http://localhost:3000/lab/orders');
    await testAccess(page, 'reception-settings', 'http://localhost:3000/settings');

    console.log('Logging out receptionist...');
    await page.goto('http://localhost:3000/login'); // Going back to login page if logout is not readily found
    // To clear session, we can just clear cookies
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    // Test 2: Doctor
    console.log('\\n--- Testing Doctor ---');
    await login(page, 'doctor@lifecare.com', 'password123');
    
    await testAccess(page, 'doctor-billing', 'http://localhost:3000/billing');
    await testAccess(page, 'doctor-pharmacy', 'http://localhost:3000/pharmacy/medicines');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

async function login(page, email, password) {
  console.log(`Logging in as ${email}...`);
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log(`Successfully logged in as ${email}. Current URL: ${page.url()}`);
}

async function testAccess(page, name, targetUrl) {
  console.log(`Testing access to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle0' });
  const finalUrl = page.url();
  console.log(`Final URL after navigating to ${targetUrl} is: ${finalUrl}`);
  
  const screenshotPath = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);
  
  if (finalUrl !== targetUrl) {
    console.log(`SUCCESS: Redirected from ${targetUrl} to ${finalUrl}`);
  } else {
    console.log(`WARNING: Did NOT redirect from ${targetUrl}. Page loaded.`);
  }
}

runTest();
