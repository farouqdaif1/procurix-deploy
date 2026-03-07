import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOMLibrary } from './components/BOMLibrary';
import { getAllBOMs } from '@/app/services/api';
import type { BOMSession, SessionStage } from '@/app/types';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { getRouteForStage } from '@/app/shared/utils/navigation';

// Map API stage number to SessionStage type
// Stages: 1=Upload, 2=Classification, 3=Analysis, 4=Validation, 5=Requirements, 6=Connections, 7=Subsystems, 8=Subsystem Reqs, 9=Finalization
const mapStageNumberToStage = (stageNumber: number): SessionStage => {
  if (stageNumber >= 9) return 'review'; // Stage 9: Status & Finalization
  if (stageNumber >= 8) return 'subsystems'; // Stage 8: Subsystem Requirements
  if (stageNumber >= 7) return 'subsystems'; // Stage 7: Subsystems
  if (stageNumber >= 6) return 'architecture'; // Stage 6: Part Connections
  if (stageNumber >= 5) return 'requirements'; // Stage 5: Requirements
  if (stageNumber >= 4) return 'validate'; // Stage 4: Validation
  if (stageNumber >= 3) return 'analysis'; // Stage 3: System Analysis
  if (stageNumber >= 2) return 'fundamental'; // Stage 2: Classification
  return 'upload'; // Stage 1: Upload & Parse
};

export function LibraryPage() {
  const navigate = useNavigate();
  const { setSessionId, setCurrentStage, setUploadData } = useSession();
  const [sessions, setSessions] = useState<BOMSession[]>([]);
  const [sessionStageMap, setSessionStageMap] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBOMs = async () => {
      try {
        setIsLoading(true);
        const response = await getAllBOMs();
        
        // Transform API response to BOMSession format
        const stageMap = new Map<string, number>();
        const transformedSessions: BOMSession[] = response.boms.map((bom) => {
          const stage = mapStageNumberToStage(bom.current_stage);
          const isComplete = bom.current_stage >= 9; // Stage 9 is considered complete
          
          // Store original stage number for navigation
          stageMap.set(bom.bom_id, bom.current_stage);
          
          return {
            id: bom.bom_id,
            name: bom.system_type || `BOM ${bom.bom_id.slice(0, 8)}`,
            systemType: bom.system_type,
            version: 1,
            stage: stage,
            components: [], // Not provided by API
            requirements: [], // Not provided by API
            subsystems: [], // Not provided by API
            complianceScore: isComplete ? undefined : undefined, // Will be set if available
            totalComponents: bom.total_parts,
            compliantComponents: 0, // Not provided by API
            createdAt: new Date(bom.created_at),
            updatedAt: new Date(bom.created_at),
            // Store original stage number for accurate progress calculation
            currentStageNumber: bom.current_stage,
          } as BOMSession & { currentStageNumber: number };
        });

        setSessions(transformedSessions);
        setSessionStageMap(stageMap);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load BOMs';
        toast.error(errorMessage);
        console.error('Error fetching BOMs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBOMs();
  }, []);

  const handleSelectSession = (session: BOMSession) => {
    // Set session ID in context
    setSessionId(session.id);
    
    // Get the current stage number from the map
    const currentStage = sessionStageMap.get(session.id) || 1;
    
    // Set current_stage in context so StageIndicator knows the max reached stage
    setCurrentStage(currentStage);
    
    // Get the route for this stage
    const route = getRouteForStage(currentStage);
    
    // Navigate with query parameter
    navigate(`${route}?session=${session.id}`);
  };

  const handleNewBOM = () => {
    // Clear all session context when starting a new BOM upload
    setSessionId(null);
    setCurrentStage(null);
    setUploadData(null);
    // Navigate to upload without any query parameters (explicitly clear them)
    navigate('/upload', { replace: true, state: {} });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading BOMs...</p>
        </div>
      </div>
    );
  }

  return (
    <BOMLibrary
      sessions={sessions}
      onSelectSession={handleSelectSession}
      onNewBOM={handleNewBOM}
    />
  );
}
