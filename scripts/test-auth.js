// Quick script to test Supabase Auth login directly
const fs = require('fs');

// Load .env
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', url);
console.log('Has anon key:', !!anonKey);
console.log('Has service key:', !!serviceKey && !serviceKey.includes('[YOUR'));

async function main() {
  // 1. Try logging in with anon client (same as the app does)
  const client = createClient(url, anonKey);
  
  const emails = ['admin@lifecare.com', 'reception@lifecare.com', 'doctor@lifecare.com'];
  
  for (const email of emails) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: 'password123',
    });
    if (error) {
      console.log(`❌ ${email}: ${error.message}`);
    } else {
      console.log(`✅ ${email}: logged in! user.id = ${data.user.id}`);
      await client.auth.signOut();
    }
  }

  // 2. If service key is available, list auth users
  if (serviceKey && !serviceKey.includes('[YOUR')) {
    console.log('\n--- Supabase Auth Users ---');
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      console.log('Error listing users:', listErr.message);
    } else {
      console.log(`Found ${users.length} auth user(s):`);
      users.forEach(u => console.log(`  - ${u.email} (confirmed: ${!!u.email_confirmed_at})`));
    }
  } else {
    console.log('\n⚠️  No SUPABASE_SERVICE_ROLE_KEY set - cannot list auth users');
    console.log('   Go to Supabase Dashboard → Settings → API to get your service_role key');
  }
}

main().catch(console.error);
