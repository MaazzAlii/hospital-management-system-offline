const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const m = line.match(/^([^#][^=]*)=(.*)/);
  if (m) {
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1].trim()] = v;
  }
});

const { createClient } = require('@supabase/supabase-js');
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

c.auth.signInWithPassword({ email: 'admin@lifecare.com', password: 'password123' }).then(r => {
  if (r.error) {
    console.log('ERROR:', JSON.stringify(r.error));
    console.log('Status:', r.error.status);
    console.log('Code:', r.error.code);
    console.log('Message:', r.error.message);
  } else {
    console.log('SUCCESS - user id:', r.data.user.id);
  }
});
