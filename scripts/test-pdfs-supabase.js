const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('Testing PDF generation endpoints...\n');

  // 1. Get a Lab Order
  const { data: labOrders, error: err1 } = await supabase.from('LabOrder').select('id').limit(1);
  if (labOrders && labOrders.length > 0) {
    const labOrderId = labOrders[0].id;
    console.log(`[Lab Report] Testing with ID: ${labOrderId}`);
    const res = await fetch(`http://localhost:3000/api/pdf/lab-report/${labOrderId}`);
    console.log(`[Lab Report] Status: ${res.status}`);
    console.log(`[Lab Report] Content-Type: ${res.headers.get('content-type')}`);
    if (res.status === 200 && res.headers.get('content-type') === 'application/pdf') {
      console.log(`✅ Lab Report PDF generated successfully.\n`);
    } else {
      console.error(`❌ Lab Report PDF generation failed.\n`);
      console.error(await res.text());
    }
  } else {
    console.log(`⚠️ No Lab Orders found in the database to test.\n`);
  }

  // 2. Get an Invoice
  const { data: invoices, error: err2 } = await supabase.from('Invoice').select('id').limit(1);
  if (invoices && invoices.length > 0) {
    const invoiceId = invoices[0].id;
    console.log(`[Invoice] Testing with ID: ${invoiceId}`);
    const res = await fetch(`http://localhost:3000/api/pdf/invoice/${invoiceId}`);
    console.log(`[Invoice] Status: ${res.status}`);
    console.log(`[Invoice] Content-Type: ${res.headers.get('content-type')}`);
    if (res.status === 200 && res.headers.get('content-type') === 'application/pdf') {
      console.log(`✅ Invoice PDF generated successfully.\n`);
    } else {
      console.error(`❌ Invoice PDF generation failed.\n`);
      console.error(await res.text());
    }
  } else {
    console.log(`⚠️ No Invoices found in the database to test.\n`);
  }
}

runTests().catch(console.error);
