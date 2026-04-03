import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartIdentificationView } from './components/PartIdentificationView';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function FundamentalPage() {
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

  const handleIdentificationComplete = () => {
    const activeSessionId = contextSessionId || querySessionId;
    if (activeSessionId) {
      navigate(`/system-identification?session=${activeSessionId}`);
    } else {
      navigate('/system-identification');
    }
  };

  return <PartIdentificationView onComplete={handleIdentificationComplete} />;
}
