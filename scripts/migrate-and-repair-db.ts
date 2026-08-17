import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function migrateAndRepairDb(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[DB Migration] DB not found at: ${dbPath}`);
    return;
  }
  console.log(`\n========================================`);
  console.log(`[DB Migration] Running migration & repair on: ${dbPath}`);
  const db = new Database(dbPath);

  // Check columns on LabTest
  const columns = db.prepare("PRAGMA table_info(LabTest)").all() as Array<{ name: string; type: string }>;
  const colNames = new Set(columns.map(c => c.name));
  console.log(`Existing columns:`, Array.from(colNames));

  if (!colNames.has('turnaroundHours')) {
    console.log(`Adding missing column 'turnaroundHours' to LabTest...`);
    db.prepare("ALTER TABLE LabTest ADD COLUMN turnaroundHours INTEGER").run();
  }

  if (!colNames.has('isActive')) {
    console.log(`Adding missing column 'isActive' to LabTest...`);
    db.prepare("ALTER TABLE LabTest ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT 1").run();
  }

  // Update all existing records where isActive is false/0/null or ensure they are active (1)
  const updateResult = db.prepare("UPDATE LabTest SET isActive = 1 WHERE isActive IS NULL OR isActive = 0").run();
  console.log(`Updated ${updateResult.changes} lab tests to isActive = 1 (true).`);

  const allTests = db.prepare("SELECT id, code, name, price, sampleType, turnaroundHours, isActive FROM LabTest").all();
  console.log(`Total lab tests in DB: ${allTests.length}`);
  console.log(`Sample lab tests:`, allTests.slice(0, 5));

  db.close();
  console.log(`[DB Migration] Completed for: ${dbPath}`);
}

const appDataDb = path.join(process.env.APPDATA || '', 'hms', 'hms.db');
const devDb = path.join(process.cwd(), 'hms.db');

migrateAndRepairDb(appDataDb);
migrateAndRepairDb(devDb);
