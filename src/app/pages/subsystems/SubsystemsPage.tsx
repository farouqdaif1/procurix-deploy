import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubsystemsView } from './components/SubsystemsView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { getSubsystems, generateSubsystems, getConnections, getRequirementsGET, type Connection } from '@/app/services/api';
import type { Component, Subsystem, Requirement } from '@/app/types';

export function SubsystemsPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
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

        // 1. Fetch subsystems (GET first, POST if empty)
        let subsystemsResponse;
        try {
          subsystemsResponse = await getSubsystems(activeSessionId);
          
          // If subsystems are empty, generate them via POST
          if (subsystemsResponse.subsystems_count === 0 || subsystemsResponse.subsystems.length === 0) {
            console.log('Subsystems are empty, generating...');
            subsystemsResponse = await generateSubsystems(activeSessionId);
            console.log('Generated subsystems:', subsystemsResponse.subsystems);
          }
        } catch (getError: any) {
          // If 404 or error, try POST to generate
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get subsystems')) {
            console.log('Subsystems not found, generating...');
            subsystemsResponse = await generateSubsystems(activeSessionId);
            console.log('Generated subsystems:', subsystemsResponse.subsystems);
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

        setSubsystems(mappedSubsystems);

        // 2. Fetch connections to get all components
        let connectionsResponse;
        try {
          connectionsResponse = await getConnections(activeSessionId, activeSessionId);
        } catch (connError: any) {
          // If connections don't exist, extract components from subsystems
          console.log('Connections not available, extracting components from subsystems');
          const uniqueParts = new Set<string>();
          subsystemsResponse.subsystems.forEach((subsystem) => {
            subsystem.bom_reference.forEach((partNumber) => {
              uniqueParts.add(partNumber);
            });
          });

          const componentsList: Component[] = Array.from(uniqueParts).map((partNumber) => ({
            id: partNumber,
            reference: partNumber,
            partNumber: partNumber,
            type: 'component',
            description: `Component ${partNumber}`,
            specs: {},
            isIdentified: true,
            isGeneric: false,
            complianceStatus: 'compliant',
          }));

          setComponents(componentsList);
        }

        // If connections exist, extract components from them
        if (connectionsResponse?.connections) {
          const uniqueParts = new Set<string>();
          connectionsResponse.connections.forEach((conn: Connection) => {
            if (conn.source_part) uniqueParts.add(conn.source_part);
            if (conn.target_part) uniqueParts.add(conn.target_part);
          });

          // Also add components from subsystems' bom_reference
          subsystemsResponse.subsystems.forEach((subsystem) => {
            subsystem.bom_reference.forEach((partNumber) => {
              uniqueParts.add(partNumber);
            });
          });

          const componentsList: Component[] = Array.from(uniqueParts).map((partNumber) => ({
            id: partNumber,
            reference: partNumber,
            partNumber: partNumber,
            type: 'component',
            description: `Component ${partNumber}`,
            specs: {},
            isIdentified: true,
            isGeneric: false,
            complianceStatus: 'compliant',
          }));

          setComponents(componentsList);
        }

        // 3. Fetch requirements
        try {
          const requirementsResponse = await getRequirementsGET(activeSessionId);
          setRequirements(requirementsResponse.requirements || []);
        } catch (reqError: any) {
          console.warn('Failed to fetch requirements:', reqError);
          // Requirements are optional, continue without them
          setRequirements([]);
        }

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subsystems data';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };

    fetchData();
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
      onComplete={handleComplete}
      onAddRequirements={() => {}}
      sessionId={activeSessionId || ''}
    />
  );
}
