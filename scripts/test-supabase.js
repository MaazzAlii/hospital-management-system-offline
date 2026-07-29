require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from("Doctor").select("id, specialization, User (name)").eq("isActive", true).order("createdAt", { ascending: true });
  console.log("Doctors:", data, error);
}
main();
