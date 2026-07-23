import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  const { data: patients, error: pErr } = await supabase.from('Patient').select('id, name');
  console.log('Patients:', patients, pErr);

  const { data: appts, error: aErr } = await supabase.from('Appointment').select('id, patientId, doctorId, status');
  console.log('Appointments:', appts, aErr);

  const { data: invoices, error: iErr } = await supabase.from('Invoice').select('id, total, status');
  console.log('Invoices:', invoices, iErr);
}

checkDB();
