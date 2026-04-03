/**
 * Maps stage numbers (1-10) to their corresponding routes
 * 1. Upload & Parse
 * 2. Part Identification
 * 3. System Identification
 * 4. Classification (Aux/Non-Aux)
 * 5. Part Review (Validation)
 * 6. Requirements
 * 7. Part Connections / Architecture
 * 8. Subsystems
 * 9. Subsystem Requirements
 * 10. Status & Finalization
 */
export function getRouteForStage(stageNumber: number): string {
  const stageRouteMap: Record<number, string> = {
    1: '/upload',
    2: '/part-identification',
    3: '/system-identification',
    4: '/classification',
    5: '/validate',
    6: '/requirements',
    7: '/architecture',
    8: '/subsystems',
    9: '/subsystems?tab=requirements',
    10: '/completed',
  };

  return stageRouteMap[stageNumber] || '/upload';
}
