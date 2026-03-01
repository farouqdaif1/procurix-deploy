/**
 * Maps stage numbers (1-9) to their corresponding routes
 */
export function getRouteForStage(stageNumber: number): string {
  const stageRouteMap: Record<number, string> = {
    1: '/upload',
    2: '/fundamental',
    3: '/analysis',
    4: '/validate',
    5: '/architecture',
    6: '/requirements',
    7: '/subsystems',
    8: '/subsystems?tab=requirements',
    9: '/completed',
  };
  
  return stageRouteMap[stageNumber] || '/upload';
}
