const fs = require('fs');
let code = fs.readFileSync('src/components/StudentPanel.tsx', 'utf8');

const targetStr = `  const handleUseItem = async (userItemId: number) => {
    await fetch('/api/action/use-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userItemId })
    });
  };`;

const replacement = `  const handleUseItem = async (userItemId: number, itemId: number, targetId?: number) => {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (item.target === 'ally' && !targetId) {
      setTargetModalOpen({ itemId, userItemId, isItem: true });
      return;
    }
    
    await fetch('/api/action/use-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userItemId, targetId })
    });
  };`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/StudentPanel.tsx', code);
