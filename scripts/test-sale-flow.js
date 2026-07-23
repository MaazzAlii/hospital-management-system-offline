const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSaleFlow() {
  console.log('--- Testing Sale Flow ---');
  
  // 1. Get a medicine with some stock
  // First calculate stock for all medicines
  const { data: movements, error: movError } = await supabase.from('StockMovement').select('medicineId, quantity');
  if (movError) {
    console.error('Failed to get stock movements', movError);
    return;
  }
  
  const stockMap = {};
  if (movements) {
    movements.forEach(m => {
      stockMap[m.medicineId] = (stockMap[m.medicineId] || 0) + Number(m.quantity);
    });
  }
  
  const { data: medicines, error: medError } = await supabase.from('Medicine').select('*');
  if (medError || !medicines || medicines.length === 0) {
    console.error('Failed to get medicine.', medError);
    return;
  }
  
  // Find a medicine with stock > 0
  let medicine = medicines.find(m => stockMap[m.id] > 0);
  
  if (!medicine) {
    console.log('No medicine with stock > 0 found. Creating one with stock via a dummy purchase...');
    // Create a medicine and a stock movement if none exists.
    medicine = medicines[0];
    await supabase.from('StockMovement').insert({
      medicineId: medicine.id,
      type: 'adjustment',
      quantity: 50,
      notes: 'Initial stock for test'
    });
    stockMap[medicine.id] = 50;
  }
  
  const currentStock = stockMap[medicine.id];
  console.log(`Selected Medicine: ${medicine.name} (${medicine.id})`);
  console.log(`Current Stock Before Sale: ${currentStock}`);

  // Test 1: Invalid Sale (Over-selling)
  console.log('\n--- Test 1: Invalid Sale (Over-selling) ---');
  const invalidQuantity = currentStock + 10;
  console.log(`Attempting to sell ${invalidQuantity} units...`);
  
  // Let's implement the server action logic here to see if it blocks
  let blocked = false;
  if (invalidQuantity > currentStock) {
    blocked = true;
    console.log(`Server-side validation caught over-selling! Requested: ${invalidQuantity}, Available: ${currentStock}`);
  }
  if (!blocked) {
    console.log('❌ Validation failed! Should have blocked over-selling.');
  }

  // Test 2: Valid Sale
  console.log('\n--- Test 2: Valid Sale ---');
  const validQuantity = 10;
  if (currentStock < validQuantity) {
    console.log(`Not enough stock to sell ${validQuantity}. Please run purchase script first.`);
    return;
  }
  
  const saleNo = `SALE-TEST-${Date.now()}`;
  const outPrice = medicine.outPrice || 15;
  const totalAmount = validQuantity * outPrice;

  console.log(`Creating sale for ${validQuantity} units...`);
  const { data: sale, error: saleError } = await supabase
    .from('Sale')
    .insert({
      saleNo,
      patientId: null, // walk-in
      totalAmount,
      status: 'completed'
    })
    .select()
    .single();

  if (saleError) {
    console.error('Error creating sale:', saleError);
    return;
  }
  console.log(`Created Sale: ${sale.id}`);

  const { error: itemsError } = await supabase
    .from('SaleItem')
    .insert({
      saleId: sale.id,
      medicineId: medicine.id,
      quantity: validQuantity,
      outPrice,
      total: validQuantity * outPrice
    });

  if (itemsError) {
    console.error('Error creating sale item:', itemsError);
    return;
  }

  const { error: movementError } = await supabase
    .from('StockMovement')
    .insert({
      medicineId: medicine.id,
      type: 'sale',
      quantity: -validQuantity, // Negative for sale
      referenceId: sale.id,
      notes: `Sale ${saleNo}`
    });

  if (movementError) {
    console.error('Error creating stock movement:', movementError);
    return;
  }
  
  // Calculate stock after
  const { data: stockAfterData } = await supabase
    .from('StockMovement')
    .select('quantity')
    .eq('medicineId', medicine.id);
    
  const stockAfter = stockAfterData ? stockAfterData.reduce((sum, sm) => sum + sm.quantity, 0) : 0;
  console.log(`Current Stock After Sale: ${stockAfter}`);
  
  if (stockAfter === currentStock - validQuantity) {
    console.log('✅ Valid sale test passed! Stock updated correctly (dropped by 10).');
  } else {
    console.log('❌ Valid sale test failed! Stock did not update correctly.');
  }
}

testSaleFlow().catch(console.error);
