const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const targetStr = `  const [duration, setDuration] = useState('0');
  const [isStackable, setIsStackable] = useState(false);
  const [target, setTarget] = useState('self');
  const [duration, setDuration] = useState('0');`;

const replacement = `  const [duration, setDuration] = useState('0');
  const [isStackable, setIsStackable] = useState(false);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
