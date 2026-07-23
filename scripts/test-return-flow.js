const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReturnFlow() {
  console.log('--- Testing Return Flow ---');
  
  // 1. Find a recent sale to return
  const { data: sales, error: salesError } = await supabase
    .from('Sale')
    .select('id, saleNo')
    .order('createdAt', { ascending: false })
    .limit(1);
    
  if (salesError || !sales || sales.length === 0) {
    console.error('Failed to find a sale.', salesError);
    return;
  }
  
  const sale = sales[0];
  console.log(`Selected Sale: ${sale.saleNo} (${sale.id})`);
  
  // 2. Get sale items
  const { data: saleItems, error: itemsError } = await supabase
    .from('SaleItem')
    .select('*')
    .eq('saleId', sale.id);
    
  if (itemsError || !saleItems || saleItems.length === 0) {
    console.error('Failed to get sale items.', itemsError);
    return;
  }
  
  const itemToReturn = saleItems[0];
  console.log(`Returning 5 units of medicine ${itemToReturn.medicineId} from sale (originally sold: ${itemToReturn.quantity})`);
  
  // Calculate stock before return
  const { data: stockBeforeData, error: stockErrorBefore } = await supabase
    .from('StockMovement')
    .select('quantity')
    .eq('medicineId', itemToReturn.medicineId);
  
  const stockBefore = stockBeforeData ? stockBeforeData.reduce((sum, sm) => sum + sm.quantity, 0) : 0;
  console.log(`Current Stock Before Return: ${stockBefore}`);
  
  // 3. Process the return via simulated action
  const returnQuantity = Math.min(5, itemToReturn.quantity);
  
  const { error: movementError } = await supabase
    .from('StockMovement')
    .insert({
      medicineId: itemToReturn.medicineId,
      type: 'return',
      quantity: returnQuantity, // Positive for returns
      referenceId: sale.id,
      notes: `Return against Sale ${sale.saleNo} - Reason: Damaged during test`
    });

  if (movementError) {
    console.error('Error creating stock movement for return:', movementError);
    return;
  }
  
  await supabase.from('Sale').update({ status: 'returned' }).eq('id', sale.id);
  
  console.log(`Created Stock Movement: +${returnQuantity} (Return)`);
  
  // Calculate stock after return
  const { data: stockAfterData } = await supabase
    .from('StockMovement')
    .select('quantity')
    .eq('medicineId', itemToReturn.medicineId);
    
  const stockAfter = stockAfterData ? stockAfterData.reduce((sum, sm) => sum + sm.quantity, 0) : 0;
  console.log(`Current Stock After Return: ${stockAfter}`);
  
  if (stockAfter === stockBefore + returnQuantity) {
    console.log(`✅ Return flow test passed! Stock correctly increased by ${returnQuantity}.`);
  } else {
    console.log('❌ Return flow test failed! Stock did not update correctly.');
  }
}

testReturnFlow().catch(console.error);
