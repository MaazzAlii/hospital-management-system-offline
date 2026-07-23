const fs = require('fs');

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

const supabase = createClient(url, anonKey);

async function main() {
  // First, authenticate as admin to get RLS pass (if RLS is enabled)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@lifecare.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  // Find latest MRN
  const year = new Date().getFullYear();
  const prefix = `LCC-${year}-`;
  
  const { data: latestPatients, error: fetchError } = await supabase
    .from('Patient')
    .select('mrn')
    .ilike('mrn', `${prefix}%`)
    .order('mrn', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("Error fetching latest patient:", fetchError);
    return;
  }

  let sequence = 1;
  if (latestPatients && latestPatients.length > 0) {
    const lastMrn = latestPatients[0].mrn;
    const lastSeq = parseInt(lastMrn.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  const mrn = `${prefix}${String(sequence).padStart(4, "0")}`;

  // Insert new patient
  const { data, error } = await supabase
    .from('Patient')
    .insert({
      mrn,
      name: 'Test Patient MCP',
      dob: '1990-01-01',
      gender: 'Male',
      phone: '0300-1234567',
      address: 'Test Address',
      bloodGroup: 'O+'
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting patient:", error);
  } else {
    console.log("Successfully inserted patient:");
    console.log(data);
  }
}

main();
