import Database from 'better-sqlite3';
import path from 'path';

const appDataDb = path.join(process.env.APPDATA || '', 'hms', 'hms.db');
console.log('Inspecting DB at:', appDataDb);

const db = new Database(appDataDb);
const columns = db.prepare("PRAGMA table_info(LabTest)").all();
console.log('LabTest columns in APPDATA DB:');
console.log(columns);

const rows = db.prepare("SELECT * FROM LabTest").all();
console.log(`LabTest total count: ${rows.length}`);
console.log('First 5 rows:');
console.log(rows.slice(0, 5));

db.close();
