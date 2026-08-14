import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting batch migration and stock reconciliation...");

  const purchaseItems = await prisma.purchaseItem.findMany({
    include: {
      medicine: true,
      batches: true,
    },
  });

  console.log(`Found ${purchaseItems.length} purchase items.`);

  let createdBatchesCount = 0;
  let linkedSaleItemsCount = 0;

  for (const item of purchaseItems) {
    // Check if batch already exists for this purchaseItem
    let batch = item.batches[0];
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

    const batchNo = item.batchNo?.trim() || `B-${item.id.slice(-6).toUpperCase()}`;
    const expiryDate = item.expiryDate || defaultExpiry;

    if (!batch) {
      // Find sales already made against this medicine and batchNo
      const matchingSales = await prisma.saleItem.findMany({
        where: {
          medicineId: item.medicineId,
          batchNo: item.batchNo || undefined,
        },
      });

      const soldQty = matchingSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const remaining = Math.max(0, item.quantity - soldQty);

      batch = await prisma.batch.create({
        data: {
          medicineId: item.medicineId,
          purchaseItemId: item.id,
          batchNo: batchNo,
          expiryDate: expiryDate,
          quantityReceived: item.quantity,
          quantityRemaining: remaining,
        },
      });
      createdBatchesCount++;

      // Link matching sale items to this batch
      for (const saleItem of matchingSales) {
        if (!saleItem.batchId) {
          await prisma.saleItem.update({
            where: { id: saleItem.id },
            data: {
              batchId: batch.id,
              expiryDate: expiryDate,
            },
          });
          linkedSaleItemsCount++;
        }
      }
    }
  }

  // Also check if any medicines have stock but no batches at all
  const medicines = await prisma.medicine.findMany({
    include: {
      batches: true,
      stockMovements: true,
    },
  });

  for (const med of medicines) {
    if (med.batches.length === 0) {
      const currentStock = med.stockMovements.reduce((sum, sm) => sum + sm.quantity, 0);
      if (currentStock > 0) {
        const defaultExpiry = new Date();
        defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

        await prisma.batch.create({
          data: {
            medicineId: med.id,
            batchNo: `OPEN-${Date.now().toString().slice(-4)}`,
            expiryDate: defaultExpiry,
            quantityReceived: currentStock,
            quantityRemaining: currentStock,
          },
        });
        createdBatchesCount++;
        console.log(`Created opening batch for ${med.name} with ${currentStock} units.`);
      }
    }
  }

  console.log(`Migration complete! Created ${createdBatchesCount} batches and linked ${linkedSaleItemsCount} sale items.`);
}

main()
  .catch((e) => {
    console.error("Error migrating batches:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
