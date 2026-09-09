import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types';
import { Button, Modal, Select } from './ui';
import { format } from 'date-fns';
import { UserCircle, Clock } from 'lucide-react';

interface StudentPanelProps {
  state: GameState;
  user: User;
}

export function StudentPanel({ state, user }: StudentPanelProps) {
  const [targetModalOpen, setTargetModalOpen] = useState<{ abilityId: number, userAbilityId: number } | null>(null);

  const studentItems = state.userItems.filter(ui => ui.userId === user.id).map(ui => {
    const item = state.items.find(i => i.id === ui.itemId);
    return { ...ui, item };
  });

  const studentAbilities = state.userAbilities.filter(ua => ua.userId === user.id).map(ua => {
    const ability = state.abilities.find(a => a.id === ua.abilityId);
    return { ...ua, ability };
  });

  const handleUseItem = async (userItemId: number) => {
    await fetch('/api/action/use-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userItemId })
    });
  };

  const handleUseAbility = async (userAbilityId: number, abilityId: number, targetId?: number) => {
    const ability = state.abilities.find(a => a.id === abilityId);
    if (!ability) return;

    if (ability.target === 'ally' && !targetId) {
      setTargetModalOpen({ abilityId, userAbilityId });
      return;
    }

    await fetch('/api/action/use-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userAbilityId, targetId })
    });
    setTargetModalOpen(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full max-w-7xl mx-auto gap-6 p-4">
      
      {/* Left Column - Profile & Inventories */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        
        {/* Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 to-transparent pointer-events-none" />
          <div className="p-6 flex items-center gap-6 z-10 w-full">
             {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-950 shadow-xl shadow-black" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800 text-zinc-500 shadow-xl">
                  <UserCircle size={48} />
                </div>
              )}
              <div>
                <h2 className="font-serif text-3xl text-red-50 font-medium tracking-wide">{user.username}</h2>
                <div className="text-amber-500/80 font-serif italic text-sm mt-1">Ученик академии</div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Inventory */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800">
              <h3 className="font-serif text-lg text-amber-500/90 font-medium">Инвентарь</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {studentItems.map(ui => ui.item && (
                <div key={ui.id} className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-sm flex justify-between items-center group hover:border-zinc-600 transition-colors">
                  <div>
                    <div className="font-medium text-red-100">{ui.item.name}</div>
                    <div className="text-xs text-zinc-400 mt-1">{ui.item.description}</div>
                  </div>
                  <Button onClick={() => handleUseItem(ui.id)} variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Использовать</Button>
                </div>
              ))}
              {studentItems.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">Рюкзак пуст</div>}
            </div>
          </div>

          {/* Abilities */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800">
              <h3 className="font-serif text-lg text-amber-500/90 font-medium">Книга заклинаний</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {studentAbilities.map(ua => ua.ability && (
                <AbilityCard 
                  key={ua.id} 
                  ua={ua as any} 
                  ability={ua.ability as any} 
                  onUse={() => handleUseAbility(ua.id, ua.abilityId)} 
                />
              ))}
              {studentAbilities.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">Нет изученных навыков</div>}
            </div>
          </div>
        </div>

      </div>

      {/* Right Column - Logs */}
      <div className="w-full md:w-1/3 bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden relative">
        <div className="bg-zinc-950/80 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
          <h2 className="font-serif text-xl text-amber-500/90 font-medium tracking-wide">Arcane Logs</h2>
          <Clock size={18} className="text-zinc-500" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
          {state.logs.map(log => (
            <div key={log.id} className="text-sm p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-sm shadow-sm">
              <div className="text-zinc-500 text-xs mb-1 font-mono">
                {format(new Date(log.createdAt), 'HH:mm:ss')}
              </div>
              <div className="text-zinc-300">
                {log.message}
              </div>
            </div>
          ))}
          {state.logs.length === 0 && (
            <div className="text-zinc-500 text-center py-8">Тишина...</div>
          )}
        </div>
      </div>

      <TargetSelectionModal 
        isOpen={!!targetModalOpen} 
        onClose={() => setTargetModalOpen(null)} 
        students={state.users.filter(u => u.role === 'student')}
        onSelect={(targetId) => {
          if (targetModalOpen) {
            handleUseAbility(targetModalOpen.userAbilityId, targetModalOpen.abilityId, targetId);
          }
        }}
      />
    </div>
  );
}

function AbilityCard({ ua, ability, onUse }: { ua: any, ability: any, onUse: () => void }) {
  const [cdLeft, setCdLeft] = useState(0);

  useEffect(() => {
    if (ability.type !== 'active') return;

    const updateTimer = () => {
      const cooldownMs = ability.cooldown * 1000;
      const passed = Date.now() - ua.lastUsedAt;
      if (passed < cooldownMs) {
        setCdLeft(Math.ceil((cooldownMs - passed) / 1000));
      } else {
        setCdLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ua.lastUsedAt, ability.cooldown, ability.type]);

  const isReady = cdLeft === 0;

  return (
    <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-sm group relative overflow-hidden">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="font-medium text-amber-200/90">{ability.name}</div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900 px-1 rounded-sm border border-zinc-800">
          {ability.type === 'active' ? 'Актив' : 'Пассив'}
        </span>
      </div>
      <div className="text-xs text-zinc-400 mb-3 relative z-10">{ability.description}</div>
      
      {ability.type === 'active' && (
        <div className="relative z-10">
          <Button 
            onClick={onUse} 
            disabled={!isReady}
            className={`w-full text-xs py-1.5 ${!isReady ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : ''}`}
          >
            {isReady ? 'Использовать' : `Перезарядка: ${cdLeft}с`}
          </Button>
        </div>
      )}

      {/* Cooldown overlay progress */}
      {!isReady && ability.type === 'active' && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-red-900/50 transition-all duration-1000 linear" 
          style={{ width: `${(cdLeft / ability.cooldown) * 100}%` }}
        />
      )}
    </div>
  );
}

function TargetSelectionModal({ isOpen, onClose, students, onSelect }: { isOpen: boolean, onClose: () => void, students: User[], onSelect: (id: number) => void }) {
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    if (isOpen && students.length > 0) {
      setTargetId(students[0].id.toString());
    }
  }, [isOpen, students]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выберите цель">
      <div className="space-y-4">
        <Select value={targetId} onChange={e => setTargetId(e.target.value)}>
          {students.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
        </Select>
        <Button onClick={() => onSelect(Number(targetId))} className="w-full" disabled={!targetId}>Применить</Button>
      </div>
    </Modal>
  );
}
