import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequirementsView } from './components/RequirementsView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { updateCurrentStageInContext } from '@/app/services/api';

export function RequirementsPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId, setCurrentStage } = useSession();
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

  const handleRequirementsComplete = async () => {
    const activeSessionId = contextSessionId || querySessionId;
    
    // Update current stage when user explicitly completes requirements step
    if (activeSessionId && setCurrentStage) {
      try {
        await updateCurrentStageInContext(activeSessionId, setCurrentStage);
      } catch (error) {
        console.error('Error updating stage after requirements completion:', error);
        // Don't block navigation if stage update fails
      }
    }
    
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
