import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function fixReorderLevels(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[Reorder Fix] Database not found at: ${dbPath}`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`[Reorder Fix] Checking & repairing medicines in: ${dbPath}`);
  const db = new Database(dbPath);

  const before100 = db.prepare("SELECT COUNT(*) as count FROM Medicine WHERE reorderLevel = 100").get() as { count: number };
  console.log(`Medicines with reorderLevel = 100 before fix: ${before100.count}`);

  const updateResult = db.prepare("UPDATE Medicine SET reorderLevel = 4 WHERE reorderLevel = 100").run();
  console.log(`Updated ${updateResult.changes} medicines to reorderLevel = 4.`);

  const list = db.prepare("SELECT id, name, reorderLevel FROM Medicine").all() as Array<{ id: string; name: string; reorderLevel: number }>;
  console.log(`Total medicines in DB: ${list.length}`);
  for (const med of list) {
    console.log(` - [${med.name}]: reorderLevel = ${med.reorderLevel}`);
  }

  db.close();
  console.log(`[Reorder Fix] Done for: ${dbPath}`);
}

const candidatePaths = [
  path.join(process.cwd(), 'hms.db'),
  path.join(process.env.APPDATA || '', 'hms', 'hms.db'),
  path.join(process.env.APPDATA || '', 'Life Care HMS', 'hms.db'),
  path.join(process.env.APPDATA || '', 'life-care-clinic-hms', 'hms.db'),
];

for (const p of candidatePaths) {
  fixReorderLevels(p);
}

