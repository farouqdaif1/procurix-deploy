import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequirementsView } from './components/RequirementsView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function RequirementsPage() {
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

  const handleRequirementsComplete = () => {
    const activeSessionId = contextSessionId || querySessionId;
    toast.success('Requirements generated!');
    if (activeSessionId) {
      navigate(`/architecture?session=${activeSessionId}`);
    } else {
      navigate('/architecture');
    }
  };

  return (
    <RequirementsView
      onRequirementsComplete={handleRequirementsComplete}
    />
  );
}
