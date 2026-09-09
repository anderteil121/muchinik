import { useEffect, useState } from 'react';
import { socket } from './socket';
import { GameState } from '../types';

export function useGameState() {
  const [state, setState] = useState<GameState | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch state', err);
    }
  };

  useEffect(() => {
    fetchState();
    
    socket.on('state_updated', fetchState);
    
    return () => {
      socket.off('state_updated', fetchState);
    };
  }, []);

  return { state, fetchState };
}
