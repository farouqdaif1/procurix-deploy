import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubsystemsView } from './components/SubsystemsView';
import { mockComponents, mockSession } from '@/app/data/mockData';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function SubsystemsPage() {
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

  const handleComplete = () => {
    const activeSessionId = contextSessionId || querySessionId;
    toast.success('Subsystems identified!');
    if (activeSessionId) {
      navigate(`/compliance?session=${activeSessionId}`);
    } else {
      navigate('/compliance');
    }
  };

  return (
    <SubsystemsView
      subsystems={mockSession.subsystems}
      components={mockComponents}
      requirements={mockSession.requirements}
      onComplete={handleComplete}
      onAddRequirements={() => {}}
    />
  );
}
