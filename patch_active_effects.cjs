const fs = require('fs');
let code = fs.readFileSync('src/components/ActiveEffects.tsx', 'utf8');

const targetStr = `        const ability = state.abilities.find(a => a.id === effect.abilityId);
        if (!ability) return null;`;

const replacement = `        const source = effect.abilityId 
          ? state.abilities.find(a => a.id === effect.abilityId) 
          : state.items.find(i => i.id === effect.itemId);
        if (!source) return null;`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/ActiveEffects.tsx', code);
