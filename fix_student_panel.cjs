const fs = require('fs');
let code = fs.readFileSync('src/components/StudentPanel.tsx', 'utf8');

const targetStr = `        onSelect={(targetId) => {
          if (targetModalOpen) {
            if (targetModalOpen.isItem) {
              handleUseItem(targetModalOpen.userItemId!, targetModalOpen.itemId!, targetId);
              setTargetModalOpen(null);
            } else {
              handleUseAbility(targetModalOpen.userAbilityId!, targetModalOpen.abilityId!, targetId);
            }
          }
        }}
      />
          if (targetModalOpen) {
            handleUseAbility(targetModalOpen.userAbilityId, targetModalOpen.abilityId, targetId);
          }
        }}
      />`;

const replacement = `        onSelect={(targetId) => {
          if (targetModalOpen) {
            if (targetModalOpen.isItem) {
              handleUseItem(targetModalOpen.userItemId!, targetModalOpen.itemId!, targetId);
              setTargetModalOpen(null);
            } else {
              handleUseAbility(targetModalOpen.userAbilityId!, targetModalOpen.abilityId!, targetId);
            }
          }
        }}
      />`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/StudentPanel.tsx', code);
