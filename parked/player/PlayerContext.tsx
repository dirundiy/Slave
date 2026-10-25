import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { PlayerApi } from '../types';
import { beginLogin, isConfigured, isLoggedIn, logout } from '../spotify/auth';
import { useDemoPlayer } from './useDemoPlayer';
import { useSpotifyPlayer } from './useSpotifyPlayer';

export interface SpotifySession {
  configured: boolean;
  connected: boolean;
  /** Starts sign-in, or opens the setup steps when no Client ID is configured. */
  connect(): void;
  disconnect(): void;
  error: string | null;
  clearError(): void;
  setupOpen: boolean;
  setSetupOpen(open: boolean): void;
}

const Ctx = createContext<{ player: PlayerApi; spotify: SpotifySession } | null>(null);

export function PlayerProvider({ children, authError }: { children: ReactNode; authError: string | null }) {
  const [connected, setConnected] = useState(isLoggedIn());
  const [error, setError] = useState<string | null>(authError);
  const [setupOpen, setSetupOpen] = useState(false);
  const signedOut = useCallback(() => setConnected(false), []);

  const demo = useDemoPlayer(!connected);
  const live = useSpotifyPlayer(connected, signedOut);

  const spotify: SpotifySession = {
    configured: isConfigured(),
    connected,
    connect: () => {
      if (!isConfigured()) return setSetupOpen(true);
      beginLogin().catch(e => setError((e as Error).message));
    },
    disconnect: () => {
      logout();
      setConnected(false);
    },
    error,
    clearError: () => setError(null),
    setupOpen,
    setSetupOpen
  };

  return <Ctx.Provider value={{ player: connected ? live : demo, spotify }}>{children}</Ctx.Provider>;
}

export const usePlayer = () => useContext(Ctx)!.player;
export const useSpotify = () => useContext(Ctx)!.spotify;
