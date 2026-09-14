import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types';
import { Button, Modal, Select, Tooltip, Input } from './ui';
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
                <h2 className="font-serif text-3xl text-red-50 font-medium tracking-wide">{user.nickname || user.fullname || user.username}</h2>
                <div className="text-amber-500/80 font-serif italic text-sm mt-1">Ученик академии ({user.username})</div>
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
                <Tooltip 
                  key={ui.id} 
                  align="right"
                  content={ui.item.description}
                >
                  <div className="relative group p-2 bg-zinc-950/50 border border-zinc-800 rounded-sm flex items-center gap-3 hover:border-zinc-600 transition-colors cursor-pointer">
                    {ui.item.iconUrl ? (
                      <img src={ui.item.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-800" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 font-mono text-xs">?</div>
                    )}
                    <div className="flex-1 font-medium text-red-100">{ui.item.name}</div>
                    <Button onClick={() => handleUseItem(ui.id)} variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Использовать</Button>
                  </div>
                </Tooltip>
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
      <div className="w-full md:w-1/3 bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden relative max-h-[400px] md:max-h-none">
        <div className="bg-zinc-950/80 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
          <h2 className="font-serif text-xl text-amber-500/90 font-medium tracking-wide">Arcane Logs</h2>
          <Clock size={18} className="text-zinc-500" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-3 z-10 max-h-[300px] md:max-h-[600px]">
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
        onlineUserIds={state.onlineUserIds || []}
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
    <Tooltip
      align="left"
      content={
        <>
          {ability.description}
          {ability.type === 'active' && <div className="mt-1 text-red-400/80">КД: {ability.cooldown} сек.</div>}
        </>
      }
    >
      <div className={`relative group p-2 bg-zinc-950/50 border border-zinc-800 rounded-sm flex items-center gap-3 transition-colors ${!isReady ? 'grayscale opacity-75' : 'hover:border-zinc-600 cursor-pointer'}`}>
        
        <div className="relative w-12 h-12 flex-shrink-0 border border-zinc-800 rounded-sm overflow-hidden bg-zinc-900 flex items-center justify-center">
          {ability.iconUrl ? (
            <img src={ability.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-700 font-mono text-xs">?</span>
          )}
          
          {/* Cooldown Overlay (Vertical Sweep) */}
          {!isReady && ability.type === 'active' && (
            <div 
              className="absolute bottom-0 left-0 w-full bg-red-950/80 transition-all duration-1000 ease-linear flex flex-col justify-start" 
              style={{ height: `${(cdLeft / ability.cooldown) * 100}%` }}
            >
            </div>
          )}
          
          {/* Cooldown Number */}
          {!isReady && ability.type === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs z-20 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
              {cdLeft}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="font-medium text-amber-200/90">{ability.name}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            {ability.type === 'active' ? 'Активная' : 'Пассивная'}
          </div>
        </div>
        
        {ability.type === 'active' && (
          <Button 
            onClick={onUse} 
            disabled={!isReady}
            variant="secondary"
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${!isReady ? 'hidden' : ''}`}
          >
            Использовать
          </Button>
        )}
      </div>
    </Tooltip>
  );
}

function TargetSelectionModal({ isOpen, onClose, students, onSelect, onlineUserIds }: { isOpen: boolean, onClose: () => void, students: User[], onSelect: (id: number) => void, onlineUserIds: number[] }) {
  const [targetId, setTargetId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(s => {
    const term = searchQuery.toLowerCase();
    const fio = (s.fullname || '').toLowerCase();
    const email = (s.username || '').toLowerCase();
    const nick = (s.nickname || '').toLowerCase();
    return fio.includes(term) || email.includes(term) || nick.includes(term);
  });

  useEffect(() => {
    if (isOpen && filteredStudents.length > 0 && !filteredStudents.find(s => s.id.toString() === targetId)) {
      setTargetId(filteredStudents[0].id.toString());
    }
  }, [isOpen, filteredStudents, targetId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выберите цель">
      <div className="space-y-4">
        <Input 
          placeholder="Поиск по ФИО, нику или почте..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Select value={targetId} onChange={e => setTargetId(e.target.value)}>
          {filteredStudents.map(s => (
            <option key={s.id} value={s.id}>
              {s.nickname || s.fullname || s.username} {onlineUserIds.includes(s.id) ? ' (Онлайн)' : ''}
            </option>
          ))}
        </Select>
        <Button onClick={() => onSelect(Number(targetId))} className="w-full" disabled={!targetId}>Применить</Button>
      </div>
    </Modal>
  );
}
