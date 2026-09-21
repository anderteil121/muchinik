import React, { useState } from 'react';
import { GameState, User, UserQuest, Quest, Item, Ability } from '../types';
import { Button, Tooltip } from './ui';
import {
  ClipboardCheck,
  CheckCircle2,
  RotateCcw,
  Clock,
  Coins,
  Package,
  Sparkles,
  Award,
  ScrollText,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface QuestReviewPanelProps {
  state: GameState;
  currentUser: User;
  onApproveQuest: (userQuestId: number) => Promise<void>;
  onOpenRejectModal: (userQuest: UserQuest) => void;
  actionLoadingId: number | null;
}

export function QuestReviewPanel({
  state,
  currentUser,
  onApproveQuest,
  onOpenRejectModal,
  actionLoadingId
}: QuestReviewPanelProps) {
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');

  const userQuests = state.userQuests || [];
  const quests = state.quests || [];
  const usersMap = new Map<number, User>((state.users || []).map(u => [Number(u.id), u]));
  const questsMap = new Map<number, Quest>(quests.map(q => [Number(q.id), q]));
  const itemsMap = new Map<number, Item>((state.items || []).map(i => [Number(i.id), i]));
  const abilitiesMap = new Map<number, Ability>((state.abilities || []).map(a => [Number(a.id), a]));

  const pendingList = userQuests.filter(uq => uq.status === 'pending_review');
  const completedList = userQuests.filter(uq => uq.status === 'completed');

  const displayList = filter === 'pending' ? pendingList : completedList;

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-base text-amber-400 font-bold flex items-center gap-2">
            <ClipboardCheck size={18} className="text-amber-500" />
            Панель проверки выполненных поручений
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Проверяйте отчеты учеников Академии, утверждайте награды или возвращайте задания на доработку
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 border border-zinc-800 rounded-sm text-xs shrink-0">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-sm flex items-center gap-1.5 transition-all ${
              filter === 'pending'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock size={13} />
            Ожидают проверки
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                pendingList.length > 0
                  ? 'bg-amber-500 text-zinc-950 animate-pulse'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-sm flex items-center gap-1.5 transition-all ${
              filter === 'completed'
                ? 'bg-green-500/20 text-green-400 border border-green-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 size={13} />
            Зачтенные
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-zinc-800 text-zinc-400">
              {completedList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main List */}
      {displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-sm">
          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
            {filter === 'pending' ? <ClipboardCheck size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <h4 className="font-serif text-base text-zinc-300 font-medium">
            {filter === 'pending' ? 'Нет квестов, ожидающих проверки' : 'Зачтенных квестов пока нет'}
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            {filter === 'pending'
              ? 'Когда ученики нажмут «Сдать квест» и отправят отчет, их задания появятся здесь для утверждения Архимагом.'
              : 'Здесь будет отображаться архив заданий, которые вы успешно зачли и наградили.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map(uq => {
            const student = usersMap.get(Number(uq.userId));
            const quest = questsMap.get(Number(uq.questId));
            if (!quest) return null;

            const studentName = student
              ? student.nickname || student.fullname || student.username
              : `Ученик #${uq.userId}`;

            const rewardItem = quest.rewardItemId ? itemsMap.get(Number(quest.rewardItemId)) : null;
            const rewardAbility = quest.rewardAbilityId ? abilitiesMap.get(Number(quest.rewardAbilityId)) : null;
            const isLoading = actionLoadingId === Number(uq.id);
            const isPending = uq.status === 'pending_review';

            return (
              <div
                key={uq.id}
                className={`bg-zinc-900 border rounded-sm p-4 sm:p-5 flex flex-col gap-4 shadow-lg transition-all ${
                  isPending
                    ? 'border-amber-500/50 shadow-amber-950/20'
                    : 'border-zinc-800/80 opacity-90'
                }`}
              >
                {/* Top Bar: Student info & Submission timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    {student?.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-amber-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center text-sm text-zinc-400 shrink-0">
                        👤
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-bold text-sm text-zinc-200">
                          {studentName}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">
                          {student?.username || 'Ученик'}
                        </span>
                        {student?.balance !== undefined && (
                          <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                            <Coins size={11} /> {student.balance} 🪙
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Взял задание: {new Date(uq.acceptedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-amber-500/10 border border-amber-500/40 text-amber-400 px-2.5 py-1 rounded">
                        <Clock size={13} className="animate-pulse" />
                        На проверке
                        {uq.submittedAt && (
                          <span className="text-[10px] opacity-75">
                            ({new Date(uq.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-green-950/80 border border-green-700 text-green-400 px-2.5 py-1 rounded">
                        <CheckCircle2 size={13} />
                        Зачтено {uq.completedAt ? new Date(uq.completedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Quest Title & Description */}
                <div>
                  <div className="text-[10px] uppercase font-mono text-zinc-500 font-semibold mb-1">
                    Поручение
                  </div>
                  <h4 className="font-serif text-base font-bold text-amber-300 mb-1">
                    {quest.title}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {quest.description || 'Поручение от наставников Академии.'}
                  </p>
                </div>

                {/* Student's Report / Submission Note */}
                <div className="bg-zinc-950 border border-amber-500/30 rounded p-3 text-xs relative">
                  <div className="text-[11px] font-serif text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                    <ScrollText size={13} className="text-amber-500" />
                    Отчет ученика о выполнении:
                  </div>
                  {uq.submissionNote ? (
                    <div className="text-zinc-200 italic whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-amber-500/40 mt-1">
                      «{uq.submissionNote}»
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic pl-2 border-l-2 border-zinc-700 mt-1">
                      (Ученик отправил отчет без текстового комментария)
                    </div>
                  )}
                </div>

                {/* Promised Rewards */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-2.5 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-zinc-400 font-serif flex items-center gap-1">
                      <Award size={13} className="text-amber-500" /> Обещанная награда:
                    </span>
                    {Number(quest.rewardCoins) > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs px-2 py-0.5 rounded font-mono font-bold">
                        <Coins size={12} className="text-amber-400" />
                        +{quest.rewardCoins} 🪙
                      </span>
                    )}
                    {rewardItem && (
                      <Tooltip content={rewardItem.description || 'Предмет инвентаря'}>
                        <span className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs px-2 py-0.5 rounded cursor-help">
                          <Package size={12} className="text-zinc-400" />
                          {rewardItem.name}
                        </span>
                      </Tooltip>
                    )}
                    {rewardAbility && (
                      <Tooltip content={rewardAbility.description || 'Магическое заклинание'}>
                        <span className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-800 text-purple-200 text-xs px-2 py-0.5 rounded cursor-help">
                          <Sparkles size={12} className="text-purple-400" />
                          {rewardAbility.name}
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  {isPending && (
                    <div className="text-[11px] text-zinc-500">
                      Награда будет переведена автоматически при одобрении
                    </div>
                  )}
                </div>

                {/* Bottom Action Controls (for pending submissions) */}
                {isPending && (
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2.5">
                    <Button
                      variant="secondary"
                      onClick={() => onOpenRejectModal(uq)}
                      disabled={isLoading}
                      className="text-xs py-1.5 px-3.5 text-red-400 border-red-800/60 hover:bg-red-950/30 flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} />
                      Вернуть на доработку
                    </Button>

                    <Button
                      variant="primary"
                      onClick={() => onApproveQuest(Number(uq.id))}
                      disabled={isLoading}
                      className="text-xs py-1.5 px-4 bg-green-600 hover:bg-green-500 text-zinc-950 font-bold border-green-700 flex items-center gap-1.5 shadow-md"
                    >
                      <CheckCircle2 size={14} />
                      {isLoading ? 'Зачисление...' : 'Зачесть и начислить награду'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
