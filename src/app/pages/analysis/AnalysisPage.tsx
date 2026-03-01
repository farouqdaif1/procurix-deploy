import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisView } from './components/AnalysisView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function AnalysisPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();

  // Sync session ID from query params
  useEffect(() => {
    if (querySessionId && querySessionId !== contextSessionId) {
      setSessionId(querySessionId);
    }
  }, [querySessionId, contextSessionId, setSessionId]);

  // Update URL with session ID if it exists in context but not in URL
  useEffect(() => {
    if (contextSessionId && contextSessionId !== querySessionId) {
      updateParams(contextSessionId);
    }
  }, [contextSessionId, querySessionId, updateParams]);

  const handleSystemTypeSelected = (systemType: string) => {
    const activeSessionId = contextSessionId || querySessionId;
    toast.success(`System type selected: ${systemType}`);
    if (activeSessionId) {
      navigate(`/validate?session=${activeSessionId}`);
    } else {
      navigate('/validate');
    }
  };

  return <AnalysisView onSystemTypeSelected={handleSystemTypeSelected} />;
}
