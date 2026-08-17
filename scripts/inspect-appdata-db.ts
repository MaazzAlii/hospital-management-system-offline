import Database from 'better-sqlite3';
import path from 'path';

const appDataDb = path.join(process.env.APPDATA || '', 'hms', 'hms.db');
console.log('Inspecting DB at:', appDataDb);

const db = new Database(appDataDb);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
console.log('Tables in APPDATA DB:', tables.map(t => t.name));

const hasBatch = tables.some(t => t.name === 'Batch');
console.log('Has Batch table in APPDATA DB:', hasBatch);

const columns = db.prepare("PRAGMA table_info(LabTest)").all();
console.log('LabTest columns in APPDATA DB:');
console.log(columns);

const rows = db.prepare("SELECT * FROM LabTest").all();
console.log(`LabTest total count: ${rows.length}`);
console.log('First 5 rows:');
console.log(rows.slice(0, 5));

db.close();
