import type { ComponentBlock } from '../components/SystemArchitectureView';

export interface ConnectionData {
  id: string;
  from: string;
  to: string;
  type: string;
  [key: string]: any;
}

export type LayoutType = 'random';

// Simple horizontal flow layout (current implementation)
export function horizontalFlowLayout(
  blocks: ComponentBlock[],
  _connections: ConnectionData[]
): ComponentBlock[] {
  const columnWidth = 300;
  const startX = 100;
  const startY = 200;
  const viewportWidth = 2000;
  
  // Calculate total width needed
  const totalWidth = blocks.length * columnWidth;
  
  // Center horizontally if total width is less than viewport
  const offsetX = totalWidth < viewportWidth ? (viewportWidth - totalWidth) / 2 : startX;

  return blocks.map((block, idx) => ({
    ...block,
    x: offsetX + idx * columnWidth,
    y: startY,
  }));
}

// Dagre Tree layout - groups connected components together
export function dagreTreeLayout(
  blocks: ComponentBlock[],
  connections: ConnectionData[]
): ComponentBlock[] {
  // Group components by connectivity
  const connectedComponents = new Set<string>();
  const componentMap = new Map<string, ComponentBlock>();

  blocks.forEach(block => {
    componentMap.set(block.id, block);
  });

  // Find all connected components
  connections.forEach(conn => {
    connectedComponents.add(conn.from);
    connectedComponents.add(conn.to);
  });

  // Separate connected and unconnected components
  const connected: ComponentBlock[] = [];
  const unconnected: ComponentBlock[] = [];

  blocks.forEach(block => {
    if (connectedComponents.has(block.id)) {
      connected.push(block);
    } else {
      unconnected.push(block);
    }
  });

  // Build graph structure for connected components
  const graph: Record<string, string[]> = {};
  connected.forEach(block => {
    graph[block.id] = [];
  });

  connections.forEach(conn => {
    if (!graph[conn.from]) graph[conn.from] = [];
    if (!graph[conn.to]) graph[conn.to] = [];
    if (!graph[conn.from].includes(conn.to)) {
      graph[conn.from].push(conn.to);
    }
  });

  // Simple tree layout algorithm
  const positioned = new Set<string>();
  const result: ComponentBlock[] = [];
  const nodeHeight = 250;
  const horizontalSpacing = 250;
  const verticalSpacing = 150;

  // Find root nodes (nodes with no incoming edges)
  const hasIncoming = new Set<string>();
  connections.forEach(conn => {
    hasIncoming.add(conn.to);
  });

  const roots = connected.filter(block => !hasIncoming.has(block.id));

  // Layout connected components using simple tree structure
  // Start from a more centered position
  const viewportWidth = 2000;
  const viewportHeight = 2000;
  let currentX = viewportWidth / 4; // Start at 1/4 of viewport width
  let currentY = viewportHeight / 4; // Start at 1/4 of viewport height
  let maxY = currentY;

  function layoutNode(blockId: string, x: number, y: number, level: number) {
    if (positioned.has(blockId)) return;

    const block = componentMap.get(blockId);
    if (!block) return;

    positioned.add(blockId);
    result.push({
      ...block,
      x,
      y,
    });

    const children = graph[blockId] || [];
    if (children.length > 0) {
      const childX = x + horizontalSpacing;
      const childYStart = y;

      children.forEach((childId, idx) => {
        const childY = childYStart + (idx - (children.length - 1) / 2) * 120;
        layoutNode(childId, childX, childY, level + 1);
        maxY = Math.max(maxY, childY + nodeHeight);
      });
    }
  }

  // Layout roots
  roots.forEach((root, idx) => {
    layoutNode(root.id, currentX, currentY + idx * (maxY + verticalSpacing), 0);
  });

  // Layout any remaining connected components
  connected.forEach(block => {
    if (!positioned.has(block.id)) {
      layoutNode(block.id, currentX, maxY + verticalSpacing, 0);
    }
  });

  // Layout unconnected components in a separate area
  const unconnectedStartX = currentX;
  const unconnectedStartY = maxY + verticalSpacing * 2;
  unconnected.forEach((block, idx) => {
    result.push({
      ...block,
      x: unconnectedStartX + idx * horizontalSpacing,
      y: unconnectedStartY,
    });
  });

  return result;
}

