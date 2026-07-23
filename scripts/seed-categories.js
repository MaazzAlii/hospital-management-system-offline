const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey || supabaseKey.startsWith('[YOUR-SERVICE-ROLE-SECRET-KEY]')) {
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment'];

async function seed() {
  console.log("Seeding medicine categories...");

  for (const cat of categories) {
    // Check if category exists
    const { data: existing, error: fetchError } = await supabase
      .from('MedicineCategory')
      .select('id')
      .eq('name', cat)
      .maybeSingle();

    if (fetchError) {
      console.error(`Error checking category ${cat}:`, fetchError.message);
      continue;
    }

    if (existing) {
      console.log(`Category "${cat}" already exists.`);
    } else {
      const { error: insertError } = await supabase
        .from('MedicineCategory')
        .insert([{ name: cat }]);

      if (insertError) {
        console.error(`Error inserting category ${cat}:`, insertError.message);
      } else {
        console.log(`Inserted category "${cat}" successfully.`);
      }
    }
  }

  console.log("Seeding completed!");
}

seed();
