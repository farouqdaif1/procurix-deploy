import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { 
  getComponents, 
  finalizeSession, 
  getRequirementsData,
  type FinalizedComponent,
  type FinalizeResponse,
  type RequirementsDataResponse
} from '@/app/services/api';
import { FinalizeView } from './components/FinalizeView';

export function FinalizePage() {
  const { sessionId: contextSessionId, setSessionId } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();
  const [components, setComponents] = useState<FinalizedComponent[]>([]);
  const [requirementsData, setRequirementsData] = useState<RequirementsDataResponse | null>(null);
  const [finalizeResponse, setFinalizeResponse] = useState<FinalizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Main logic: Check components, finalize if needed, then fetch data
  useEffect(() => {
    const fetchData = async () => {
      const activeSessionId = contextSessionId || querySessionId;
      
      if (!activeSessionId) {
        setError('No session ID available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Update URL with session query param
        updateParams(activeSessionId);

        // Step 1: Check if components exist
        let componentsResponse = await getComponents(activeSessionId);
        
        // Step 2: If components_count is 0 or components array is empty, call finalize
        if (componentsResponse.components_count === 0 || componentsResponse.components.length === 0) {
          toast.info('Finalizing session...');
          const finalizeResult = await finalizeSession(activeSessionId);
          setFinalizeResponse(finalizeResult);
          toast.success(`Finalized! Created ${finalizeResult.components_created} components`);
          
          // Step 3: After finalize, fetch components again
          componentsResponse = await getComponents(activeSessionId);
        }

        setComponents(componentsResponse.components);

        // Step 4: Fetch requirements data
        try {
          const reqData = await getRequirementsData(activeSessionId);
          setRequirementsData(reqData);
        } catch (reqError: any) {
          console.warn('Failed to fetch requirements data:', reqError);
          // Continue without requirements data
        }

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to finalize session';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contextSessionId, querySessionId, updateParams]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Finalizing session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <FinalizeView
      components={components}
      requirementsData={requirementsData}
      finalizeResponse={finalizeResponse}
    />
  );
}
