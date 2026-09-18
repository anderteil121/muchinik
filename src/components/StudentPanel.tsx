import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types';
import { Button, Modal, Select, Tooltip, Input } from './ui';
import { format } from 'date-fns';
import { UserCircle, Clock, Search, Filter, Coins, Store, ScrollText } from 'lucide-react';
import { LogMessage } from './LogMessage';
import { ActiveEffects } from './ActiveEffects';

interface StudentPanelProps {
  state: GameState;
  user: User;
  onOpenMarket?: () => void;
  onOpenQuests?: () => void;
}

export function StudentPanel({ state, user, onOpenMarket, onOpenQuests }: StudentPanelProps) {
  const [targetModalOpen, setTargetModalOpen] = useState<{ abilityId?: number, userAbilityId?: number, itemId?: number, userItemId?: number, isItem?: boolean } | null>(null);
  const [rouletteState, setRouletteState] = useState<{ abilityId: number, userAbilityId: number, targetId?: number, chance: number, chancesJson?: string } | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [abilitySearch, setAbilitySearch] = useState('');
  const [abilityFilters, setAbilityFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const userQuests = state.userQuests || [];
  const quests = state.quests || [];
  const myActiveQuests = userQuests
    .filter(uq => Number(uq.userId) === Number(user.id) && uq.status === 'active')
    .map(uq => ({
      uq,
      quest: quests.find(q => Number(q.id) === Number(uq.questId))
    }))
    .filter(item => !!item.quest);

  const toggleFilter = (filter: string) => {
    setAbilityFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const studentItems = user.role === 'admin' 
    ? state.items.map(item => ({ id: `admin_item_${item.id}`, userId: user.id, itemId: item.id, item }))
    : state.userItems.filter(ui => ui.userId === user.id).map(ui => {
      const item = state.items.find(i => i.id === ui.itemId);
      return { ...ui, item };
    });

  const studentAbilities = user.role === 'admin'
    ? state.abilities.map(ability => ({ id: `admin_ab_${ability.id}`, userId: user.id, abilityId: ability.id, lastUsedAt: 0, ability }))
    : state.userAbilities.filter(ua => ua.userId === user.id).map(ua => {
      const ability = state.abilities.find(a => a.id === ua.abilityId);
      return { ...ua, ability };
    });

  const filteredItems = studentItems.filter(ui => ui.item?.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredAbilities = studentAbilities.filter(ua => {
    if (!ua.ability) return false;
    if (!ua.ability.name.toLowerCase().includes(abilitySearch.toLowerCase())) return false;
    
    if (abilityFilters.length === 0) return true;

    let matches = false;
    for (const filter of abilityFilters) {
      if (filter === 'active' && ua.ability.type === 'active') matches = true;
      if (filter === 'passive' && ua.ability.type === 'passive') matches = true;
      if (filter === 'has_cd' && ua.ability.cooldown && ua.ability.cooldown > 0) matches = true;
      if (filter === 'has_chance' && ua.ability.successChance !== undefined && ua.ability.successChance < 100) matches = true;
    }
    
    return matches;
  });

  const handleUseItem = async (userItemId: number, itemId: number, targetId?: number) => {
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
  };

  const handleUseAbility = async (userAbilityId: number, abilityId: number, targetId?: number) => {
    const ability = state.abilities.find(a => a.id === abilityId);
    if (!ability) return;

    if (ability.target === 'ally' && !targetId) {
      setTargetModalOpen({ abilityId, userAbilityId });
      return;
    }

    const chance = ability.successChance !== undefined ? ability.successChance : 100;
    const hasVariants = ability.chancesJson && ability.chancesJson !== '[]';
    
    if (chance < 100 || hasVariants) {
      // Open roulette modal
      setTargetModalOpen(null);
      setRouletteState({
        userAbilityId,
        abilityId,
        targetId,
        chance,
        chancesJson: ability.chancesJson
      });
      return;
    }

    // 100% chance, no roulette
    await fetch('/api/action/use-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userAbilityId, targetId, outcome: 'success' })
    });
    setTargetModalOpen(null);
  };

  const handleRouletteFinish = async (outcome: string) => {
    if (!rouletteState) return;
    await fetch('/api/action/use-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        userAbilityId: rouletteState.userAbilityId, 
        targetId: rouletteState.targetId,
        outcome 
      })
    });
    setRouletteState(null);
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
                <div className="text-amber-500/80 font-serif italic text-sm mt-1">
                  {user.role === 'admin' ? `Архимаг (${user.username})` : `Ученик академии (${user.username})`}
                </div>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 bg-zinc-950/90 border border-amber-500/40 px-3 py-1 rounded-sm text-amber-400 text-sm font-mono font-bold shadow-sm">
                    <Coins size={15} className="text-amber-400" />
                    <span>{user.balance || 0}</span>
                    <span className="text-xs text-amber-500/70 font-sans font-normal">монет</span>
                  </div>
                  {onOpenMarket && (
                    <button 
                      onClick={onOpenMarket}
                      className="text-xs font-serif text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1 rounded-sm transition-colors shadow-sm"
                    >
                      <Store size={14} className="text-amber-500" /> Торговая площадка
                    </button>
                  )}
                  {onOpenQuests && (
                    <button 
                      onClick={onOpenQuests}
                      className="text-xs font-serif text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1 rounded-sm transition-colors shadow-sm"
                    >
                      <ScrollText size={14} className="text-amber-500" /> Доска квестов
                      {myActiveQuests.length > 0 && (
                        <span className="bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.2 rounded-full font-mono text-[10px]">
                          {myActiveQuests.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>
                {myActiveQuests.length > 0 && onOpenQuests && (
                  <div 
                    onClick={onOpenQuests}
                    className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-amber-950/40 border border-amber-500/30 hover:border-amber-500/60 text-xs text-amber-300/90 cursor-pointer transition-colors shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>Активное поручение: <strong className="text-amber-200">{myActiveQuests[0].quest?.title}</strong></span>
                    {myActiveQuests.length > 1 && (
                      <span className="text-zinc-500 font-mono text-[11px]">(+{myActiveQuests.length - 1})</span>
                    )}
                  </div>
                )}
                <ActiveEffects userId={user.id} state={state} />
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Inventory */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden max-h-[400px]">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center gap-2">
              <h3 className="font-serif text-lg text-amber-500/90 font-medium whitespace-nowrap">Инвентарь</h3>
              <div className="relative w-1/2 max-w-[150px]">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {filteredItems.map(ui => ui.item && (
                <Tooltip 
                  key={ui.id} 
                  align="right"
                  content={ui.item.description}
                >
                  <div className="relative group p-2 bg-zinc-950/50 border border-zinc-800 rounded-sm flex items-center gap-3 hover:border-zinc-600 transition-colors cursor-pointer">
                    {ui.item.iconUrl ? (
                      <img src={ui.item.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-800 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 font-mono text-xs flex-shrink-0">?</div>
                    )}
                    <div className="flex-1 font-medium text-red-100 truncate">{ui.item.name}</div>
                    <Button onClick={() => handleUseItem(Number(ui.id), Number(ui.item.id))} variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Использовать</Button>
                  </div>
                </Tooltip>
              ))}
              {filteredItems.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">{studentItems.length === 0 ? 'Рюкзак пуст' : 'Ничего не найдено'}</div>}
            </div>
          </div>

          {/* Abilities */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col overflow-hidden max-h-[400px]">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center gap-2">
              <h3 className="font-serif text-lg text-amber-500/90 font-medium whitespace-nowrap">Книга заклинаний</h3>
              <div className="flex gap-2 flex-1 justify-end max-w-[260px]">
                <div className="relative w-full max-w-[130px]">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={abilitySearch}
                    onChange={e => setAbilitySearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`h-[26px] px-2 flex items-center justify-center rounded-sm border transition-colors ${abilityFilters.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}
                  >
                    <Filter size={14} />
                  </button>
                  
                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl z-50 py-2 flex flex-col">
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('active')} onChange={() => toggleFilter('active')} className="accent-amber-500" />
                          Активные
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('passive')} onChange={() => toggleFilter('passive')} className="accent-amber-500" />
                          Пассивные
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('has_cd')} onChange={() => toggleFilter('has_cd')} className="accent-amber-500" />
                          С откатом (КД)
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('has_chance')} onChange={() => toggleFilter('has_chance')} className="accent-amber-500" />
                          С шансом
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {filteredAbilities.map(ua => ua.ability && (
                <AbilityCard 
                  key={ua.id} 
                  ua={ua as any} 
                  ability={ua.ability as any} 
                  onUse={() => handleUseAbility(Number(ua.id), Number(ua.abilityId))} 
                />
              ))}
              {filteredAbilities.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">{studentAbilities.length === 0 ? 'Нет изученных навыков' : 'Ничего не найдено'}</div>}
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
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 z-10 max-h-[300px] md:max-h-[600px]">
          {[...state.logs].reverse().map(log => (
            <div key={log.id} className="text-sm p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-sm shadow-sm">
              <div className="text-zinc-500 text-xs mb-1 font-mono">
                {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
              </div>
              <div className="text-zinc-300">
                <LogMessage message={log.message} state={state} />
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
            if (targetModalOpen.isItem) {
              handleUseItem(targetModalOpen.userItemId!, targetModalOpen.itemId!, targetId);
              setTargetModalOpen(null);
            } else {
              handleUseAbility(targetModalOpen.userAbilityId!, targetModalOpen.abilityId!, targetId);
            }
          }
        }}
      />

      <RouletteModal 
        isOpen={!!rouletteState} 
        chance={rouletteState?.chance || 100}
        chancesJson={rouletteState?.chancesJson}
        onFinish={handleRouletteFinish}
      />
    </div>
  );
}

function AbilityCard({ ua, ability, onUse }: { ua: any, ability: any, onUse: () => void, key?: React.Key }) {
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
          {ability.successChance !== undefined && ability.successChance < 100 && (
            <div className="text-amber-400/80 mt-1">Шанс успеха: {ability.successChance}%</div>
          )}
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
        
        <Button 
          onClick={onUse} 
          disabled={!isReady}
          variant="secondary"
          className={`opacity-0 group-hover:opacity-100 transition-opacity ${!isReady ? 'hidden' : ''}`}
        >
          {ability.type === 'active' ? 'Использовать' : 'Применить'}
        </Button>
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

function RouletteModal({ isOpen, chance, chancesJson, onFinish }: { isOpen: boolean, chance: number, chancesJson?: string, onFinish: (outcome: string) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [items, setItems] = useState<{name: string, type: 'success' | 'fail' | 'variant'}[]>([]);
  const [spinOffset, setSpinOffset] = useState(0);
  
  useEffect(() => {
    if (isOpen) {
      let variants: {name: string, chance: number}[] = [];
      try {
        variants = chancesJson ? JSON.parse(chancesJson) : [];
      } catch(e) {}

      let finalOutcome = 'fail';
      let outcomeType: 'success' | 'fail' | 'variant' = 'fail';

      if (variants.length > 0) {
        // Roll between variants
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const v of variants) {
          cumulative += v.chance;
          if (roll <= cumulative) {
            finalOutcome = v.name;
            outcomeType = 'variant';
            break;
          }
        }
      } else {
        const isSuccess = Math.random() * 100 <= chance;
        finalOutcome = isSuccess ? 'success' : 'fail';
        outcomeType = finalOutcome as 'success' | 'fail';
      }
      
      // Generate 40 random items, and 1 final result item
      const newItems = Array.from({ length: 40 }).map(() => {
        if (variants.length > 0) {
           const randV = variants[Math.floor(Math.random() * variants.length)];
           return Math.random() > 0.5 ? {name: randV.name, type: 'variant'} : {name: 'Неудача', type: 'fail'};
        } else {
           return Math.random() > 0.5 ? {name: 'Успех', type: 'success'} : {name: 'Неудача', type: 'fail'};
        }
      });

      if (variants.length > 0) {
        newItems.push({name: outcomeType === 'fail' ? 'Неудача' : finalOutcome, type: outcomeType});
      } else {
        newItems.push({name: finalOutcome === 'success' ? 'Успех' : 'Неудача', type: outcomeType});
      }

      setItems(newItems as any);
      
      setResult(null);
      setSpinning(true);
      
      // Start position: top of the list
      // 41 items total (1640px high). Middle is 0. 
      // Top item is at +800px. Bottom item (result) is at -800px.
      setSpinOffset(800);
      
      const t1 = setTimeout(() => {
        // Trigger the spin animation to the bottom item
        setSpinOffset(-800);
      }, 50);
      
      const t2 = setTimeout(() => {
        setSpinning(false);
        setResult(finalOutcome);
        
        setTimeout(() => {
          onFinish(finalOutcome);
        }, 1500);
      }, 3050); // 3 seconds spin + 50ms delay
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setSpinOffset(0);
    }
  }, [isOpen, chance, chancesJson]);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Проверка шанса...">
      <div className="flex flex-col items-center justify-center p-6 space-y-8 overflow-hidden">
        <div className="text-zinc-400 text-sm">
          Шанс успеха: <span className="text-amber-500 font-medium">{chance}%</span>
        </div>
        
        <div className="relative w-full h-32 bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-transparent to-zinc-950/90 z-10 pointer-events-none" />
          <div className="absolute left-0 right-0 h-0.5 bg-red-900/50 z-10 top-1/2 transform -translate-y-1/2" />
          
          <div 
            className={`flex flex-col items-center text-3xl font-serif tracking-widest ${spinning ? 'transition-transform duration-[3000ms] ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`}
            style={{ transform: `translateY(${spinOffset}px)` }}
          >
            {items.map((item, i) => {
              const isFinal = i === items.length - 1;
              const isHighlighted = isFinal && result !== null;
              
              let colorClass = item.type === 'success' || item.type === 'variant' ? 'text-green-500/40' : 'text-red-500/40';
              if (isHighlighted) {
                colorClass = (item.type === 'success' || item.type === 'variant') ? 'text-green-500 font-bold scale-110 transition-transform' : 'text-red-500 font-bold scale-110 transition-transform';
              }
              
              return (
                <div key={i} className={`h-10 flex items-center justify-center ${colorClass}`}>
                  {item.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
