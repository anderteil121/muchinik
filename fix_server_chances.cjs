const Database = require('better-sqlite3');
const db = new Database('local.db');
try {
  db.exec('ALTER TABLE abilities ADD COLUMN chancesJson TEXT DEFAULT "[]"');
} catch (e) {
  console.error(e);
}
