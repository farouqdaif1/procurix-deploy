import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FundamentalClassificationView } from './components/FundamentalClassificationView';
import { mockComponents } from '@/app/data/mockData';
import type { Component } from '@/app/types';
import { toast } from 'sonner';
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

  const handleClassificationComplete = (classifiedComponents: Component[]) => {
    const activeSessionId = contextSessionId || querySessionId;
    const fundamentalCount = classifiedComponents.filter(c => c.isFundamental === true).length;
    const auxiliaryCount = classifiedComponents.filter(c => c.isFundamental === false).length;
    
    toast.success(`Classification complete! ${fundamentalCount} fundamental, ${auxiliaryCount} auxiliary`);
    if (activeSessionId) {
      navigate(`/analysis?session=${activeSessionId}`);
    } else {
      navigate('/analysis');
    }
  };

  return (
    <FundamentalClassificationView
      components={mockComponents}
      onClassificationComplete={handleClassificationComplete}
    />
  );
}
