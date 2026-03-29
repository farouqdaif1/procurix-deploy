import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UploadBOMResponse } from '@/app/services/api';

interface SessionContextType {
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
  uploadData: UploadBOMResponse | null;
  setUploadData: (data: UploadBOMResponse | null) => void;
  currentStage: number | null;
  setCurrentStage: (stage: number | null) => void;
  // Increments every time chat changes backend state — pages watch this to re-fetch
  refreshTrigger: number;
  triggerRefresh: () => void;
  // Expose setter so ChatPanel can push stage updates from chat responses
  pushStage: (stage: number) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<UploadBOMResponse | null>(null);
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(n => n + 1);
  }, []);

  const pushStage = useCallback((stage: number) => {
    setCurrentStage(stage);
  }, []);

  // Also listen for the global 'design:updated' event so any code can trigger a refresh
  useEffect(() => {
    const handler = () => triggerRefresh();
    window.addEventListener('design:updated', handler);
    return () => window.removeEventListener('design:updated', handler);
  }, [triggerRefresh]);

  return (
    <SessionContext.Provider value={{
      sessionId, setSessionId,
      uploadData, setUploadData,
      currentStage, setCurrentStage,
      refreshTrigger, triggerRefresh,
      pushStage,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
