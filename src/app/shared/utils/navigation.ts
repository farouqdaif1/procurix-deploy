/**
 * Maps stage numbers (1-9) to their corresponding routes
 * 1. Upload & Parse
 * 2. Classification
 * 3. System Analysis
 * 4. Validation
 * 5. Requirements
 * 6. Part Connections
 * 7. Subsystems
 * 8. Subsystem Requirements
 * 9. Status & Finalization
 */
export function getRouteForStage(stageNumber: number): string {
  const stageRouteMap: Record<number, string> = {
    1: '/upload',           // Upload & Parse
    2: '/system-identification', // System Identification + HITL (before classification)
    3: '/part-identification',  // Part Identification (uses confirmed system type)
    4: '/validate',         // Validation
    5: '/requirements',     // Requirements
    6: '/architecture',     // Part Connections
    7: '/subsystems',       // Subsystems
    8: '/subsystems?tab=requirements', // Subsystem Requirements
    9: '/completed',        // Status & Finalization
  };
  
  return stageRouteMap[stageNumber] || '/upload';
}
