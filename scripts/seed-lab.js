const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedLab() {
  console.log('--- Seeding Lab Module ---');

  // 1. Categories
  const categories = ['Hematology', 'Biochemistry', 'Clinical Pathology'];
  const categoryMap = {};

  for (const name of categories) {
    const { data: existing } = await supabase.from('LabCategory').select('id, name').eq('name', name).maybeSingle();
    if (existing) {
      console.log(`Category exists: ${name}`);
      categoryMap[name] = existing.id;
    } else {
      const { data: created, error } = await supabase.from('LabCategory').insert({ name }).select('id, name').single();
      if (error) {
        console.error(`Error creating category ${name}:`, error.message);
      } else {
        console.log(`Created category: ${name}`);
        categoryMap[name] = created.id;
      }
    }
  }

  // 2. Tests
  const tests = [
    {
      name: 'Complete Blood Count (CBC)',
      code: 'CBC-01',
      category: 'Hematology',
      price: 800,
      sampleType: 'Blood',
      turnaroundHours: 4
    },
    {
      name: 'Blood Sugar Fasting (BSF)',
      code: 'BSF-02',
      category: 'Biochemistry',
      price: 300,
      sampleType: 'Blood',
      turnaroundHours: 2
    },
    {
      name: 'Urine Routine Examination (R/E)',
      code: 'URE-03',
      category: 'Clinical Pathology',
      price: 250,
      sampleType: 'Urine',
      turnaroundHours: 2
    }
  ];

  for (const t of tests) {
    const categoryId = categoryMap[t.category];
    if (!categoryId) continue;

    const { data: existing } = await supabase.from('LabTest').select('id').eq('code', t.code).maybeSingle();
    
    if (existing) {
      console.log(`Test exists: ${t.name}`);
    } else {
      const { data: created, error } = await supabase.from('LabTest').insert({
        name: t.name,
        code: t.code,
        categoryId: categoryId,
        price: t.price,
        sampleType: t.sampleType,
        turnaroundHours: t.turnaroundHours
      }).select().single();

      if (error) {
        console.error(`Error creating test ${t.name}:`, error.message);
      } else {
        console.log(`Created test: ${t.name}`);
        
        // 3. Add some basic Reference Ranges for CBC Hemoglobin as an example
        if (t.code === 'CBC-01') {
           await supabase.from('ReferenceRange').insert([
             {
               testId: created.id,
               gender: 'Male',
               lowValue: 13.8,
               highValue: 17.2,
               unit: 'g/dL',
               notes: 'Adult Male Hemoglobin'
             },
             {
               testId: created.id,
               gender: 'Female',
               lowValue: 12.1,
               highValue: 15.1,
               unit: 'g/dL',
               notes: 'Adult Female Hemoglobin'
             }
           ]);
           console.log(`Added reference ranges for ${t.name}`);
        } else if (t.code === 'BSF-02') {
           await supabase.from('ReferenceRange').insert([
             {
               testId: created.id,
               gender: 'All',
               lowValue: 70,
               highValue: 100,
               unit: 'mg/dL',
               notes: 'Fasting Blood Sugar'
             }
           ]);
           console.log(`Added reference ranges for ${t.name}`);
        }
      }
    }
  }
  
  console.log('--- Seeding Complete ---');
}

seedLab().catch(console.error);
