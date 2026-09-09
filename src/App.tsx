import React, { useState } from 'react';
import { useGameState } from './lib/useGameState';
import { AdminPanel } from './components/AdminPanel';
import { StudentPanel } from './components/StudentPanel';
import { Button, Input } from './components/ui';

export default function App() {
  const { state, fetchState } = useGameState();
  const [user, setUser] = useState<any>(null);
  
  // Auth state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }
      
      setUser(data);
      // Wait a moment for socket to sync or just fetch immediately
      fetchState();
    } catch (err) {
      setError('Network error');
    }
  };

  if (!state) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-serif">Пробуждение...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        
        <div className="w-full max-w-sm z-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-4xl text-amber-500/90 tracking-widest font-bold">МУЧЕНИКИ</h1>
            <p className="text-zinc-500 font-serif italic text-sm">Врата открываются лишь достойным</p>
          </div>

          <form onSubmit={handleAuth} className="bg-zinc-900 border border-red-900/30 p-6 rounded-sm shadow-2xl shadow-red-900/10 space-y-4 relative">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Имя</label>
                <Input value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1 block">Пароль</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            {error && <div className="text-red-500 text-xs text-center p-2 bg-red-950/50 rounded-sm border border-red-900">{error}</div>}

            <Button type="submit" className="w-full h-11 text-lg tracking-wider">
              {isLogin ? 'Войти' : 'Создать печать'}
            </Button>
            
            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-xs text-zinc-500 hover:text-amber-500/80 transition-colors"
              >
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col relative">
      <header className="bg-zinc-950 border-b border-red-900/30 py-3 px-6 flex justify-between items-center relative z-10">
        <h1 className="font-serif text-2xl text-amber-500/90 tracking-widest font-bold uppercase">Мученики</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500">
            {user.role === 'admin' ? 'Мастер' : 'Ученик'}
          </div>
          <Button variant="secondary" onClick={() => setUser(null)} className="text-xs px-3 py-1">
            Покинуть обитель
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative z-0">
        {user.role === 'admin' ? (
          <AdminPanel state={state} admin={user} />
        ) : (
          <StudentPanel state={state} user={user} />
        )}
      </main>
    </div>
  );
}
