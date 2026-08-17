import Database from 'better-sqlite3';
import path from 'path';

const devDb = path.join(process.cwd(), 'hms.db');
console.log('Inspecting dev DB at:', devDb);

const db = new Database(devDb);
const columns = db.prepare("PRAGMA table_info(LabTest)").all();
console.log('LabTest columns in dev DB:');
console.log(columns);

const rows = db.prepare("SELECT * FROM LabTest").all();
console.log(`LabTest total count: ${rows.length}`);
console.log('Sample rows:');
console.log(rows.slice(0, 3));

db.close();
