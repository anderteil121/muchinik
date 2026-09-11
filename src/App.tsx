import React, { useState, useEffect } from 'react';
import { useGameState } from './lib/useGameState';
import { AdminPanel } from './components/AdminPanel';
import { StudentPanel } from './components/StudentPanel';
import { Button, Input } from './components/ui';
import { socket } from './lib/socket';
import quotesData from './data/quotes.json';

export default function App() {
  const { state, fetchState } = useGameState();
  const [user, setUser] = useState<any>(null);
  const [quote] = useState(() => quotesData.length > 0 ? quotesData[Math.floor(Math.random() * quotesData.length)] : null);

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col relative">
      <header className="bg-zinc-950 border-b border-red-900/30 py-3 px-6 flex justify-between items-center relative z-10 shrink-0">
        <h1 className="font-serif text-2xl text-amber-500/90 tracking-widest font-bold uppercase">Мученики</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <div className="text-sm text-zinc-500 flex items-center gap-2">
              <span className="text-zinc-300">{user.fullname || user.username}</span>
              <span className="opacity-50">({user.role === 'admin' ? 'Мастер' : 'Ученик'})</span>
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
        {user.role === 'admin' ? (
          <AdminPanel state={state} admin={user} />
        ) : (
          <StudentPanel state={state} user={user} />
        )}
      </main>
    </div>
  );
}
