/**
 * Classification Page — Aux/Non-Aux segregation.
 *
 * Runs AFTER System Identification. Uses FundamentalClassificationView in
 * forceClassifyPhase mode (skips Research + Selection — Part ID was done on
 * the /part-identification page). Navigates to /validate on complete.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FundamentalClassificationView } from '../fundamental/components/FundamentalClassificationView';
import type { Component } from '@/app/types';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function ClassificationPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();

  useEffect(() => {
    if (querySessionId && querySessionId !== contextSessionId) {
      setSessionId(querySessionId);
    }
  }, [querySessionId, contextSessionId, setSessionId]);

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
      navigate(`/validate?session=${activeSessionId}`);
    } else {
      navigate('/validate');
    }
  };

  return (
    <FundamentalClassificationView
      components={[]}
      onClassificationComplete={handleClassificationComplete}
      forceClassifyPhase
    />
  );
}
