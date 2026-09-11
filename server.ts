import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createClient } from '@libsql/client';
import cors from 'cors';

const PORT = 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = createClient({
  url: 'file:local.db',
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      photoUrl TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      iconUrl TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      type TEXT,
      target TEXT,
      cooldown INTEGER,
      iconUrl TEXT
    );
  `);

  // Migrate existing tables
  try { await db.execute('ALTER TABLE items ADD COLUMN iconUrl TEXT;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE abilities ADD COLUMN iconUrl TEXT;'); } catch (e) { /* Ignore if exists */ }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      itemId INTEGER
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      abilityId INTEGER,
      lastUsedAt INTEGER DEFAULT 0
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      createdAt INTEGER
    );
  `);

  // Insert default admin
  const adminQuery = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: ['admin1']
  });
  
  if (adminQuery.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      args: ['admin1', 'admin2', 'admin']
    });
  }
}

initDB().catch(console.error);

// Track online users
const onlineUsers = new Map<number, Set<string>>();

io.on('connection', (socket) => {
  let currentUserId: number | null = null;
  
  socket.on('identify', (userId: number) => {
    currentUserId = userId;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    io.emit('state_updated');
  });

  socket.on('disconnect', () => {
    if (currentUserId && onlineUsers.has(currentUserId)) {
      onlineUsers.get(currentUserId)!.delete(socket.id);
      if (onlineUsers.get(currentUserId)!.size === 0) {
        onlineUsers.delete(currentUserId);
      }
      io.emit('state_updated');
    }
  });
});

async function logAction(message: string) {
  await db.execute({
    sql: 'INSERT INTO logs (message, createdAt) VALUES (?, ?)',
    args: [message, Date.now()]
  });
  io.emit('state_updated');
}

// REST APIs
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.execute({
    sql: 'SELECT id, username, role, photoUrl FROM users WHERE username = ? AND password = ?',
    args: [username, password]
  });
  if (result.rows.length > 0) {
    res.json(result.rows[0]);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      args: [username, password, 'student']
    });
    const newUser = { id: Number(result.lastInsertRowid), username, role: 'student', photoUrl: null };
    io.emit('state_updated');
    res.json(newUser);
  } catch (e) {
    res.status(400).json({ error: 'Username already taken' });
  }
});

