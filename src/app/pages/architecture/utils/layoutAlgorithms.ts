import type { ComponentBlock } from '../components/SystemArchitectureView';

export interface ConnectionData {
  id: string;
  from: string;
  to: string;
  type: string;
  [key: string]: any;
}

export type LayoutType = 'dagre-tree' | 'horizontal-flow';

// Simple horizontal flow layout (current implementation)
export function horizontalFlowLayout(
  blocks: ComponentBlock[],
  _connections: ConnectionData[]
): ComponentBlock[] {
  const columnWidth = 500;
  const startX = 200;
  const startY = 300;

  return blocks.map((block, idx) => ({
    ...block,
    x: startX + idx * columnWidth,
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
  const horizontalSpacing = 400;
  const verticalSpacing = 300;

  // Find root nodes (nodes with no incoming edges)
  const hasIncoming = new Set<string>();
  connections.forEach(conn => {
    hasIncoming.add(conn.to);
  });

  const roots = connected.filter(block => !hasIncoming.has(block.id));

  // Layout connected components using simple tree structure
  let currentX = 200;
  let currentY = 200;
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
        const childY = childYStart + (idx - (children.length - 1) / 2) * 200;
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


// Main layout function
export function applyLayout(
  layoutType: LayoutType,
  blocks: ComponentBlock[],
  connections: ConnectionData[]
): ComponentBlock[] {
  switch (layoutType) {
    case 'dagre-tree':
      return dagreTreeLayout(blocks, connections);
    case 'horizontal-flow':
    default:
      return horizontalFlowLayout(blocks, connections);
  }
}
