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
      iconUrl TEXT,
      successChance INTEGER DEFAULT 100
    );
  `);

  // Migrate existing tables
  try { await db.execute('ALTER TABLE items ADD COLUMN iconUrl TEXT;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE items ADD COLUMN isStackable INTEGER DEFAULT 0;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE abilities ADD COLUMN successChance INTEGER DEFAULT 100;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE abilities ADD COLUMN iconUrl TEXT;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE abilities ADD COLUMN duration INTEGER DEFAULT 0;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE abilities ADD COLUMN isStackable INTEGER DEFAULT 0;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE items ADD COLUMN target TEXT DEFAULT "self";'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE items ADD COLUMN duration INTEGER DEFAULT 0;'); } catch (e) { /* Ignore if exists */ }
  try { await db.execute('ALTER TABLE user_effects ADD COLUMN itemId INTEGER;'); } catch (e) { /* Ignore if exists */ }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_effects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      abilityId INTEGER,
      appliedAt INTEGER,
      expiresAt INTEGER,
      stacks INTEGER DEFAULT 1
    );
  `);
  
  try { await db.execute('ALTER TABLE user_effects ADD COLUMN stacks INTEGER DEFAULT 1;'); } catch (e) { /* Ignore if exists */ }

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
    // Clean up expired effects
    await db.execute({ sql: 'DELETE FROM user_effects WHERE expiresAt < ?', args: [Date.now()] });
    const userEffects = (await db.execute('SELECT * FROM user_effects')).rows;
    const logs = (await db.execute('SELECT * FROM logs ORDER BY createdAt DESC LIMIT 200')).rows;
    const onlineUserIds = Array.from(onlineUsers.keys());

    res.json({ users, items, abilities, userItems, userAbilities, userEffects, logs, onlineUserIds });
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

      let iconUrl = entry.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name || 'X')}&background=18181b&color=a1a1aa`;
      if (iconUrl.includes('\\icon\\') || iconUrl.includes('/icon/')) {
        const parts = iconUrl.split(/[\\/]/);
        iconUrl = '/icon/' + parts[parts.length - 1];
      }

      if (type === 'item') {
        let itemQuery = await db.execute({ sql: 'SELECT id FROM items WHERE name = ?', args: [entry.name] });
        let itemId;

        if (itemQuery.rows.length > 0) {
          itemId = itemQuery.rows[0].id;
          await db.execute({
            sql: 'UPDATE items SET description = ? WHERE id = ?',
            args: [entry.description || '', itemId]
          });
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

        const aType = entry.abilityType === 'passive' || entry.active === 'passive' ? 'passive' : 'active';
        const aTarget = entry.target === 'ally' || entry['on an ally'] === true ? 'ally' : 'self';
        const aCooldown = entry.cooldown || 0;
        const aChance = entry.successChance !== undefined ? entry.successChance : 100;
        const aDuration = entry.duration || 0;

        if (abQuery.rows.length > 0) {
          abId = abQuery.rows[0].id;
          await db.execute({
            sql: 'UPDATE abilities SET description = ?, type = ?, target = ?, cooldown = ?, successChance = ?, duration = ? WHERE id = ?',
            args: [entry.description || '', aType, aTarget, aCooldown, aChance, aDuration, abId]
          });
        } else {
          const insertAb = await db.execute({
            sql: 'INSERT INTO abilities (name, description, type, target, cooldown, iconUrl, successChance, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [entry.name, entry.description || '', aType, aTarget, aCooldown, iconUrl, aChance, aDuration]
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
  const { id, name, description, iconUrl, isStackable, target, duration } = req.body;
  await db.execute({
    sql: 'UPDATE items SET name = ?, description = ?, iconUrl = ?, isStackable = ?, target = ?, duration = ? WHERE id = ?',
    args: [name, description, iconUrl || null, isStackable ? 1 : 0, target || 'self', duration ? Number(duration) : 0, id]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/edit-ability', async (req, res) => {
  const { id, name, description, type, target, cooldown, iconUrl, successChance, duration, isStackable } = req.body;
  await db.execute({
    sql: 'UPDATE abilities SET name = ?, description = ?, type = ?, target = ?, cooldown = ?, iconUrl = ?, successChance = ?, duration = ?, isStackable = ? WHERE id = ?',
    args: [name, description, type, target, cooldown || 0, iconUrl || null, successChance !== undefined ? successChance : 100, duration || 0, isStackable ? 1 : 0, id]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/delete-item', async (req, res) => {
  const { id } = req.body;
  await db.execute({ sql: 'DELETE FROM user_items WHERE itemId = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [id] });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/delete-ability', async (req, res) => {
  const { id } = req.body;
  await db.execute({ sql: 'DELETE FROM user_abilities WHERE abilityId = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM abilities WHERE id = ?', args: [id] });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/create-item', async (req, res) => {
  const { name, description, iconUrl, isStackable, target, duration } = req.body;
  await db.execute({
    sql: 'INSERT INTO items (name, description, iconUrl, isStackable, target, duration) VALUES (?, ?, ?, ?, ?, ?)',
    args: [name, description, iconUrl || null, isStackable ? 1 : 0, target || 'self', duration ? Number(duration) : 0]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/create-ability', async (req, res) => {
  const { name, description, type, target, cooldown, iconUrl, successChance, duration, isStackable } = req.body;
  await db.execute({
    sql: 'INSERT INTO abilities (name, description, type, target, cooldown, iconUrl, successChance, duration, isStackable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [name, description, type, target, cooldown || 0, iconUrl || null, successChance !== undefined ? successChance : 100, duration || 0, isStackable ? 1 : 0]
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

app.post('/api/admin/remove-item', async (req, res) => {
  const { userItemId } = req.body;
  await db.execute({
    sql: 'DELETE FROM user_items WHERE id = ?',
    args: [userItemId]
  });
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/admin/reset-cooldown', async (req, res) => {
  const { userAbilityId } = req.body;
  await db.execute({
    sql: 'UPDATE user_abilities SET lastUsedAt = 0 WHERE id = ?',
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

app.post('/api/admin/clear-logs', async (req, res) => {
  await db.execute('DELETE FROM logs');
  io.emit('state_updated');
  res.json({ success: true });
});

// Student Actions
app.post('/api/action/use-item', async (req, res) => {
  const { userId, userItemId, targetId } = req.body;
  
  const userQuery = await db.execute({ sql: 'SELECT role, username, fullname, nickname FROM users WHERE id = ?', args: [userId] });
  if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  
  const user = userQuery.rows[0];
  const isAdmin = user.role === 'admin';
  const username = isAdmin ? `Архимаг:${user.id}` : (user.nickname || user.fullname || user.username);
  
  let itemInfo;
  let actualItemId;
  
  if (isAdmin && String(userItemId).startsWith('admin_item_')) {
    const itemId = String(userItemId).replace('admin_item_', '');
    actualItemId = itemId;
    const itemQuery = await db.execute({ sql: 'SELECT name, target, duration, isStackable FROM items WHERE id = ?', args: [itemId] });
    if (itemQuery.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    itemInfo = itemQuery.rows[0];
  } else {
    const ui = await db.execute({
      sql: 'SELECT itemId FROM user_items WHERE id = ?',
      args: [userItemId]
    });
    if (ui.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    actualItemId = ui.rows[0].itemId;
    const itemQuery = await db.execute({ sql: 'SELECT name, target, duration, isStackable FROM items WHERE id = ?', args: [actualItemId] });
    itemInfo = itemQuery.rows[0];
    
    await db.execute({ sql: 'DELETE FROM user_items WHERE id = ?', args: [userItemId] });
  }

  let effectTargetId = null;
  if (itemInfo.target === 'ally' && targetId) {
    effectTargetId = targetId;
  } else {
    effectTargetId = userId;
  }
  
  if (itemInfo.duration && itemInfo.duration > 0 && effectTargetId) {
    const appliedAt = Date.now();
    const expiresAt = appliedAt + (itemInfo.duration * 1000);
    
    if (itemInfo.isStackable) {
      const existing = await db.execute({
        sql: 'SELECT id, stacks FROM user_effects WHERE userId = ? AND itemId = ?',
        args: [effectTargetId, actualItemId]
      });
      if (existing.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE user_effects SET stacks = stacks + 1, expiresAt = ? WHERE id = ?',
          args: [expiresAt, existing.rows[0].id]
        });
      } else {
        await db.execute({
          sql: 'INSERT INTO user_effects (userId, itemId, appliedAt, expiresAt, stacks) VALUES (?, ?, ?, ?, 1)',
          args: [effectTargetId, actualItemId, appliedAt, expiresAt]
        });
      }
    } else {
      await db.execute({
        sql: 'INSERT INTO user_effects (userId, itemId, appliedAt, expiresAt, stacks) VALUES (?, ?, ?, ?, 1)',
        args: [effectTargetId, actualItemId, appliedAt, expiresAt]
      });
    }
  }

  let logMsg = `[${username}] использовал предмет: [${itemInfo.name}]`;
  if (itemInfo.target === 'ally' && targetId && targetId !== userId) {
    const targetUser = await db.execute({ sql: 'SELECT username, fullname, nickname FROM users WHERE id = ?', args: [targetId] });
    if (targetUser.rows.length > 0) {
      const tu = targetUser.rows[0];
      const targetName = tu.nickname || tu.fullname || tu.username;
      logMsg = `[${username}] использовал предмет: [${itemInfo.name}] на [${targetName}]`;
    }
  }
  await logAction(logMsg);
  
  io.emit('state_updated');
  res.json({ success: true });
});

app.post('/api/action/use-ability', async (req, res) => {
  const { userId, userAbilityId, targetId, outcome } = req.body;
  
  const userQuery = await db.execute({ sql: 'SELECT role, username, fullname, nickname FROM users WHERE id = ?', args: [userId] });
  if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  
  const user = userQuery.rows[0];
  const isAdmin = user.role === 'admin';
  const username = isAdmin ? `Архимаг:${user.id}` : (user.nickname || user.fullname || user.username);
  
  let abilityId;
  let lastUsedAt = 0;
  
  if (isAdmin && String(userAbilityId).startsWith('admin_ab_')) {
    abilityId = String(userAbilityId).replace('admin_ab_', '');
  } else {
    const ua = await db.execute({
      sql: 'SELECT abilityId, lastUsedAt FROM user_abilities WHERE id = ?',
      args: [userAbilityId]
    });
    
    if (ua.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    abilityId = ua.rows[0].abilityId;
    lastUsedAt = ua.rows[0].lastUsedAt;
  }

  const abilityInfo = await db.execute({ sql: 'SELECT name, target, cooldown, type, duration, isStackable FROM abilities WHERE id = ?', args: [abilityId] });
  const ability = abilityInfo.rows[0];
  
  if (!isAdmin && ability.type === 'active') {
    const cooldownMs = Number(ability.cooldown) * 1000;
    const now = Date.now();
    if (now - Number(lastUsedAt) < cooldownMs) {
      return res.status(400).json({ error: 'Cooldown not ready' });
    }
    // Update cooldown
    await db.execute({
      sql: 'UPDATE user_abilities SET lastUsedAt = ? WHERE id = ?',
      args: [now, userAbilityId]
    });
  }

  const isFail = outcome === 'fail';
  const typeText = ability.type === 'passive' ? 'пассивную способность' : 'способность';
  
  let effectTargetId = null;

  if (ability.target === 'ally' && targetId) {
    effectTargetId = targetId;
    const targetInfo = await db.execute({ sql: 'SELECT username, fullname, nickname FROM users WHERE id = ?', args: [targetId] });
    const targetName = targetInfo.rows.length > 0 ? (targetInfo.rows[0].nickname || targetInfo.rows[0].fullname || targetInfo.rows[0].username) : 'Неизвестная цель';
    if (isFail) {
      await logAction(`[${username}] попытался применить ${typeText} на [${targetName}]: [${ability.name}], но потерпел неудачу!`);
    } else {
      await logAction(`[${username}] применил ${typeText} на [${targetName}]: [${ability.name}]`);
    }
  } else {
    effectTargetId = userId;
    if (isFail) {
      await logAction(`[${username}] попытался использовать ${typeText} [${ability.name}], но потерпел неудачу!`);
    } else {
      await logAction(`[${username}] использовал ${typeText}: [${ability.name}]`);
    }
  }
  
  if (!isFail && ability.duration && ability.duration > 0 && effectTargetId) {
    const appliedAt = Date.now();
    const expiresAt = appliedAt + (ability.duration * 1000);
    
    if (ability.isStackable) {
      const existing = await db.execute({
        sql: 'SELECT id, stacks FROM user_effects WHERE userId = ? AND abilityId = ?',
        args: [effectTargetId, abilityId]
      });
      if (existing.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE user_effects SET stacks = stacks + 1, expiresAt = ? WHERE id = ?',
          args: [expiresAt, existing.rows[0].id]
        });
      } else {
        await db.execute({
          sql: 'INSERT INTO user_effects (userId, abilityId, appliedAt, expiresAt, stacks) VALUES (?, ?, ?, ?, 1)',
          args: [effectTargetId, abilityId, appliedAt, expiresAt]
        });
      }
    } else {
      await db.execute({
        sql: 'INSERT INTO user_effects (userId, abilityId, appliedAt, expiresAt, stacks) VALUES (?, ?, ?, ?, 1)',
        args: [effectTargetId, abilityId, appliedAt, expiresAt]
      });
    }
  }
  
  io.emit('state_updated');
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
