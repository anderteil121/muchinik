import React from 'react';
import { GameState } from '../types';
import { Tooltip } from './ui';

export function LogMessage({ message, state }: { message: string, state: GameState }) {
  const parts = message.split(/(\[[^\]]+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const innerText = part.slice(1, -1);
          
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

          // Остальные скобки (имена игроков)
          return <span key={i} className="text-zinc-200 font-medium">{part}</span>;
        }
        
        // Обычный текст
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
