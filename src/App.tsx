import React, { useState, useEffect } from 'react';
import { useGameState } from './lib/useGameState';
import { AdminPanel } from './components/AdminPanel';
import { StudentPanel } from './components/StudentPanel';
import { MarketplaceModal } from './components/MarketplaceModal';
import { QuestBoardModal } from './components/QuestBoardModal';
import { Button, Input } from './components/ui';
import { socket } from './lib/socket';
import quotesData from './data/quotes.json';
import { Store, Coins, ScrollText } from 'lucide-react';

export default function App() {
  const { state, fetchState } = useGameState();
  const [user, setUser] = useState<any>(null);
  const [playMode, setPlayMode] = useState(false);
  const [quote] = useState(() => quotesData.length > 0 ? quotesData[Math.floor(Math.random() * quotesData.length)] : null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [marketInitialItemId, setMarketInitialItemId] = useState<number | null>(null);
  const [isQuestBoardOpen, setIsQuestBoardOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    socket.emit('identify', user.id);
    
    const onConnect = () => {
      socket.emit('identify', user.id);
    };
    
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [user]);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка');
        setLoading(false);
        return;
      }
      
      setSuccessMsg(data.message);
      setAuthStep(2);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка');
        setLoading(false);
        return;
      }
      
      setUser(data);
      fetchState();
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-serif">Пробуждение...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm z-10 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-4xl text-amber-500/90 tracking-widest font-bold">МУЧЕНИКИ</h1>
              <p className="text-zinc-500 font-serif italic text-sm">Врата открываются лишь достойным</p>
            </div>

            <form onSubmit={authStep === 1 ? handleRequestOtp : handleVerifyOtp} className="bg-zinc-900 border border-red-900/30 p-6 rounded-sm shadow-2xl shadow-red-900/10 space-y-4 relative">
              <div className="space-y-4">
                {authStep === 1 ? (
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Email (Логин)</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} placeholder="ваша@почта.ru" />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Код из письма</label>
                    <Input type="text" value={otp} onChange={e => setOtp(e.target.value)} required disabled={loading} placeholder="123456" />
                  </div>
                )}
              </div>

              {error && <div className="text-red-500 text-xs text-center p-2 bg-red-950/50 rounded-sm border border-red-900">{error}</div>}
              {successMsg && authStep === 2 && <div className="text-amber-500/90 text-xs text-center p-2 bg-amber-950/30 rounded-sm border border-amber-900/50">{successMsg}</div>}

              <Button type="submit" className="w-full h-11 text-lg tracking-wider" disabled={loading}>
                {loading ? '...' : authStep === 1 ? 'Получить код' : 'Войти'}
              </Button>
              
              {authStep === 2 && (
                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setAuthStep(1);
                      setOtp('');
                      setError('');
                      setSuccessMsg('');
                    }} 
                    className="text-xs text-zinc-500 hover:text-amber-500/80 transition-colors"
                  >
                    Вернуться к вводу почты
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {quote && (
          <div className="w-full max-w-4xl mx-auto mt-auto pt-8 pb-4 z-10 flex flex-col md:flex-row items-center justify-center md:justify-end gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <div className="text-center md:text-right space-y-3 max-w-2xl">
              <p className="font-serif text-xl md:text-2xl text-zinc-300 italic">"{quote.quote}"</p>
              <p className="font-serif text-amber-500/80 text-sm tracking-wide">~ {quote.name} ~</p>
            </div>
            {quote.img && (
              <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 hidden md:block">
                <img src={quote.img} alt={quote.name} className="w-full h-full object-cover rounded-full border border-zinc-800 shadow-xl" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const currentUser = state.users.find(u => u.id === user.id) || user;
  const userQuests = state.userQuests || [];
  const quests = state.quests || [];
  const activeQuestsCount = userQuests.filter(uq => Number(uq.userId) === Number(currentUser.id) && uq.status === 'active').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col relative">
      <header className="bg-zinc-950 border-b border-red-900/30 py-3 px-6 flex justify-between items-center relative z-10 shrink-0">
        <h1 className="font-serif text-2xl text-amber-500/90 tracking-widest font-bold uppercase">Мученики</h1>
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Marketplace Button */}
          <button
            onClick={() => {
              setMarketInitialItemId(null);
              setIsMarketOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 hover:border-amber-400 text-xs font-serif text-amber-400 transition-all shadow-sm group"
            title="Торговая площадка"
          >
            <Store size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Торговая площадка</span>
            <span className="bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-300 font-bold flex items-center gap-1">
              <Coins size={11} className="text-amber-400" />
              {currentUser.balance || 0}
            </span>
          </button>

          {/* Quest Board Button */}
          <button
            onClick={() => setIsQuestBoardOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 hover:border-amber-400 text-xs font-serif text-amber-400 transition-all shadow-sm group"
            title="Доска квестов"
          >
            <ScrollText size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Доска квестов</span>
            {activeQuestsCount > 0 && (
              <span className="bg-amber-500 text-zinc-950 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold">
                {activeQuestsCount}
              </span>
            )}
          </button>

          {currentUser.role === 'admin' && (
            <Button variant="secondary" onClick={() => setPlayMode(!playMode)} className="text-xs px-3 py-1 border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
              {playMode ? 'Панель Мастера' : 'Игровой режим'}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <div className="text-sm text-zinc-500 flex items-center gap-2">
              <span className="text-zinc-300">{currentUser.nickname || currentUser.fullname || currentUser.username}</span>
              <span className="opacity-50">({currentUser.role === 'admin' ? 'Мастер' : 'Ученик'})</span>
            </div>
          </div>
          <Button variant="secondary" onClick={() => {
            setUser(null);
            socket.disconnect();
            socket.connect();
          }} className="text-xs px-3 py-1">
            Покинуть обитель
          </Button>
        </div>
      </header>

      <main className="flex-1 relative z-0">
        {currentUser.role === 'admin' && !playMode ? (
          <AdminPanel 
            state={state} 
            admin={currentUser} 
            onOpenMarket={(itemId) => {
              setMarketInitialItemId(itemId || null);
              setIsMarketOpen(true);
            }}
            onOpenQuests={() => setIsQuestBoardOpen(true)}
          />
        ) : (
          <StudentPanel 
            state={state} 
            user={currentUser} 
            onOpenMarket={() => {
              setMarketInitialItemId(null);
              setIsMarketOpen(true);
            }}
            onOpenQuests={() => setIsQuestBoardOpen(true)}
          />
        )}
      </main>

      {/* Floating launcher buttons in empty space on the left */}
      <div className="fixed left-4 bottom-6 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
        {/* Marketplace */}
        <button
          onClick={() => {
            setMarketInitialItemId(null);
            setIsMarketOpen(true);
          }}
          className="group relative flex items-center gap-2.5 bg-zinc-950/95 hover:bg-zinc-900 border border-amber-500/60 hover:border-amber-400 px-3.5 py-2.5 rounded-full shadow-2xl shadow-black hover:shadow-amber-500/20 transition-all duration-200"
          title="Открыть Торговую площадку"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Store size={18} />
          </div>
          <div className="flex flex-col text-left pr-1">
            <span className="font-serif text-xs font-bold text-amber-400 tracking-wider uppercase">
              Торговая площадка
            </span>
            <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1 font-semibold">
              <Coins size={11} className="text-amber-400" />
              {currentUser.balance || 0} монет
            </span>
          </div>
        </button>

        {/* Quest Board ("доска с бумажками") */}
        <button
          onClick={() => setIsQuestBoardOpen(true)}
          className="group relative flex items-center gap-2.5 bg-zinc-950/95 hover:bg-zinc-900 border border-amber-600/60 hover:border-amber-400 px-3.5 py-2.5 rounded-full shadow-2xl shadow-black hover:shadow-amber-500/20 transition-all duration-200"
          title="Открыть Доску квестов"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform relative">
            <ScrollText size={18} />
            {activeQuestsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center shadow">
                {activeQuestsCount}
              </span>
            )}
          </div>
          <div className="flex flex-col text-left pr-1">
            <span className="font-serif text-xs font-bold text-amber-400 tracking-wider uppercase">
              Доска квестов
            </span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
              {currentUser.role === 'admin' ? 'Управление заданиями' : activeQuestsCount > 0 ? `${activeQuestsCount} активных` : 'Доступны задания'}
            </span>
          </div>
        </button>
      </div>

      <MarketplaceModal
        isOpen={isMarketOpen}
        onClose={() => {
          setIsMarketOpen(false);
          setMarketInitialItemId(null);
        }}
        state={state}
        currentUser={currentUser}
        initialListItemId={marketInitialItemId || undefined}
      />

      <QuestBoardModal
        isOpen={isQuestBoardOpen}
        onClose={() => setIsQuestBoardOpen(false)}
        state={state}
        currentUser={currentUser}
      />
    </div>
  );
}
