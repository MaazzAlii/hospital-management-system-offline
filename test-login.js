const http = require('http');

async function testLogin() {
  console.log('Testing GET /login...');
  const res = await fetch('http://localhost:3000/login');
  console.log('GET /login status:', res.status);

  const text = await res.text();

  // Extract Action ID from the form or just try to see if the page loads
  if (text.includes('Sign in to your account')) {
    console.log('Login page loaded successfully.');
  } else {
    console.log('Login page did not load.');
  }

  // Actually we need to submit a form, but Next.js Server Actions require special headers.
  // It's easier to just use Puppeteer for the full login test.
}

testLogin().catch(console.error);
