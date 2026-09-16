const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `try { await db.execute('ALTER TABLE items ADD COLUMN target TEXT DEFAULT 'self';'); } catch (e) { /* Ignore if exists */ }`;
const replacement = `try { await db.execute('ALTER TABLE items ADD COLUMN target TEXT DEFAULT "self";'); } catch (e) { /* Ignore if exists */ }`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('server.ts', code);