app.get('/api/state', async (req, res) => {
  try {
    const users = (await db.execute('SELECT id, username, role, photoUrl FROM users')).rows;
    const items = (await db.execute('SELECT * FROM items')).rows;
    const abilities = (await db.execute('SELECT * FROM abilities')).rows;
    const userItems = (await db.execute('SELECT * FROM user_items')).rows;
    const userAbilities = (await db.execute('SELECT * FROM user_abilities')).rows;
    const logs = (await db.execute('SELECT * FROM logs ORDER BY createdAt DESC LIMIT 200')).rows;
    const onlineUserIds = Array.from(onlineUsers.keys());

    res.json({ users, items, abilities, userItems, userAbilities, logs, onlineUserIds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// Admin Actions
app.post('/api/admin/bulk-import', async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Data must be an array' });

  try {
    for (const entry of data) {
      const username = entry.username || entry.targetUser || entry.user || entry.name;
      if (!username) continue;
      
      const userQuery = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
      if (userQuery.rows.length === 0) continue;
      const userId = userQuery.rows[0].id;

      const type = entry.type?.toLowerCase();
      if (type === 'item') {
        let itemQuery = await db.execute({ sql: 'SELECT id FROM items WHERE name = ?', args: [entry.name] });
        let itemId;
        if (itemQuery.rows.length > 0) {
          itemId = itemQuery.rows[0].id;
        } else {
          const insertItem = await db.execute({
            sql: 'INSERT INTO items (name, description, iconUrl) VALUES (?, ?, ?)',
            args: [entry.name, entry.description || '', entry.iconUrl || null]
          });
          itemId = Number(insertItem.lastInsertRowid);
        }
        await db.execute({
          sql: 'INSERT INTO user_items (userId, itemId) VALUES (?, ?)',
          args: [userId, itemId]
        });
      } else if (type === 'ability') {
        let abQuery = await db.execute({ sql: 'SELECT id FROM abilities WHERE name = ?', args: [entry.name] });
        let abId;
        if (abQuery.rows.length > 0) {
          abId = abQuery.rows[0].id;
        } else {
          const aType = entry.abilityType === 'passive' || entry.active === 'passive' ? 'passive' : 'active';
          const aTarget = entry.target === 'ally' || entry['on an ally'] === true ? 'ally' : 'self';
          const aCooldown = entry.cooldown || 0;
          const insertAb = await db.execute({
            sql: 'INSERT INTO abilities (name, description, type, target, cooldown, iconUrl) VALUES (?, ?, ?, ?, ?, ?)',
            args: [entry.name, entry.description || '', aType, aTarget, aCooldown, entry.iconUrl || null]
          });
          abId = Number(insertAb.lastInsertRowid);
        }
        
        const existingUa = await db.execute({
          sql: 'SELECT id FROM user_abilities WHERE userId = ? AND abilityId = ?',
          args: [userId, abId]
        });
        
        if (existingUa.rows.length === 0) {
          await db.execute({
            sql: 'INSERT INTO user_abilities (userId, abilityId, lastUsedAt) VALUES (?, ?, 0)',
            args: [userId, abId]
          });
        }
      }
    }
    io.emit('state_updated');
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to import' });
  }
});

app.post('/api/admin/edit-item', async (req, res) => {
  const { id, name, description, iconUrl } = req.body;
  await db.execute({
    sql: 'UPDATE items SET name = ?, description = ?, iconUrl = ? WHERE id = ?',
    args: [name, description, iconUrl || null, id]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/edit-ability', async (req, res) => {
  const { id, name, description, type, target, cooldown, iconUrl } = req.body;
  await db.execute({
    sql: 'UPDATE abilities SET name = ?, description = ?, type = ?, target = ?, cooldown = ?, iconUrl = ? WHERE id = ?',
    args: [name, description, type, target, cooldown || 0, iconUrl || null, id]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/create-item', async (req, res) => {
  const { name, description, iconUrl } = req.body;
  await db.execute({
    sql: 'INSERT INTO items (name, description, iconUrl) VALUES (?, ?, ?)',
    args: [name, description, iconUrl || null]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/create-ability', async (req, res) => {
  const { name, description, type, target, cooldown, iconUrl } = req.body;
  await db.execute({
    sql: 'INSERT INTO abilities (name, description, type, target, cooldown, iconUrl) VALUES (?, ?, ?, ?, ?, ?)',
    args: [name, description, type, target, cooldown || 0, iconUrl || null]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/grant-item', async (req, res) => {
  const { userId, itemId } = req.body;
  await db.execute({
    sql: 'INSERT INTO user_items (userId, itemId) VALUES (?, ?)',
    args: [userId, itemId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/teach-ability', async (req, res) => {
  const { userId, abilityId } = req.body;
  const existing = await db.execute({
    sql: 'SELECT id FROM user_abilities WHERE userId = ? AND abilityId = ?',
    args: [userId, abilityId]
  });
  
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'Ученик уже владеет этой способностью' });
  }

  await db.execute({
    sql: 'INSERT INTO user_abilities (userId, abilityId, lastUsedAt) VALUES (?, ?, 0)',
    args: [userId, abilityId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/remove-ability', async (req, res) => {
  const { userAbilityId } = req.body;
  await db.execute({
    sql: 'DELETE FROM user_abilities WHERE id = ?',
    args: [userAbilityId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/update-photo', async (req, res) => {
  const { userId, photoUrl } = req.body;
  await db.execute({
    sql: 'UPDATE users SET photoUrl = ? WHERE id = ?',
    args: [photoUrl, userId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

// Student Actions
app.post('/api/action/use-item', async (req, res) => {
  const { userId, userItemId } = req.body;
  
  // Find item details to log
  const ui = await db.execute({
    sql: 'SELECT itemId, users.username FROM user_items JOIN users ON users.id = user_items.userId WHERE user_items.id = ?',
    args: [userItemId]
  });
  
  if (ui.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  
  const itemId = ui.rows[0].itemId;
  const username = ui.rows[0].username;
  
  const item = await db.execute({ sql: 'SELECT name FROM items WHERE id = ?', args: [itemId] });
  const itemName = item.rows[0].name;

  // Consume item
  await db.execute({ sql: 'DELETE FROM user_items WHERE id = ?', args: [userItemId] });
  
  await logAction(`[${username}] использовал предмет: [${itemName}]`);
  res.json({ success: true });
});

app.post('/api/action/use-ability', async (req, res) => {
  const { userId, userAbilityId, targetId } = req.body;
  
  const ua = await db.execute({
    sql: 'SELECT abilityId, lastUsedAt, users.username FROM user_abilities JOIN users ON users.id = user_abilities.userId WHERE user_abilities.id = ?',
    args: [userAbilityId]
  });
  
  if (ua.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  
  const { abilityId, lastUsedAt, username } = ua.rows[0];
  const abilityInfo = await db.execute({ sql: 'SELECT name, target, cooldown, type FROM abilities WHERE id = ?', args: [abilityId] });
  const ability = abilityInfo.rows[0];
  
  if (ability.type === 'active') {
    const cooldownMs = Number(ability.cooldown) * 1000;
    const now = Date.now();
    if (now - Number(lastUsedAt) < cooldownMs) {
      return res.status(400).json({ error: 'Cooldown not ready' });
    }
  }

  // Update cooldown
  await db.execute({
    sql: 'UPDATE user_abilities SET lastUsedAt = ? WHERE id = ?',
    args: [Date.now(), userAbilityId]
  });
  
  if (ability.target === 'ally' && targetId) {
    const targetInfo = await db.execute({ sql: 'SELECT username FROM users WHERE id = ?', args: [targetId] });
    const targetName = targetInfo.rows.length > 0 ? targetInfo.rows[0].username : 'Неизвестная цель';
    await logAction(`[${username}] применил способность на [${targetName}]: [${ability.name}]`);
  } else {
    await logAction(`[${username}] использовал способность: [${ability.name}]`);
  }
  
  res.json({ success: true });
});

// Vite Setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: true, // Разрешает доступ из локальной сети по IP (0.0.0.0)
        allowedHosts: 'all' // Разрешает любые заголовки хоста
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start();
