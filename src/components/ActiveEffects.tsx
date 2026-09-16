import React, { useState, useEffect } from 'react';
import { GameState } from '../types';
import { Tooltip } from './ui';

export function ActiveEffects({ userId, state }: { userId: number, state: GameState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeEffects = (state.userEffects || []).filter(e => e.userId === userId && e.expiresAt > now);

  if (activeEffects.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap items-center mt-3">
      {activeEffects.map(effect => {
        const source = effect.abilityId 
          ? state.abilities.find(a => a.id === effect.abilityId) 
          : state.items.find(i => i.id === effect.itemId);
        if (!source) return null;

        const msLeft = effect.expiresAt - now;
        const totalSecs = Math.max(0, Math.ceil(msLeft / 1000));
        
        let timeStr = '';
        if (totalSecs > 3600) {
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          timeStr = `${h}ч ${m}м`;
        } else if (totalSecs > 60) {
          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          timeStr = `${m}м ${s}с`;
        } else {
          timeStr = `${totalSecs}с`;
        }

        return (
          <Tooltip 
            key={effect.id} 
            align="right"
            content={
              <div className="text-center">
                <div className="font-medium text-amber-200/90">{source.name}</div>
                <div className="text-xs text-amber-400 mt-1">Осталось: {timeStr}</div>
              </div>
            }
          >
            <div className="relative group cursor-help border border-amber-500/30 rounded-sm bg-zinc-950 p-1 flex items-center gap-2">
              <div className="relative w-6 h-6 bg-zinc-900 rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0 border border-zinc-800">
                {source.iconUrl ? (
                  <img src={source.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-700 font-mono text-[10px]">?</span>
                )}
                {effect.stacks && effect.stacks > 1 && (
                  <div className="absolute -bottom-1 -right-1 bg-red-900 text-red-50 text-[9px] font-bold px-1 rounded-sm shadow-md border border-red-950 z-10 leading-none py-[2px]">
                    x{effect.stacks}
                  </div>
                )}
              </div>
              <span className="text-xs text-amber-500/80 font-mono pr-1">{timeStr}</span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}