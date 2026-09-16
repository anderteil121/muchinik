const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `app.post('/api/action/use-item', async (req, res) => {
  const { userId, userItemId } = req.body;
  
  const userQuery = await db.execute({ sql: 'SELECT role, username, fullname, nickname FROM users WHERE id = ?', args: [userId] });
  if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  
  const user = userQuery.rows[0];
  const isAdmin = user.role === 'admin';
  const username = isAdmin ? \`Архимаг:\${user.id}\` : (user.nickname || user.fullname || user.username);
  
  let itemName;
  
  if (isAdmin && String(userItemId).startsWith('admin_item_')) {
    const itemId = String(userItemId).replace('admin_item_', '');
    const item = await db.execute({ sql: 'SELECT name FROM items WHERE id = ?', args: [itemId] });
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    itemName = item.rows[0].name;
    // Don't delete from user_items since it's an admin pseudo-item
  } else {
    // Normal logic
    const ui = await db.execute({
      sql: 'SELECT itemId FROM user_items WHERE id = ?',
      args: [userItemId]
    });
    if (ui.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const itemId = ui.rows[0].itemId;
    const item = await db.execute({ sql: 'SELECT name FROM items WHERE id = ?', args: [itemId] });
    itemName = item.rows[0].name;
    
    await db.execute({ sql: 'DELETE FROM user_items WHERE id = ?', args: [userItemId] });
  }

  await logAction(\`[\${username}] использовал предмет: [\${itemName}]\`);
  io.emit('state_updated');
  res.json({ success: true });
});`;

const replacement = `app.post('/api/action/use-item', async (req, res) => {
  const { userId, userItemId, targetId } = req.body;
  
  const userQuery = await db.execute({ sql: 'SELECT role, username, fullname, nickname FROM users WHERE id = ?', args: [userId] });
  if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  
  const user = userQuery.rows[0];
  const isAdmin = user.role === 'admin';
  const username = isAdmin ? \`Архимаг:\${user.id}\` : (user.nickname || user.fullname || user.username);
  
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

  let logMsg = \`[\${username}] использовал предмет: [\${itemInfo.name}]\`;
  if (itemInfo.target === 'ally' && targetId && targetId !== userId) {
    const targetUser = await db.execute({ sql: 'SELECT username, fullname, nickname FROM users WHERE id = ?', args: [targetId] });
    if (targetUser.rows.length > 0) {
      const tu = targetUser.rows[0];
      const targetName = tu.nickname || tu.fullname || tu.username;
      logMsg = \`[\${username}] использовал предмет: [\${itemInfo.name}] на [\${targetName}]\`;
    }
  }
  await logAction(logMsg);
  
  io.emit('state_updated');
  res.json({ success: true });
});`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('server.ts', code);
