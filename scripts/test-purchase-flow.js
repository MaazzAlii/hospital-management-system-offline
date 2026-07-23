const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPurchaseFlow() {
  console.log('--- Testing Purchase Flow ---');
  
  // 1. Get or create a supplier
  let { data: suppliers, error: supError } = await supabase.from('Supplier').select('*').limit(1);
  let supplier;
  if (!suppliers || suppliers.length === 0) {
    console.log('Creating a test supplier...');
    const { data: newSupplier, error: createSupError } = await supabase.from('Supplier').insert({
      name: 'Test Supplier',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'test@supplier.com',
      isActive: true
    }).select().single();
    if (createSupError) {
      console.error('Failed to create supplier', createSupError);
      return;
    }
    supplier = newSupplier;
  } else {
    supplier = suppliers[0];
  }
  console.log(`Selected Supplier: ${supplier.name} (${supplier.id})`);

  // 2. Get or create a medicine
  let { data: medicines, error: medError } = await supabase.from('Medicine').select('*').limit(1);
  let medicine;
  if (!medicines || medicines.length === 0) {
    console.log('Creating a test medicine...');
    // We also need a category
    let { data: categories } = await supabase.from('MedicineCategory').select('*').limit(1);
    let category = categories && categories.length > 0 ? categories[0] : null;
    if (!category) {
      const { data: newCategory } = await supabase.from('MedicineCategory').insert({ name: 'Tablet' }).select().single();
      category = newCategory;
    }

    const { data: newMedicine, error: createMedError } = await supabase.from('Medicine').insert({
      name: 'Panadol Test',
      categoryId: category.id,
      inPrice: 10,
      outPrice: 15,
      unit: 'Box',
      reorderLevel: 20,
      isActive: true
    }).select().single();
    if (createMedError) {
      console.error('Failed to create medicine', createMedError);
      return;
    }
    medicine = newMedicine;
  } else {
    medicine = medicines[0];
  }
  console.log(`Selected Medicine: ${medicine.name} (${medicine.id})`);

  // Calculate current stock before
  const { data: stockBeforeData, error: stockErrorBefore } = await supabase
    .from('StockMovement')
    .select('quantity')
    .eq('medicineId', medicine.id);
  
  const stockBefore = stockBeforeData ? stockBeforeData.reduce((sum, sm) => sum + sm.quantity, 0) : 0;
  console.log(`Current Stock Before Purchase: ${stockBefore}`);

  // 3. Create a purchase
  console.log('Creating purchase...');
  const purchaseNo = `PUR-TEST-${Date.now()}`;
  const quantity = 50;
  const inPrice = medicine.inPrice || 10;
  const totalAmount = quantity * inPrice;

  const { data: purchase, error: purchaseError } = await supabase
    .from('Purchase')
    .insert({
      purchaseNo,
      supplierId: supplier.id,
      totalAmount,
      status: 'completed',
      notes: 'Test purchase from script'
    })
    .select()
    .single();

  if (purchaseError) {
    console.error('Error creating purchase:', purchaseError);
    return;
  }
  console.log(`Created Purchase: ${purchase.id}`);

  // 4. Create purchase item
  const { error: itemsError } = await supabase
    .from('PurchaseItem')
    .insert({
      purchaseId: purchase.id,
      medicineId: medicine.id,
      quantity,
      inPrice,
      batchNo: 'TEST-BATCH-001',
      expiryDate: new Date('2026-12-31').toISOString()
    });

  if (itemsError) {
    console.error('Error creating purchase item:', itemsError);
    return;
  }
  console.log(`Created Purchase Item for medicine: ${medicine.name}`);

  // 5. Create stock movement
  const { error: movementError } = await supabase
    .from('StockMovement')
    .insert({
      medicineId: medicine.id,
      type: 'purchase',
      quantity,
      referenceId: purchase.id,
      notes: `Purchase ${purchaseNo}`
    });

  if (movementError) {
    console.error('Error creating stock movement:', movementError);
    return;
  }
  console.log(`Created Stock Movement: +${quantity}`);

  // 6. Calculate stock after
  const { data: stockAfterData } = await supabase
    .from('StockMovement')
    .select('quantity')
    .eq('medicineId', medicine.id);
    
  const stockAfter = stockAfterData ? stockAfterData.reduce((sum, sm) => sum + sm.quantity, 0) : 0;
  console.log(`Current Stock After Purchase: ${stockAfter}`);
  
  if (stockAfter === stockBefore + quantity) {
    console.log('✅ Purchase flow test passed! Stock updated correctly.');
  } else {
    console.log('❌ Purchase flow test failed! Stock did not update correctly.');
  }
}

testPurchaseFlow().catch(console.error);
