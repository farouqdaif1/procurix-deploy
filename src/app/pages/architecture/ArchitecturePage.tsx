import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemArchitectureView } from './components/SystemArchitectureView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { analyzeConnections, type Connection } from '@/app/services/api';
import type { Component } from '@/app/types';

export function ArchitecturePage() {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const [components, setComponents] = useState<Component[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!sessionId) {
        setError('No session ID available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Session ID:', sessionId);
        const response = await analyzeConnections(sessionId);
        
        // Log connections from backend
        console.log('Connections from backend:', response.connections);
        
        // Extract unique part numbers from connections
        const uniqueParts = new Set<string>();
        response.connections.forEach((conn: Connection) => {
          if (conn.source_part) uniqueParts.add(conn.source_part);
          if (conn.target_part) uniqueParts.add(conn.target_part);
        });

        // Create Component objects from unique parts
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

        // Map connections to ConnectionData format
        const mappedConnections = response.connections
          .filter((conn: Connection) => conn.target_part !== null) // Filter out connections without target
          .map((conn: Connection, index: number) => {
            // Map connection_type to valid ConnectionData type
            // "direct" maps to "signal", other types are used as-is if valid
            const connectionTypeMap: Record<string, string> = {
              'direct': 'signal',
              'power': 'power',
              'signal': 'signal',
              'data': 'data',
              'analog': 'analog',
              'differential': 'differential',
              'clock': 'clock',
              'ground': 'ground',
              'switching': 'switching',
              'power_and_feedback': 'power_and_feedback',
              'feedback': 'feedback',
              'control': 'control',
            };
            const mappedType = connectionTypeMap[conn.connection_type.toLowerCase()] || 'signal';
            
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [sessionId]);

  const handleArchitectureComplete = () => {
    toast.success('System architecture defined!');
    navigate('/requirements');
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
    />
  );
}
