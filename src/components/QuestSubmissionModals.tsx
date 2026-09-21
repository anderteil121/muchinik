import React, { useState } from 'react';
import { Quest, UserQuest, User } from '../types';
import { Button } from './ui';
import { X, Send, RotateCcw, AlertCircle, ScrollText, CheckCircle2, Clock } from 'lucide-react';

interface SubmitQuestReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userQuest: UserQuest;
  quest: Quest;
  onSubmit: (userQuestId: number, note: string) => Promise<void>;
  isLoading: boolean;
}

export function SubmitQuestReportModal({
  isOpen,
  onClose,
  userQuest,
  quest,
  onSubmit,
  isLoading
}: SubmitQuestReportModalProps) {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(Number(userQuest.id), note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-amber-500/50 shadow-2xl shadow-black w-full max-w-lg rounded-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-amber-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Send size={16} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-amber-400">
                Сдача квеста на проверку
              </h3>
              <p className="text-[11px] text-zinc-400">
                Архимаг проверит отчет перед начислением награды
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-sm"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Quest Info */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-sm">
            <div className="text-[10px] uppercase font-mono text-amber-500 font-semibold mb-0.5">
              Поручение
            </div>
            <h4 className="font-serif text-sm font-bold text-zinc-200 mb-1">
              {quest.title}
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              {quest.description || 'Поручение от наставников Академии.'}
            </p>

            {Number(quest.rewardCoins) > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-zinc-400">
                <span>Обещанная награда:</span>
                <span className="font-mono font-bold text-amber-400">+{quest.rewardCoins} 🪙</span>
              </div>
            )}
          </div>

          {/* Submission Note */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Отчет или комментарий к выполнению:</span>
              <span className="text-[10px] text-zinc-500 font-normal">Необязательно</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="Опишите, что было сделано, приложите ссылки или доказательства выполнения задания..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 leading-relaxed text-xs resize-none"
            />
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-sm text-[11px] text-amber-300/80">
            <Clock size={14} className="shrink-0 text-amber-500 mt-0.5" />
            <span>
              После отправки задание перейдет в статус «На проверке». Архимаг получит уведомление и утвердит награду в специальной панели.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs py-1.5 px-3"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="text-xs py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-700 flex items-center gap-1.5"
            >
              <Send size={13} />
              {isLoading ? 'Отправка...' : 'Отправить на проверку'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RejectQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userQuest: UserQuest;
  quest?: Quest;
  student?: User;
  onReject: (userQuestId: number, reason: string) => Promise<void>;
  isLoading: boolean;
}

export function RejectQuestModal({
  isOpen,
  onClose,
  userQuest,
  quest,
  student,
  onReject,
  isLoading
}: RejectQuestModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const studentName = student
    ? student.nickname || student.fullname || student.username
    : `Ученик #${userQuest.userId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onReject(Number(userQuest.id), reason.trim() || 'Требуется доработка задания');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-red-800/60 shadow-2xl shadow-black w-full max-w-lg rounded-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-zinc-950 via-red-950/20 to-zinc-950 border-b border-red-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
              <RotateCcw size={16} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-red-400">
                Возврат квеста на доработку
              </h3>
              <p className="text-[11px] text-zinc-400">
                Укажите замечание ученику, чтобы он смог исправить работу
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-sm"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target details */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ученик:</span>
              <span className="font-bold text-zinc-200">{studentName}</span>
            </div>
            {quest && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Задание:</span>
                <span className="font-serif font-bold text-amber-300">{quest.title}</span>
              </div>
            )}
            {userQuest.submissionNote && (
              <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-400">
                <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">
                  Отчет ученика:
                </div>
                <div className="italic text-zinc-300 bg-zinc-950 p-2 rounded border border-zinc-800/80">
                  «{userQuest.submissionNote}»
                </div>
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">
              Замечание или причина возврата:
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Например: Не приложен расчет формулы, либо задание выполнено не полностью. Исправьте ошибку в пункте 2..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 leading-relaxed text-xs resize-none"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/40 p-2.5 rounded-sm text-[11px] text-red-300/80">
            <AlertCircle size={14} className="shrink-0 text-red-400 mt-0.5" />
            <span>
              Задание вернется в раздел «Мои квесты» ученика с вашим замечанием. Ученик сможет доработать его и отправить отчет повторно.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs py-1.5 px-3"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="text-xs py-1.5 px-4 bg-red-700 hover:bg-red-600 text-white font-bold border-red-800 flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              {isLoading ? 'Возврат...' : 'Вернуть на доработку'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
