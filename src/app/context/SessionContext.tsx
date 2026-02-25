import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UploadBOMResponse } from '@/app/services/api';

interface SessionContextType {
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
  uploadData: UploadBOMResponse | null;
  setUploadData: (data: UploadBOMResponse | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<UploadBOMResponse | null>(null);

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId, uploadData, setUploadData }}>
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
