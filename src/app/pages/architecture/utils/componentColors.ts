// Utility to generate consistent random colors for components based on component_id
// Same component_id will always get the same color

const colorPalette = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }, // blue
  { bg: '#fce7f3', text: '#9f1239', border: '#f9a8d4' }, // pink
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }, // amber
  { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' }, // green
  { bg: '#e9d5ff', text: '#6b21a8', border: '#c084fc' }, // purple
  { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' }, // orange
  { bg: '#cffafe', text: '#164e63', border: '#67e8f9' }, // cyan
  { bg: '#fecdd3', text: '#881337', border: '#fda4af' }, // rose
  { bg: '#ddd6fe', text: '#5b21b6', border: '#a78bfa' }, // violet
  { bg: '#bbf7d0', text: '#14532d', border: '#4ade80' }, // emerald
];

// Hash function to convert string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get consistent color for a component_id
export function getComponentColor(componentId: string) {
  const hash = hashString(componentId);
  const colorIndex = hash % colorPalette.length;
  return colorPalette[colorIndex];
}

// Create a color map for all components
export function createComponentColorMap(componentIds: string[]): Map<string, typeof colorPalette[0]> {
  const colorMap = new Map<string, typeof colorPalette[0]>();
  componentIds.forEach(id => {
    if (!colorMap.has(id)) {
      colorMap.set(id, getComponentColor(id));
    }
  });
  return colorMap;
}
