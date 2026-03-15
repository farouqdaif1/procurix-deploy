import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubsystemsView } from './components/SubsystemsView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { getSubsystems, generateSubsystems, getConnections, getRequirementsGET } from '@/app/services/api';
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

        // 2. Create components from subsystems' bom_reference
        // Extract all unique part numbers from all subsystems' bom_reference arrays
        const uniqueParts = new Set<string>();
        subsystemsResponse.subsystems.forEach((subsystem) => {
          subsystem.bom_reference.forEach((partNumber) => {
            if (partNumber) {
              uniqueParts.add(partNumber);
            }
          });
        });

        // Create Component objects from part numbers in bom_reference
        // These components will be rendered inside their respective subsystem groups
        const componentsList: Component[] = Array.from(uniqueParts).map((partNumber) => ({
          id: partNumber, // Use part number as ID to match with subsystem.componentIds (which contains bom_reference)
          reference: partNumber,
          partNumber: partNumber,
          type: 'component',
          description: partNumber, // Use part number as description
          specs: {},
          isIdentified: true,
          isGeneric: false,
          complianceStatus: 'unknown' as const,
        }));

        console.log('Created components from bom_reference:', {
          totalComponents: componentsList.length,
          components: componentsList.map(c => c.id),
          subsystems: mappedSubsystems.map(s => ({
            id: s.id,
            name: s.name,
            componentIds: s.componentIds,
            componentCount: s.componentIds.length
          }))
        });

        setComponents(componentsList);

        // 3. Optionally fetch connections for additional component data
        try {
          const connectionsResponse = await getConnections(activeSessionId, activeSessionId);
          // Connections can be used for additional component relationships if needed
          if (connectionsResponse?.connections) {
            console.log('Connections available:', connectionsResponse.connections.length);
          }
        } catch (connError: any) {
          // Connections are optional, continue without them
          console.log('Connections not available, using components from bom_reference only');
        }

        // 3. Fetch requirements and map to frontend Requirement type
        try {
          const requirementsResponse = await getRequirementsGET(activeSessionId);
          // Map API Requirement format to frontend Requirement format
          const mappedRequirements: Requirement[] = (requirementsResponse.requirements || []).map((apiReq) => ({
            id: apiReq.req_id,
            code: apiReq.original_req_id || apiReq.req_id,
            title: apiReq.description.split('.')[0] || apiReq.description, // Use first sentence as title
            description: apiReq.description,
            priority: 'medium' as const, // Default priority since API doesn't provide it
            category: apiReq.category,
            validationType: 'boolean' as const,
            isPassed: true, // Default value
            affectedComponents: apiReq.bom_reference || [],
          }));
          setRequirements(mappedRequirements);
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
      navigate(`/finalize?session=${activeSessionId}`);
    } else {
      navigate('/finalize');
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