// Random layout - places components with leaves on left and multi-connections on right
export function randomLayout(
  blocks: ComponentBlock[],
  connections: ConnectionData[]
): ComponentBlock[] {
  const viewportWidth = 2000;
  const viewportHeight = 2000;
  const minSpacing = 300; // Minimum distance between components
  const nodeWidth = 200; // Approximate node width
  const nodeHeight = 250; // Approximate node height
  const padding = 100; // Padding from edges

  // Calculate connection count for each component
  const connectionCounts = new Map<string, number>();
  blocks.forEach(block => {
    connectionCounts.set(block.id, 0);
  });

  // Count both incoming and outgoing connections
  connections.forEach(conn => {
    const fromCount = connectionCounts.get(conn.from) || 0;
    const toCount = connectionCounts.get(conn.to) || 0;
    connectionCounts.set(conn.from, fromCount + 1);
    connectionCounts.set(conn.to, toCount + 1);
  });

  // Sort blocks by connection count (leaves first, highly connected last)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const countA = connectionCounts.get(a.id) || 0;
    const countB = connectionCounts.get(b.id) || 0;
    return countA - countB;
  });

  const result: ComponentBlock[] = [];
  const placedPositions: Array<{ x: number; y: number }> = [];

  // Helper function to check if a position is too close to existing positions
  const isTooClose = (x: number, y: number): boolean => {
    for (const pos of placedPositions) {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < minSpacing) {
        return true;
      }
    }
    return false;
  };

  // Divide viewport into zones: left (leaves), center (highly connected), right (medium)
  const leftZoneWidth = viewportWidth * 0.3; // Left 30% for leaves
  const centerZoneStart = viewportWidth * 0.3; // Center starts at 30%
  const centerZoneEnd = viewportWidth * 0.7; // Center ends at 70% (40% width for highly connected)
  const rightZoneStart = viewportWidth * 0.7; // Right 30% for medium connections

  // Place each block based on its connection count
  sortedBlocks.forEach((block) => {
    const connectionCount = connectionCounts.get(block.id) || 0;
    
    // Determine which zone based on connection count
    let targetXMin: number;
    let targetXMax: number;
    
    if (connectionCount === 0 || connectionCount === 1) {
      // Leaves go to left zone
      targetXMin = padding;
      targetXMax = leftZoneWidth - nodeWidth - padding;
    } else if (connectionCount >= 4) {
      // Highly connected go to center zone
      targetXMin = centerZoneStart;
      targetXMax = centerZoneEnd - nodeWidth;
    } else {
      // Medium connections (2-3) go to right zone
      targetXMin = rightZoneStart;
      targetXMax = viewportWidth - nodeWidth - padding;
    }

    let attempts = 0;
    let placed = false;
    const maxAttempts = 150;

    while (!placed && attempts < maxAttempts) {
      // Generate random position within target zone
      const x = targetXMin + Math.random() * (targetXMax - targetXMin);
      const y = padding + Math.random() * (viewportHeight - padding * 2 - nodeHeight);

      // Check if position is valid (not too close to others)
      if (!isTooClose(x, y)) {
        result.push({
          ...block,
          x,
          y,
        });
        placedPositions.push({ x, y });
        placed = true;
      }
      attempts++;
    }

    // If we couldn't find a good position after max attempts, place it anyway
    // but try to find a less crowded area in the target zone
    if (!placed) {
      let bestX = targetXMin;
      let bestY = padding;
      let bestDistance = 0;

      // Try a grid-based approach as fallback within target zone
      const gridStep = minSpacing;
      for (let x = targetXMin; x <= targetXMax; x += gridStep) {
        for (let y = padding; y < viewportHeight - nodeHeight - padding; y += gridStep) {
          let minDist = Infinity;
          for (const pos of placedPositions) {
            const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            minDist = Math.min(minDist, dist);
          }
          if (minDist > bestDistance) {
            bestDistance = minDist;
            bestX = x;
            bestY = y;
          }
        }
      }

      result.push({
        ...block,
        x: bestX,
        y: bestY,
      });
      placedPositions.push({ x: bestX, y: bestY });
    }
  });

  return result;
}

// Center all blocks within viewport
function centerBlocksInViewport(blocks: ComponentBlock[]): ComponentBlock[] {
  if (blocks.length === 0) return blocks;
  
  const nodeWidth = 200; // Approximate node width
  const nodeHeight = 250; // Approximate node height
  
  // Calculate bounding box including node dimensions
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  blocks.forEach(block => {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    maxX = Math.max(maxX, block.x + nodeWidth);
    maxY = Math.max(maxY, block.y + nodeHeight);
  });
  
  // Calculate center of bounding box
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Target viewport center (center of a typical viewport)
  const viewportCenterX = 1000;
  const viewportCenterY = 500;
  
  // Calculate offset to center
  const offsetX = viewportCenterX - centerX;
  const offsetY = viewportCenterY - centerY;
  
  // Apply offset to all blocks
  return blocks.map(block => ({
    ...block,
    x: block.x + offsetX,
    y: block.y + offsetY,
  }));
}

// Main layout function
export function applyLayout(
  _layoutType: LayoutType,
  blocks: ComponentBlock[],
  connections: ConnectionData[]
): ComponentBlock[] {
  // Always use random layout
  const laidOutBlocks = randomLayout(blocks, connections);
  
  // Center all blocks in viewport
  return centerBlocksInViewport(laidOutBlocks);
}
