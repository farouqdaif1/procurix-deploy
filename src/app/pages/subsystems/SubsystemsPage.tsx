import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubsystemsView } from './components/SubsystemsView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { getSubsystems, generateSubsystems, getConnections, getSubsystemConnections, getRequirementsGET, type Connection, type SubsystemConnection } from '@/app/services/api';
import type { Component, Subsystem, Requirement } from '@/app/types';

export function SubsystemsPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [subsystemConnections, setSubsystemConnections] = useState<SubsystemConnection[]>([]);
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

  // Fetch subsystems, components, and requirements from API
  useEffect(() => {
    let isCurrent = true; // guard against stale concurrent fetches

    const fetchData = async () => {
      const activeSessionId = contextSessionId || querySessionId;

      if (!activeSessionId) {
        if (isCurrent) { setError('No session ID available'); setIsLoading(false); }
        return;
      }

      try {
        if (isCurrent) { setIsLoading(true); setError(null); }
        
        // Update URL with session query param
        updateParams(activeSessionId);

        // 1. Fetch subsystems (GET first, POST only if truly empty)
        let subsystemsResponse;
        try {
          subsystemsResponse = await getSubsystems(activeSessionId);

          if (subsystemsResponse.subsystems_count === 0 || subsystemsResponse.subsystems.length === 0) {
            if (!isCurrent) return;
            console.log('Subsystems are empty, generating...');
            try {
              subsystemsResponse = await generateSubsystems(activeSessionId);
            } catch (postError: any) {
              // 409 = another concurrent call already generated them — re-fetch
              if (postError.message?.includes('409')) {
                subsystemsResponse = await getSubsystems(activeSessionId);
              } else {
                throw postError;
              }
            }
          }
        } catch (getError: any) {
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get subsystems')) {
            try {
              subsystemsResponse = await generateSubsystems(activeSessionId);
            } catch (postError: any) {
              if (postError.message?.includes('409')) {
                subsystemsResponse = await getSubsystems(activeSessionId);
              } else {
                throw postError;
              }
            }
          } else {
            throw getError;
          }
        }

        // Map backend subsystems to frontend Subsystem format
        const mappedSubsystems: Subsystem[] = subsystemsResponse.subsystems.map((backendSubsystem) => ({
          id: backendSubsystem.subsystem_id,
          name: backendSubsystem.name,
          type: backendSubsystem.original_subsystem_id || backendSubsystem.name.toLowerCase().replace(/\s+/g, '_'),
          componentIds: backendSubsystem.bom_reference, // bom_reference contains part numbers
          complianceScore: undefined, // Not provided by API
        }));

        if (!isCurrent) return;
        setSubsystems(mappedSubsystems);

        // 2. Create components from subsystems' bom_reference
        const uniqueParts = new Set<string>();
        subsystemsResponse.subsystems.forEach((subsystem) => {
          subsystem.bom_reference.forEach((partNumber) => {
            if (partNumber) uniqueParts.add(partNumber);
          });
        });

        const componentsList: Component[] = Array.from(uniqueParts).map((partNumber) => ({
          id: partNumber,
          reference: partNumber,
          partNumber: partNumber,
          type: 'component',
          description: partNumber,
          specs: {},
          isIdentified: true,
          isGeneric: false,
          complianceStatus: 'unknown' as const,
        }));

        if (!isCurrent) return;
        setComponents(componentsList);

        // 3. Fetch part-level connections + subsystem-level connections
        // Both fetched AFTER subsystems are committed so bom_reference is populated
        try {
          const [connectionsResponse, subsystemConnsResponse] = await Promise.all([
            getConnections(activeSessionId, activeSessionId),
            getSubsystemConnections(activeSessionId),
          ]);
          if (!isCurrent) return;
          if (connectionsResponse?.connections) {
            setConnections(connectionsResponse.connections);
          }
          if (subsystemConnsResponse?.subsystem_connections) {
            setSubsystemConnections(subsystemConnsResponse.subsystem_connections);
          }
        } catch (connError: any) {
          console.log('Connections not available:', connError.message);
        }

        // 4. Fetch requirements
        try {
          const requirementsResponse = await getRequirementsGET(activeSessionId);
          const mappedRequirements: Requirement[] = (requirementsResponse.requirements || []).map((apiReq) => ({
            id: apiReq.req_id,
            code: apiReq.original_req_id || apiReq.req_id,
            title: apiReq.description.split('.')[0] || apiReq.description,
            description: apiReq.description,
            priority: 'medium' as const,
            category: apiReq.category,
            validationType: 'boolean' as const,
            isPassed: true,
            affectedComponents: apiReq.bom_reference || [],
          }));
          if (!isCurrent) return;
          setRequirements(mappedRequirements);
        } catch (reqError: any) {
          console.warn('Failed to fetch requirements:', reqError);
          if (isCurrent) setRequirements([]);
        }

        if (isCurrent) setIsLoading(false);
      } catch (err) {
        if (!isCurrent) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subsystems data';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };

    fetchData();
    return () => { isCurrent = false; };
  }, [contextSessionId, querySessionId, updateParams]);

  const handleComplete = () => {
    const activeSessionId = contextSessionId || querySessionId;
    toast.success('Subsystems identified!');
    if (activeSessionId) {
      navigate(`/review?session=${activeSessionId}`);
    } else {
      navigate('/review');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subsystems...</p>
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

  const activeSessionId = contextSessionId || querySessionId;

  return (
    <SubsystemsView
      subsystems={subsystems}
      components={components}
      requirements={requirements}
      connections={connections}
      subsystemConnections={subsystemConnections}
      onComplete={handleComplete}
      onAddRequirements={() => {}}
      sessionId={activeSessionId || ''}
    />
  );
}
