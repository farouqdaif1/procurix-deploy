import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemArchitectureView } from './components/SystemArchitectureView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { analyzeConnections, getConnections, getClassification, getPartSpecs, saveConnections, updateCurrentStageInContext, type Connection } from '@/app/services/api';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import type { Component } from '@/app/types';

export function ArchitecturePage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId, setCurrentStage, refreshTrigger } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();
  const [components, setComponents] = useState<Component[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [classificationMap, setClassificationMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync session ID from query params
  useEffect(() => {
    if (querySessionId && querySessionId !== contextSessionId) {
      setSessionId(querySessionId);
    }
  }, [querySessionId, contextSessionId, setSessionId]);

  useEffect(() => {
    let isCurrent = true;

    const fetchConnections = async () => {
      const activeSessionId = contextSessionId || querySessionId;

      if (!activeSessionId) {
        if (isCurrent) { setError('No session ID available'); setIsLoading(false); }
        return;
      }

      try {
        if (isCurrent) { setIsLoading(true); setError(null); }
        updateParams(activeSessionId);

        // GET first — only POST (generate) if truly empty
        let response;
        try {
          response = await getConnections(activeSessionId, activeSessionId);

          if (!response.connections || response.connections.length === 0) {
            if (!isCurrent) return;
            try {
              response = await analyzeConnections(activeSessionId);
            } catch (postError: any) {
              // 409 = another concurrent call is already generating — re-fetch
              if (postError.message?.includes('409')) {
                response = await getConnections(activeSessionId, activeSessionId);
              } else {
                throw postError;
              }
            }
          }
        } catch (getError: any) {
          if (getError.message?.includes('404')) {
            if (!isCurrent) return;
            try {
              response = await analyzeConnections(activeSessionId);
            } catch (postError: any) {
              if (postError.message?.includes('409')) {
                response = await getConnections(activeSessionId, activeSessionId);
              } else {
                throw postError;
              }
            }
          } else {
            throw getError;
          }
        }

        if (!isCurrent) return;

        // Fetch all classified parts so isolated (unconnected) parts still appear
        let allPartNumbers: string[] = [];
        let specsMap: Record<string, Record<string, unknown>> = {};
        try {
          const [cls, specs] = await Promise.all([
            getClassification(activeSessionId),
            getPartSpecs(activeSessionId),
          ]);
          allPartNumbers = Object.keys(cls.classification_map || {});
          specsMap = specs;
          if (isCurrent) setClassificationMap(cls.classification_map || {});
        } catch {
          // fallback: derive from connections only
        }
        if (!isCurrent) return;

        // Build component list from connections (which now use instance IDs like "TPS62840_1")
        // Each instance becomes a separate node in the architecture view
        const uniqueInstances = new Set<string>();
        response.connections.forEach((conn: Connection) => {
          if (conn.source_part) uniqueInstances.add(conn.source_part);
          if (conn.target_part) uniqueInstances.add(conn.target_part);
        });

        // Helper to extract base MPN from instance_id (e.g., "TPS62840_1" -> "TPS62840")
        const extractMpn = (instanceId: string): string => {
          if (instanceId.includes('_')) {
            const parts = instanceId.split('_');
            const lastPart = parts[parts.length - 1];
            if (/^\d+$/.test(lastPart)) {
              return parts.slice(0, -1).join('_');
            }
          }
          return instanceId;
        };

        // Helper to extract instance index (e.g., "TPS62840_1" -> 1)
        const extractInstanceIndex = (instanceId: string): number | null => {
          if (instanceId.includes('_')) {
            const parts = instanceId.split('_');
            const lastPart = parts[parts.length - 1];
            if (/^\d+$/.test(lastPart)) {
              return parseInt(lastPart, 10);
            }
          }
          return null;
        };

        // Create Component objects from instances
        const componentsList: Component[] = Array.from(uniqueInstances).map((instanceId) => {
          const baseMpn = extractMpn(instanceId);
          const instanceIndex = extractInstanceIndex(instanceId);
          const isInstance = instanceIndex !== null;

          // Get specs using base MPN (specs are shared across instances)
          const specs = specsMap[baseMpn] ?? {};

          return {
            id: instanceId,
            reference: instanceId,
            partNumber: baseMpn,
            // Add instance info to display
            type: isInstance ? `${specs.Category || 'component'} (${instanceIndex})` : 'component',
            description: specs.Description || `Component ${baseMpn}`,
            specs: {
              ...specs,
              // Add instance-specific display info
              ...(isInstance ? { 'Instance': `${instanceIndex} of qty` } : {}),
            },
            isIdentified: true,
            isGeneric: false,
            complianceStatus: 'compliant',
          };
        });

        // Map connections to ConnectionData format
        const mappedConnections = response.connections
          .filter((conn: Connection) => conn.target_part !== null) // Filter out connections without target
          .map((conn: Connection, index: number) => {
            // Connection types are normalized to canonical values by the backend before storage.
            // Use the type as-is; fall back to 'signal' only for truly unknown values.
            const mappedType = conn.connection_type.toLowerCase() || 'signal';
            
            return {
              id: `conn-${conn.source_part}-${conn.target_part}-${index}`,
              from: conn.source_part,
              to: conn.target_part!,
              type: mappedType as any,
              connection_type: conn.connection_type,
              label: conn.reasoning,
              edgeType: 'smoothstep', // Default to smoothstep
            };
          });

        setComponents(componentsList);
        setConnections(mappedConnections);
        setIsLoading(false);
      } catch (err) {
        if (!isCurrent) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };

    fetchConnections();
    return () => { isCurrent = false; };
  }, [contextSessionId, querySessionId, updateParams, refreshTrigger]);

  const handleArchitectureComplete = async (
    _blocks: any[],
    updatedConnections: any[],
  ) => {
    const activeSessionId = contextSessionId || querySessionId;

    // Persist the user-corrected connections to bom_part_connections (source of truth)
    if (activeSessionId && updatedConnections.length > 0) {
      try {
        const payload = updatedConnections
          .filter((c) => c.from && c.to)
          .map((c) => ({
            source_part: c.from,
            target_part: c.to,
            // Explicitly send instance IDs for instance-based tracking
            source_instance_id: c.from,
            target_instance_id: c.to,
            connection_type: c.type || c.connection_type || 'signal',
          }));
        await saveConnections(activeSessionId, payload);
      } catch (error) {
        console.error('Error saving connections:', error);
        toast.error('Failed to save connection changes');
        return;
      }
    }

    // Update current stage
    if (activeSessionId && setCurrentStage) {
      try {
        await updateCurrentStageInContext(activeSessionId, setCurrentStage);
      } catch (error) {
        console.error('Error updating stage after architecture completion:', error);
      }
    }

    toast.success('System architecture defined!');
    if (activeSessionId) {
      navigate(`/subsystems?session=${activeSessionId}`);
    } else {
      navigate('/subsystems');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing connections...</p>
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
    <SystemArchitectureView
      components={components}
      onArchitectureComplete={handleArchitectureComplete}
      initialConnections={connections}
      classificationMap={classificationMap}
    />
  );
}
