import 'dotenv/config';
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
app.use(express.json({ limit: '10mb' }));

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
      fullname TEXT,
      nickname TEXT,
      photoUrl TEXT
    );
  `);
  
  // Safe column add for existing databases
  try {
    await db.execute('ALTER TABLE users ADD COLUMN fullname TEXT;');
  } catch (e) {}
  try {
    await db.execute('ALTER TABLE users ADD COLUMN nickname TEXT;');
  } catch (e) {}
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
import fs from 'fs';
import nodemailer from 'nodemailer';

const otpStore = new Map<string, string>();

let mailTransporter: nodemailer.Transporter | null = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('Nodemailer SMTP Transporter configured.');
}

app.post('/api/auth/request', async (req, res) => {
  const { email } = req.body;
  const emailLower = email.trim().toLowerCase();
  
  try {
    const usersJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/users.json'), 'utf-8'));
    const allowedUser = usersJson.find((u: any) => u.name.toLowerCase() === emailLower);
    
    if (!allowedUser) {
      return res.status(403).json({ error: 'Почта не найдена в системе' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    otpStore.set(emailLower, otp);

    if (mailTransporter) {
      try {
        await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || `"Академия Мучеников" <${process.env.SMTP_USER}>`,
          to: emailLower,
          subject: 'Врата Академии: Ваш код доступа',
          text: `Ваш код доступа для входа в систему: ${otp}\n\nНикому не сообщайте этот код.`,
          html: `
            <div style="font-family: serif; color: #18181b; padding: 20px;">
              <h2 style="color: #b45309;">Академия Мучеников</h2>
              <p>Ваш код доступа для входа в систему:</p>
              <h1 style="font-size: 32px; letter-spacing: 4px; background: #f4f4f5; padding: 10px 20px; display: inline-block; border-radius: 4px;">${otp}</h1>
              <p style="color: #71717a; font-size: 12px; margin-top: 20px;">Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
            </div>
          `
        });
        console.log(`Real email sent to: ${emailLower}`);
      } catch (mailError: any) {
        console.error('SMTP Error:', mailError);
        return res.status(500).json({ error: 'Ошибка SMTP: неверный логин или пароль приложения почты.' });
      }
    } else {
      console.log(`\n=========================================\nSIMULATED EMAIL TO: ${emailLower}\nYOUR OTP CODE IS: ${otp}\n(Add SMTP credentials in Environment Settings for real emails)\n=========================================\n`);
    }

    res.json({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error: Failed to process request' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;
  const emailLower = email.trim().toLowerCase();
  const cleanCode = code.trim();
  
  if (otpStore.get(emailLower) !== cleanCode) {
    return res.status(401).json({ error: 'Неверный код' });
  }

  try {
    const usersJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/users.json'), 'utf-8'));
    const allowedUser = usersJson.find((u: any) => u.name.toLowerCase() === emailLower);
    
    if (!allowedUser) {
      return res.status(403).json({ error: 'Пользователь больше не в списке' });
    }

    const role = allowedUser.role.toLowerCase() === 'admin' ? 'admin' : 'student';
    const fullname = allowedUser.FIO || '';

    // Ensure user exists in SQLite to maintain foreign keys
    let userQuery = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [emailLower] });
    let user;
    
    if (userQuery.rows.length === 0) {
      const insert = await db.execute({
        sql: 'INSERT INTO users (username, password, role, fullname) VALUES (?, ?, ?, ?)',
        args: [emailLower, '', role, fullname]
      });
      user = { id: Number(insert.lastInsertRowid), username: emailLower, role, fullname, photoUrl: null };
      io.emit('state_updated');
    } else {
      user = userQuery.rows[0];
      if (user.role !== role || user.fullname !== fullname) {
         await db.execute({ sql: 'UPDATE users SET role = ?, fullname = ? WHERE id = ?', args: [role, fullname, user.id] });
         user.role = role;
         user.fullname = fullname;
         io.emit('state_updated');
      }
    }

    otpStore.delete(emailLower);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/state', async (req, res) => {
  try {
    const users = (await db.execute('SELECT id, username, role, photoUrl, fullname, nickname FROM users')).rows;
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
      const type = entry.type?.toLowerCase();
      if (type !== 'item' && type !== 'ability') continue;

      const username = entry.username || entry.targetUser || entry.user;
      let userId = null;
      if (username) {
        const userQuery = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
        if (userQuery.rows.length > 0) {
          userId = userQuery.rows[0].id;
        }
      }

      const iconUrl = entry.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name || 'X')}&background=18181b&color=a1a1aa`;

      if (type === 'item') {
        let itemQuery = await db.execute({ sql: 'SELECT id FROM items WHERE name = ?', args: [entry.name] });
        let itemId;
        if (itemQuery.rows.length > 0) {
          itemId = itemQuery.rows[0].id;
        } else {
          const insertItem = await db.execute({
            sql: 'INSERT INTO items (name, description, iconUrl) VALUES (?, ?, ?)',
            args: [entry.name, entry.description || '', iconUrl]
          });
          itemId = Number(insertItem.lastInsertRowid);
        }
        
        if (userId) {
          await db.execute({
            sql: 'INSERT INTO user_items (userId, itemId) VALUES (?, ?)',
            args: [userId, itemId]
          });
        }
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
            args: [entry.name, entry.description || '', aType, aTarget, aCooldown, iconUrl]
          });
          abId = Number(insertAb.lastInsertRowid);
        }
        
        if (userId) {
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

app.post('/api/admin/set-nickname', async (req, res) => {
  const { userId, nickname } = req.body;
  await db.execute({
    sql: 'UPDATE users SET nickname = ? WHERE id = ?',
    args: [nickname, userId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

// Student Actions
app.post('/api/action/use-item', async (req, res) => {
  const { userId, userItemId } = req.body;
  
  // Find item details to log
  const ui = await db.execute({
    sql: 'SELECT itemId, users.username, users.fullname, users.nickname FROM user_items JOIN users ON users.id = user_items.userId WHERE user_items.id = ?',
    args: [userItemId]
  });
  
  if (ui.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  
  const itemId = ui.rows[0].itemId;
  const username = ui.rows[0].nickname || ui.rows[0].fullname || ui.rows[0].username;
  
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
    sql: 'SELECT abilityId, lastUsedAt, users.username, users.fullname, users.nickname FROM user_abilities JOIN users ON users.id = user_abilities.userId WHERE user_abilities.id = ?',
    args: [userAbilityId]
  });
  
  if (ua.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  
  const { abilityId, lastUsedAt } = ua.rows[0];
  const username = ua.rows[0].nickname || ua.rows[0].fullname || ua.rows[0].username;

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
    const targetInfo = await db.execute({ sql: 'SELECT username, fullname, nickname FROM users WHERE id = ?', args: [targetId] });
    const targetName = targetInfo.rows.length > 0 ? (targetInfo.rows[0].nickname || targetInfo.rows[0].fullname || targetInfo.rows[0].username) : 'Неизвестная цель';
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
