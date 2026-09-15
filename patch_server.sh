sed -i -e "/\/\/ Student Actions/i\\
app.post('/api/admin/clear-logs', async (req, res) => {\\
  await db.execute('DELETE FROM logs');\\
  io.emit('state_updated');\\
  res.json({ success: true });\\
});\\
" server.ts
