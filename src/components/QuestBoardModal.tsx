import React, { useState } from 'react';
import { GameState, User, Quest, UserQuest, Item, Ability } from '../types';
import { Button, Input, Select, Tooltip } from './ui';
import {
  X,
  ScrollText,
  Plus,
  Coins,
  Sparkles,
  Package,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  UserPlus,
  Search,
  Check,
  Award,
  BookOpen
} from 'lucide-react';

interface QuestBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  currentUser: User;
}

export function QuestBoardModal({
  isOpen,
  onClose,
  state,
  currentUser
}: QuestBoardModalProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'my_quests' | 'manage'>('available');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignQuestTarget, setAssignQuestTarget] = useState<Quest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReward, setFilterReward] = useState<'all' | 'coins' | 'item' | 'ability'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';
  const quests = state.quests || [];
  const userQuests = state.userQuests || [];
  const itemsMap = new Map<number, Item>((state.items || []).map(i => [Number(i.id), i]));
  const abilitiesMap = new Map<number, Ability>((state.abilities || []).map(a => [Number(a.id), a]));
  const usersMap = new Map<number, User>((state.users || []).map(u => [Number(u.id), u]));

  // Count accepts per quest
  const questAcceptsCount = new Map<number, number>();
  userQuests.forEach(uq => {
    if (uq.status !== 'cancelled') {
      const qid = Number(uq.questId);
      questAcceptsCount.set(qid, (questAcceptsCount.get(qid) || 0) + 1);
    }
  });

  // Current user's userQuests
  const myUserQuests = userQuests.filter(uq => Number(uq.userId) === Number(currentUser.id));
  const myActiveUserQuests = myUserQuests.filter(uq => uq.status === 'active');
  const myCompletedUserQuests = myUserQuests.filter(uq => uq.status === 'completed');
  const myAcceptedQuestIds = new Set(myUserQuests.map(uq => Number(uq.questId)));

  // Available quests for students:
  // Must have slots remaining (or -1) AND not already taken by this student (unless looking in all quests)
  const availableQuests = quests.filter(q => {
    const qid = Number(q.id);
    const taken = questAcceptsCount.get(qid) || 0;
    const max = Number(q.maxAccepts);
    const hasSlots = max === -1 || taken < max;
    const alreadyTaken = myAcceptedQuestIds.has(qid);
    // If not full and not already taken
    return hasSlots && !alreadyTaken;
  });

  // Filtered available quests
  const filteredAvailableQuests = availableQuests.filter(q => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterReward === 'coins') return Number(q.rewardCoins) > 0;
    if (filterReward === 'item') return !!q.rewardItemId;
    if (filterReward === 'ability') return !!q.rewardAbilityId;
    return true;
  });

  const showBanner = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleAcceptQuest = async (questId: number) => {
    setActionLoadingId(questId);
    try {
      const res = await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, questId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось взять квест');
      } else {
        showBanner('Квест успешно принят! Перейдите во вкладку "Мои квесты".');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при принятии квеста');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteQuest = async (userQuestId: number) => {
    setActionLoadingId(userQuestId);
    try {
      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuestId,
          adminId: isAdmin ? currentUser.id : undefined,
          userId: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось завершить квест');
      } else {
        const rewardsText = Array.isArray(data.rewards) && data.rewards.length > 0 
          ? `Получено: ${data.rewards.join(', ')}`
          : 'Награда успешно начислена!';
        showBanner(`Поздравляем с выполнением квеста! ${rewardsText}`);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при завершении квеста');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelQuest = async (userQuestId: number) => {
    if (!confirm('Вы уверены, что хотите отказаться от этого квеста?')) return;
    setActionLoadingId(userQuestId);
    try {
      const res = await fetch('/api/quests/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuestId,
          userId: currentUser.id,
          adminId: isAdmin ? currentUser.id : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось отказаться от квеста');
      } else {
        showBanner('Квест отменен.');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при отмене квеста');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteQuest = async (questId: number) => {
    if (!confirm('Удалить этот квест с доски и у всех учеников?')) return;
    try {
      const res = await fetch('/api/quests/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, adminId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось удалить квест');
      } else {
        showBanner('Квест удален с доски.');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении квеста');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-amber-900/50 shadow-2xl shadow-black w-full max-w-5xl rounded-md overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Top Header - Notice Board Styling */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-amber-900/40 relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <ScrollText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-amber-400 tracking-wide">
                  Доска квестов и поручений
                </h2>
                <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-400/90 border border-amber-500/30 px-2 py-0.5 rounded">
                  Академия
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Берите задания, развивайте магические искусства и получайте щедрые награды
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/90 border border-amber-500/30 px-3 py-1.5 rounded-sm font-mono text-xs text-amber-400">
              <Coins size={14} className="text-amber-400" />
              <span>Баланс:</span>
              <span className="font-bold text-amber-300">{currentUser.balance || 0} 🪙</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-sm transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="bg-amber-950/90 border-b border-amber-500/50 px-5 py-2 text-xs text-amber-300 flex items-center justify-between shrink-0 animate-in slide-in-from-top-1">
            <span className="flex items-center gap-2">
              <Check size={14} className="text-amber-400" /> {successBanner}
            </span>
            <button onClick={() => setSuccessBanner(null)} className="text-amber-400/70 hover:text-amber-200">
              ✕
            </button>
          </div>
        )}

        {/* Tabs and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 bg-zinc-900/70 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 text-xs font-serif rounded-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'available'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <ScrollText size={14} />
              Доска заданий
              <span className="bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {availableQuests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('my_quests')}
              className={`px-3 py-1.5 text-xs font-serif rounded-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'my_quests'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <BookOpen size={14} />
              Мои квесты
              {myActiveUserQuests.length > 0 && (
                <span className="bg-amber-500 text-zinc-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {myActiveUserQuests.length}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1.5 text-xs font-serif rounded-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'manage'
                    ? 'bg-red-950/60 text-amber-400 border border-red-800/60 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <Users size={14} />
                Управление квестами
                <span className="bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {quests.length}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'available' && (
              <>
                <div className="relative flex-1 sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Поиск поручения..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-1.5 pl-8 pr-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <select
                  value={filterReward}
                  onChange={e => setFilterReward(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 rounded-sm py-1.5 px-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="all">Все награды</option>
                  <option value="coins">С монетами</option>
                  <option value="item">С предметом</option>
                  <option value="ability">Со способностью</option>
                </select>
              </>
            )}

            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700"
              >
                <Plus size={14} /> Создать квест
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/60">
          {/* TAB 1: Available Quests on the Board */}
          {activeTab === 'available' && (
            <div>
              {filteredAvailableQuests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                    <ScrollText size={26} />
                  </div>
                  <h3 className="font-serif text-base text-zinc-400 font-medium">Доска объявлений пуста</h3>
                  <p className="text-xs text-zinc-600 max-w-sm mt-1">
                    {availableQuests.length === 0
                      ? 'В данный момент нет доступных квестов, либо все места уже заняты другими учениками.'
                      : 'По вашему запросу поручений не найдено.'}
                  </p>
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-4 text-xs"
                    >
                      Создать первое поручение
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAvailableQuests.map(quest => {
                    const qid = Number(quest.id);
                    const taken = questAcceptsCount.get(qid) || 0;
                    const max = Number(quest.maxAccepts);
                    const remaining = max === -1 ? '∞' : Math.max(0, max - taken);
                    const isLoading = actionLoadingId === qid;

                    const rewardItem = quest.rewardItemId ? itemsMap.get(Number(quest.rewardItemId)) : null;
                    const rewardAbility = quest.rewardAbilityId ? abilitiesMap.get(Number(quest.rewardAbilityId)) : null;

                    return (
                      <div
                        key={quest.id}
                        className="group relative bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-sm p-4 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-amber-950/20"
                      >
                        {/* Pin ornament */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          {max !== -1 ? (
                            <span className="text-[10px] font-mono bg-zinc-950/90 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <Users size={11} className="text-amber-500/80" />
                              Осталось мест: <strong className="text-amber-400">{remaining}</strong>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono bg-zinc-950/90 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                              Места: <strong className="text-amber-400">∞</strong>
                            </span>
                          )}
                        </div>

                        <div>
                          {/* Quest Title */}
                          <div className="pr-20">
                            <h3 className="font-serif text-base font-bold text-amber-200/90 group-hover:text-amber-300 transition-colors">
                              {quest.title}
                            </h3>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                            {quest.description || 'Поручение от наставников Академии Мучеников.'}
                          </p>

                          {/* Rewards Box */}
                          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col gap-1.5">
                            <div className="text-[10px] uppercase font-serif tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                              <Award size={12} className="text-amber-500" /> Награда за выполнение:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {Number(quest.rewardCoins) > 0 && (
                                <span className="inline-flex items-center gap-1 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                                  <Coins size={12} className="text-amber-400" />
                                  +{quest.rewardCoins} 🪙
                                </span>
                              )}

                              {rewardItem && (
                                <Tooltip
                                  key={`item-${rewardItem.id}`}
                                  content={
                                    <div className="space-y-1">
                                      <div className="font-serif font-bold text-amber-400">{rewardItem.name}</div>
                                      <div className="text-zinc-300 text-[11px]">{rewardItem.description}</div>
                                    </div>
                                  }
                                >
                                  <span className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs px-2 py-0.5 rounded cursor-help">
                                    <Package size={12} className="text-zinc-400" />
                                    {rewardItem.name}
                                  </span>
                                </Tooltip>
                              )}

                              {rewardAbility && (
                                <Tooltip
                                  key={`ab-${rewardAbility.id}`}
                                  content={
                                    <div className="space-y-1">
                                      <div className="font-serif font-bold text-amber-400">{rewardAbility.name}</div>
                                      <div className="text-zinc-300 text-[11px]">{rewardAbility.description}</div>
                                      <div className="text-[10px] text-zinc-500">
                                        {rewardAbility.type === 'active' ? 'Активное заклинание' : 'Пассивная способность'}
                                      </div>
                                    </div>
                                  }
                                >
                                  <span className="inline-flex items-center gap-1 bg-purple-950/50 border border-purple-800 text-purple-200 text-xs px-2 py-0.5 rounded cursor-help">
                                    <Sparkles size={12} className="text-purple-400" />
                                    {rewardAbility.name}
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(quest.createdAt).toLocaleDateString()}
                          </div>

                          <Button
                            variant="primary"
                            onClick={() => handleAcceptQuest(qid)}
                            disabled={isLoading}
                            className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700"
                          >
                            {isLoading ? 'Принятие...' : 'Взять квест'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: My Quests */}
          {activeTab === 'my_quests' && (
            <div className="space-y-6">
              {/* Active Quests Section */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                  <h3 className="font-serif text-base text-amber-400 font-bold flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    Активные поручения ({myActiveUserQuests.length})
                  </h3>
                  <span className="text-xs text-zinc-500">
                    Завершите квест, чтобы забрать награду
                  </span>
                </div>

                {myActiveUserQuests.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-900/40 border border-zinc-900 rounded-sm">
                    <p className="text-xs text-zinc-500">У вас нет активных квестов.</p>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab('available')}
                      className="mt-3 text-xs"
                    >
                      Посмотреть доступные задания
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myActiveUserQuests.map(uq => {
                      const quest = quests.find(q => Number(q.id) === Number(uq.questId));
                      if (!quest) return null;

                      const rewardItem = quest.rewardItemId ? itemsMap.get(Number(quest.rewardItemId)) : null;
                      const rewardAbility = quest.rewardAbilityId ? abilitiesMap.get(Number(quest.rewardAbilityId)) : null;
                      const isLoading = actionLoadingId === Number(uq.id);

                      return (
                        <div
                          key={uq.id}
                          className="bg-zinc-900 border border-amber-500/40 rounded-sm p-4 flex flex-col justify-between shadow-lg shadow-black"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-serif text-base font-bold text-amber-300">
                                {quest.title}
                              </h4>
                              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                                В процессе
                              </span>
                            </div>

                            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                              {quest.description || 'Поручение от наставников Академии.'}
                            </p>

                            {/* Rewards */}
                            <div className="mt-3 pt-3 border-t border-zinc-800">
                              <div className="text-[10px] uppercase font-serif text-zinc-400 font-semibold mb-1.5 flex items-center gap-1">
                                <Award size={12} className="text-amber-500" /> Обещанная награда:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Number(quest.rewardCoins) > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                                    <Coins size={12} className="text-amber-400" />
                                    +{quest.rewardCoins} 🪙
                                  </span>
                                )}
                                {rewardItem && (
                                  <span className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs px-2 py-0.5 rounded">
                                    <Package size={12} className="text-zinc-400" />
                                    {rewardItem.name}
                                  </span>
                                )}
                                {rewardAbility && (
                                  <span className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-800 text-purple-200 text-xs px-2 py-0.5 rounded">
                                    <Sparkles size={12} className="text-purple-400" />
                                    {rewardAbility.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleCancelQuest(Number(uq.id))}
                              disabled={isLoading}
                              className="text-xs text-red-400/80 hover:text-red-300 transition-colors"
                            >
                              Отказаться
                            </button>

                            <Button
                              variant="primary"
                              onClick={() => handleCompleteQuest(Number(uq.id))}
                              disabled={isLoading}
                              className="text-xs py-1.5 px-3 bg-green-600 hover:bg-green-500 text-zinc-950 font-bold border-green-700 flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} />
                              {isLoading ? 'Завершение...' : 'Сдать квест'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Completed Quests Section */}
              {myCompletedUserQuests.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <h3 className="font-serif text-base text-zinc-400 font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" />
                      Завершенные поручения ({myCompletedUserQuests.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {myCompletedUserQuests.map(uq => {
                      const quest = quests.find(q => Number(q.id) === Number(uq.questId));
                      if (!quest) return null;

                      return (
                        <div
                          key={uq.id}
                          className="bg-zinc-900/50 border border-zinc-800/80 rounded-sm p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-green-950/80 border border-green-700 flex items-center justify-center text-green-400 shrink-0">
                              <Check size={12} />
                            </div>
                            <div>
                              <div className="font-serif font-bold text-zinc-200">{quest.title}</div>
                              <div className="text-[10px] text-zinc-500">
                                Завершено {uq.completedAt ? new Date(uq.completedAt).toLocaleDateString() : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {Number(quest.rewardCoins) > 0 && (
                              <span className="text-amber-400 font-mono text-[11px]">+{quest.rewardCoins} 🪙</span>
                            )}
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                              Награда получена
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Admin Management */}
          {activeTab === 'manage' && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="font-serif text-base text-amber-400 font-bold">
                    Все поручения Академии ({quests.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Управление доской, выдача персональных квестов и зачет выполнения
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700 flex items-center gap-1.5"
                >
                  <Plus size={14} /> Создать новый квест
                </Button>
              </div>

              {quests.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Нет созданных квестов. Нажмите кнопку выше, чтобы вывесить первое задание.
                </div>
              ) : (
                <div className="space-y-3">
                  {quests.map(quest => {
                    const qid = Number(quest.id);
                    const questUsers = userQuests.filter(uq => Number(uq.questId) === qid);
                    const taken = questUsers.filter(uq => uq.status !== 'cancelled').length;
                    const max = Number(quest.maxAccepts);
                    const isFull = max !== -1 && taken >= max;

                    const rewardItem = quest.rewardItemId ? itemsMap.get(Number(quest.rewardItemId)) : null;
                    const rewardAbility = quest.rewardAbilityId ? abilitiesMap.get(Number(quest.rewardAbilityId)) : null;

                    return (
                      <div
                        key={quest.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 flex flex-col gap-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif text-base font-bold text-amber-200">
                                {quest.title}
                              </h4>
                              {isFull ? (
                                <span className="text-[10px] font-mono bg-red-950/80 text-red-400 border border-red-800 px-2 py-0.5 rounded">
                                  Заполнен ({taken}/{max}) — скрыт с доски
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono bg-green-950/80 text-green-400 border border-green-800 px-2 py-0.5 rounded">
                                  Открыт ({taken}/{max === -1 ? '∞' : max} мест)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{quest.description}</p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button
                              variant="secondary"
                              onClick={() => setAssignQuestTarget(quest)}
                              className="text-xs py-1 px-2.5 flex items-center gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-950/30"
                              title="Выдать ученику лично"
                            >
                              <UserPlus size={13} />
                              Выдать ученику
                            </Button>
                            <button
                              onClick={() => handleDeleteQuest(qid)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                              title="Удалить квест"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Rewards info */}
                        <div className="flex items-center gap-2 flex-wrap text-xs bg-zinc-950/60 p-2 rounded border border-zinc-800/60">
                          <span className="text-[11px] text-zinc-500 font-serif">Награда:</span>
                          {Number(quest.rewardCoins) > 0 && (
                            <span className="text-amber-400 font-mono font-semibold">+{quest.rewardCoins} 🪙</span>
                          )}
                          {rewardItem && (
                            <span className="text-zinc-300 flex items-center gap-1">
                              <Package size={12} className="text-zinc-500" />
                              {rewardItem.name}
                            </span>
                          )}
                          {rewardAbility && (
                            <span className="text-purple-300 flex items-center gap-1">
                              <Sparkles size={12} className="text-purple-400" />
                              {rewardAbility.name}
                            </span>
                          )}
                          {!Number(quest.rewardCoins) && !rewardItem && !rewardAbility && (
                            <span className="text-zinc-600 italic">Слава и честь</span>
                          )}
                        </div>

                        {/* Students taking this quest */}
                        {questUsers.length > 0 && (
                          <div className="border-t border-zinc-800/80 pt-2.5 mt-1">
                            <div className="text-[11px] font-serif text-zinc-400 font-semibold mb-2 flex items-center gap-1.5">
                              <Users size={12} className="text-amber-500" />
                              Ученики, взявшие поручение ({questUsers.length}):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {questUsers.map(uq => {
                                const student = usersMap.get(Number(uq.userId));
                                const studentName = student
                                  ? student.nickname || student.fullname || student.username
                                  : `Ученик #${uq.userId}`;
                                const isCompleted = uq.status === 'completed';

                                return (
                                  <div
                                    key={uq.id}
                                    className="bg-zinc-950 border border-zinc-800 p-2 rounded flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {student?.photoUrl ? (
                                        <img src={student.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] shrink-0">
                                          👤
                                        </div>
                                      )}
                                      <div className="truncate font-medium text-zinc-200">
                                        {studentName}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isCompleted ? (
                                        <span className="text-[10px] text-green-400 font-mono bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800">
                                          Зачтено ✓
                                        </span>
                                      ) : (
                                        <Button
                                          variant="primary"
                                          onClick={() => handleCompleteQuest(Number(uq.id))}
                                          disabled={actionLoadingId === Number(uq.id)}
                                          className="text-[10px] py-0.5 px-2 bg-green-700 hover:bg-green-600 text-white border-green-800"
                                          title="Зачесть выполнение и выдать награду"
                                        >
                                          {actionLoadingId === Number(uq.id) ? '...' : 'Зачесть'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div>
            {activeTab === 'available' && `Показано заданий: ${filteredAvailableQuests.length}`}
            {activeTab === 'my_quests' && `Активных квестов: ${myActiveUserQuests.length}`}
            {activeTab === 'manage' && `Всего квестов: ${quests.length}`}
          </div>
          <Button variant="secondary" onClick={onClose} className="text-xs py-1 px-4">
            Закрыть
          </Button>
        </div>
      </div>

      {/* MODAL: Create Quest */}
      {isCreateModalOpen && (
        <CreateQuestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          state={state}
          adminId={currentUser.id}
          onCreated={() => {
            setIsCreateModalOpen(false);
            showBanner('Новый квест успешно создан!');
          }}
        />
      )}

      {/* MODAL: Assign Quest to Student */}
      {assignQuestTarget && (
        <AssignQuestModal
          isOpen={!!assignQuestTarget}
          onClose={() => setAssignQuestTarget(null)}
          quest={assignQuestTarget}
          state={state}
          adminId={currentUser.id}
          onAssigned={() => {
            setAssignQuestTarget(null);
            showBanner('Квест успешно выдан ученику!');
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// CREATE QUEST MODAL
// -------------------------------------------------------------
interface CreateQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  adminId: number;
  onCreated: () => void;
}

function CreateQuestModal({
  isOpen,
  onClose,
  state,
  adminId,
  onCreated
}: CreateQuestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardCoins, setRewardCoins] = useState<number>(50);
  const [rewardItemId, setRewardItemId] = useState<string>('');
  const [rewardAbilityId, setRewardAbilityId] = useState<string>('');
  const [maxAcceptsOption, setMaxAcceptsOption] = useState<'1' | '2' | '3' | '5' | 'unlimited' | 'custom'>('1');
  const [customMaxAccepts, setCustomMaxAccepts] = useState<number>(1);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const students = (state.users || []).filter(u => u.role === 'student');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Введите название квеста');
      return;
    }

    let finalMax = 1;
    if (maxAcceptsOption === 'unlimited') finalMax = -1;
    else if (maxAcceptsOption === 'custom') finalMax = Math.max(1, customMaxAccepts);
    else finalMax = parseInt(maxAcceptsOption, 10) || 1;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          title: title.trim(),
          description: description.trim(),
          rewardCoins: Number(rewardCoins) || 0,
          rewardItemId: rewardItemId ? Number(rewardItemId) : null,
          rewardAbilityId: rewardAbilityId ? Number(rewardAbilityId) : null,
          maxAccepts: finalMax,
          targetStudentId: targetStudentId ? Number(targetStudentId) : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Ошибка создания квеста');
      } else {
        onCreated();
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении квеста');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-zinc-900 border border-amber-900/50 shadow-2xl w-full max-w-lg rounded-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-3 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-amber-500" />
            <h3 className="font-serif text-base font-bold text-amber-400">
              Создание нового квеста
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Title */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Название квеста <span className="text-amber-500">*</span>
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: Испытание древним фолиантом"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Описание задания и требования
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Опишите, что именно должен совершить ученик для завершения..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500/50 leading-relaxed"
            />
          </div>

          {/* Capacity / Max students limit */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Лимит учеников (сколько могут взять этот квест)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(['1', '2', '3', '5', 'unlimited', 'custom'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMaxAcceptsOption(opt)}
                  className={`py-1.5 px-2 rounded-sm border text-center font-mono text-xs transition-colors ${
                    maxAcceptsOption === opt
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {opt === 'unlimited' ? '∞ Все' : opt === 'custom' ? 'Свой' : `${opt} уч.`}
                </button>
              ))}
            </div>

            {maxAcceptsOption === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-zinc-400">Максимум учеников:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customMaxAccepts}
                  onChange={e => setCustomMaxAccepts(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-amber-300 font-mono"
                />
              </div>
            )}

            <p className="text-[11px] text-zinc-500 mt-1.5 italic">
              * Как только указанное количество учеников примет квест, он автоматически исчезнет из общего списка доски.
            </p>
          </div>

          {/* Rewards Section */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-sm space-y-3">
            <div className="text-zinc-200 font-serif font-bold flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <Award size={14} className="text-amber-500" />
              Награда за выполнение
            </div>

            {/* Currency */}
            <div>
              <label className="block text-zinc-400 mb-1 flex items-center gap-1">
                <Coins size={12} className="text-amber-400" />
                Монеты (пополняют баланс ученика)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={rewardCoins}
                  onChange={e => setRewardCoins(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-1">
                  {[0, 25, 50, 100, 250].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRewardCoins(amt)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] px-1.5 py-1 rounded text-zinc-400 hover:text-amber-300 font-mono"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Item Reward */}
            <div>
              <label className="block text-zinc-400 mb-1 flex items-center gap-1">
                <Package size={12} className="text-zinc-400" />
                Предмет в рюкзак (из базы знаний)
              </label>
              <Select
                value={rewardItemId}
                onChange={e => setRewardItemId(e.target.value)}
                className="text-xs"
              >
                <option value="">-- Без предмета --</option>
                {(state.items || []).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Ability Reward */}
            <div>
              <label className="block text-zinc-400 mb-1 flex items-center gap-1">
                <Sparkles size={12} className="text-purple-400" />
                Способность / Заклинание (изучается в гримуар)
              </label>
              <Select
                value={rewardAbilityId}
                onChange={e => setRewardAbilityId(e.target.value)}
                className="text-xs"
              >
                <option value="">-- Без способности --</option>
                {(state.abilities || []).map(ab => (
                  <option key={ab.id} value={ab.id}>
                    {ab.name} ({ab.type === 'active' ? 'Активное' : 'Пассивное'})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Personal direct assignment option */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Адресат поручения
            </label>
            <Select
              value={targetStudentId}
              onChange={e => setTargetStudentId(e.target.value)}
              className="text-xs"
            >
              <option value="">Вывесить на общую доску для всех</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  Лично выдать: {s.nickname || s.fullname || s.username} ({s.username})
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-zinc-500 mt-1">
              Если выбран конкретный ученик, квест сразу появится в его активных заданиях.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700"
            >
              {isSubmitting ? 'Создание...' : 'Вывесить квест'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// ASSIGN QUEST TO STUDENT MODAL
// -------------------------------------------------------------
interface AssignQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest;
  state: GameState;
  adminId: number;
  onAssigned: () => void;
}

function AssignQuestModal({
  isOpen,
  onClose,
  quest,
  state,
  adminId,
  onAssigned
}: AssignQuestModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const students = (state.users || []).filter(u => u.role === 'student');
  const userQuests = state.userQuests || [];
  const assignedStudentIds = new Set(
    userQuests
      .filter(uq => Number(uq.questId) === Number(quest.id) && uq.status === 'active')
      .map(uq => Number(uq.userId))
  );

  const handleAssign = async () => {
    if (!selectedStudentId) {
      alert('Выберите ученика');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quests/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          questId: quest.id,
          studentId: Number(selectedStudentId)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось выдать квест');
      } else {
        onAssigned();
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при назначении квеста');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-zinc-900 border border-amber-900/50 shadow-2xl w-full max-w-md rounded-md overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-amber-500" />
            <h3 className="font-serif text-base font-bold text-amber-400">
              Личная выдача квеста
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <div className="text-zinc-400 mb-1">Выбранный квест:</div>
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 font-serif text-sm font-bold text-amber-200">
              {quest.title}
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Выберите ученика академии:
            </label>
            <Select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="text-xs"
            >
              <option value="">-- Выберите ученика --</option>
              {students.map(student => {
                const isAlready = assignedStudentIds.has(Number(student.id));
                return (
                  <option key={student.id} value={student.id} disabled={isAlready}>
                    {student.nickname || student.fullname || student.username} ({student.username})
                    {isAlready ? ' — уже выполняет' : ''}
                  </option>
                );
              })}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={isSubmitting || !selectedStudentId}
              className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700"
            >
              {isSubmitting ? 'Выдача...' : 'Выдать поручение'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
