import React from 'react';
import { GameState } from '../types';
import { Tooltip } from './ui';
import { UserCircle } from 'lucide-react';

export function LogMessage({ message, state }: { message: string, state: GameState }) {
  const parts = message.split(/(\[[^\]]+\])/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          let innerText = part.slice(1, -1);
          let displayPart = part;
          let adminId: number | null = null;
          
          if (innerText.startsWith('Архимаг:')) {
            adminId = parseInt(innerText.split(':')[1], 10);
            innerText = 'Архимаг';
            displayPart = '[Архимаг]';
          }
          
          // Проверка: Навык
          const ability = state.abilities.find(a => a.name === innerText);
          if (ability) {
            return (
              <Tooltip key={i} align="left" content={
                <div className="flex gap-3 max-w-[250px]">
                  {ability.iconUrl ? (
                    <img src={ability.iconUrl} alt={ability.name} className="w-12 h-12 object-cover rounded-sm border border-zinc-700 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center flex-shrink-0 font-mono text-xs text-zinc-500">?</div>
                  )}
                  <div className="flex flex-col">
                    <div className="font-bold text-amber-500 leading-tight">{ability.name}</div>
                    <div className="text-xs text-zinc-300 mt-1 leading-snug whitespace-pre-wrap break-words">{ability.description}</div>
                  </div>
                </div>
              }>
                <span className="text-amber-500 font-medium cursor-help hover:underline decoration-amber-500/50 underline-offset-2">{part}</span>
              </Tooltip>
            );
          }

          // Проверка: Предмет
          const item = state.items.find(i => i.name === innerText);
          if (item) { 
            return (
              <Tooltip key={i} align="left" content={
                <div className="flex gap-3 max-w-[250px]">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.name} className="w-12 h-12 object-cover rounded-sm border border-zinc-700 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center flex-shrink-0 font-mono text-xs text-zinc-500">?</div>
                  )}
                  <div className="flex flex-col">
                    <div className="font-bold text-red-400 leading-tight">{item.name}</div>
                    <div className="text-xs text-zinc-300 mt-1 leading-snug whitespace-pre-wrap break-words">{item.description}</div>
                  </div>
                </div>
              }>
                <span className="text-red-400 font-medium cursor-help hover:underline decoration-red-400/50 underline-offset-2">{part}</span>
              </Tooltip>
            );
          }

          // Проверка: Игрок
          let user = null;
          
          if (adminId !== null) {
            user = state.users.find(u => u.id === adminId);
          } else {
            user = state.users.find(u => 
              (u.nickname === innerText || u.fullname === innerText || u.username === innerText)
            );

            if (!user && innerText === 'Архимаг') {
              user = state.users.find(u => u.role === 'admin' && u.username !== 'admin1') || state.users.find(u => u.role === 'admin');
            }
          }

          if (user) {
            const roleName = user.role === 'admin' ? 'Архимаг' : 'Ученик';
            const displayName = user.nickname || user.fullname || user.username;
            return (
              <Tooltip key={i} align="left" content={
                <div className="flex gap-3 max-w-[250px] items-center">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={displayName} className="w-10 h-10 object-cover rounded-full border border-zinc-700 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 text-zinc-500">
                      <UserCircle size={24} />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="font-bold text-amber-50/90 leading-tight">{displayName}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">{roleName} ({user.username})</div>
                  </div>
                </div>
              }>
                <span className="text-zinc-200 font-medium cursor-help hover:underline decoration-zinc-500/50 underline-offset-2">{displayPart}</span>
              </Tooltip>
            );
          }

          // Остальные скобки (имена игроков или неизвестные сущности)
          return <span key={i} className="text-zinc-200 font-medium">{displayPart}</span>;
        }
        
        // Обычный текст
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
