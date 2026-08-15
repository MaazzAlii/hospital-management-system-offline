/**
 * =========================================================================================
 * SAFETY NOTICE & INSTRUCTIONS:
 * 
 * Target Database: REPOSITORY ROOT BUNDLE ONLY (./hms.db)
 * 
 * This script resets the repository's bundled seed database to a pristine, clean state
 * before packaging the production Electron installer.
 * 
 * CRITICAL SAFETY CONSTRAINT:
 * - This script MUST NEVER be run against a client's live database in %APPDATA%\hms\hms.db!
 * - It explicitly verifies and enforces that the target file is the project root 'hms.db'.
 * =========================================================================================
 */

import path from 'path';
import fs from 'fs';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const rootDbPath = path.resolve(__dirname, '..', 'hms.db');

// Safety assertion: Refuse to run if targeting AppData or any external path
const appDataPath = process.env.APPDATA || '';
if (appDataPath && rootDbPath.toLowerCase().includes(appDataPath.toLowerCase())) {
  console.error('FATAL SAFETY ERROR: Script was directed at AppData directory! Aborting immediately.');
  process.exit(1);
}

if (!fs.existsSync(rootDbPath)) {
  console.error(`FATAL ERROR: Target seed database does not exist at: ${rootDbPath}`);
  process.exit(1);
}

console.log('=============================================================');
console.log('TARGET DATABASE FILE:');
console.log(rootDbPath);
console.log('=============================================================');

const sqlite = new Database(rootDbPath);
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

async function resetSeedDatabase() {
  console.log('[reset-seed-data] Starting clean-slate transactional reset...');

  await prisma.$transaction(async (tx) => {
    // 1. Wipe Lab transactional and catalog data
    console.log('[reset-seed-data] Wiping Lab results, samples, orders, reference ranges, and test catalog...');
    await tx.labResult.deleteMany({});
    await tx.referenceRange.deleteMany({});
    await tx.sample.deleteMany({});
    await tx.labOrderItem.deleteMany({});
    await tx.labOrder.deleteMany({});
    await tx.labTest.deleteMany({});
    await tx.labCategory.deleteMany({});

    // 2. Wipe Pharmacy transactional and inventory data
    console.log('[reset-seed-data] Wiping Sales, Batches, Stock Movements, Purchases, Medicines, Categories, and Suppliers...');
    await tx.saleItem.deleteMany({});
    await tx.sale.deleteMany({});
    await tx.stockMovement.deleteMany({});
    await tx.batch.deleteMany({});
    await tx.purchaseItem.deleteMany({});
    await tx.purchase.deleteMany({});
    await tx.medicine.deleteMany({});
    await tx.medicineCategory.deleteMany({});
    await tx.supplier.deleteMany({});

    // 3. Wipe Billing, Clinical, Appointments, OPD Visits, and Patients
    console.log('[reset-seed-data] Wiping Payments, Invoices, OPD visits, Appointments, Schedules, Doctors, and Patients...');
    await tx.payment.deleteMany({});
    await tx.invoiceItem.deleteMany({});
    await tx.invoice.deleteMany({});
    await tx.opdVisit.deleteMany({});
    await tx.appointment.deleteMany({});
    await tx.doctorSchedule.deleteMany({});
    await tx.doctor.deleteMany({});
    await tx.patient.deleteMany({});

    // 4. Wipe Logs and Notifications
    console.log('[reset-seed-data] Wiping Audit logs and Notifications...');
    await tx.auditLog.deleteMany({});
    await tx.notification.deleteMany({});

    // 5. Reset ID Sequence Counters to 0
    console.log('[reset-seed-data] Resetting sequence counters...');
    await tx.counter.deleteMany({});

    // 6. Ensure Default Settings exist with editable clinic defaults
    const existingSettings = await tx.settings.findFirst();
    if (!existingSettings) {
      console.log('[reset-seed-data] Creating default Settings record...');
      await tx.settings.create({
        data: {
          clinicName: 'Life Care Hospital',
          address: 'Nawagai, Buner, Khyber Pakhtunkhwa, Pakistan',
          phone: '+92 300 1234567',
          email: 'info@lifecarehospital.pk',
          currency: 'PKR',
          taxRate: 0,
        },
      });
    } else {
      console.log('[reset-seed-data] Updating default Settings to clean baseline...');
      await tx.settings.update({
        where: { id: existingSettings.id },
        data: {
          clinicName: 'Life Care Hospital',
          address: 'Nawagai, Buner, Khyber Pakhtunkhwa, Pakistan',
          phone: '+92 300 1234567',
          email: 'info@lifecarehospital.pk',
          currency: 'PKR',
          taxRate: 0,
        },
      });
    }

    // 7. Ensure Default Main Branch exists
    const existingBranch = await tx.branch.findFirst();
    if (!existingBranch) {
      console.log('[reset-seed-data] Creating default Main Branch...');
      await tx.branch.create({
        data: {
          name: 'Main Campus',
          address: 'Nawagai, Buner',
          phone: '+92 300 1234567',
          isMain: true,
        },
      });
    }

    // 8. Clean up Doctor user account if present (remove dummy doctor Sarah Khan user if test only)
    const doctorUser = await tx.user.findUnique({ where: { email: 'doctor@lifecare.com' } });
    if (doctorUser) {
      await tx.user.delete({ where: { email: 'doctor@lifecare.com' } });
      console.log('[reset-seed-data] Removed test Doctor user account (doctor@lifecare.com).');
    }
  });

  console.log('[reset-seed-data] ✅ Database reset complete! All transactional & test catalog tables are 100% clean.');
}

resetSeedDatabase()
  .catch((e) => {
    console.error('[reset-seed-data] ❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqlite.close();
  });
