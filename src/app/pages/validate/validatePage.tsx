import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ValidationView } from './components/validationView';
import { mockComponents } from '@/app/data/mockData';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function ValidatePage() {
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

  const handleValidationComplete = () => {
    const activeSessionId = contextSessionId || querySessionId;
    toast.success('All components validated!');
    if (activeSessionId) {
      navigate(`/requirements?session=${activeSessionId}`);
    } else {
      navigate('/requirements');
    }
  };  

  return (
    <ValidationView
      components={mockComponents}
      onValidationComplete={handleValidationComplete}
    />
  );
}
