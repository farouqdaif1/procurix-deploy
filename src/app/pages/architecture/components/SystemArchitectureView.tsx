import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  Position,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Component } from '@/app/types';
import { motion } from 'motion/react';
import { Layers, CheckCircle, ChevronDown, Plus } from 'lucide-react';
import { ComponentNode } from './ComponentNode';
import { ArchitectureBuilderSidebar } from './ArchitectureBuilderSidebar';
import { CustomEdge } from './CustomEdge';
import { Button } from '@/app/shared/components/ui/button';
import { Input } from '@/app/shared/components/ui/input';
import { createComponentColorMap } from '../utils/componentColors';
import { createQuantityMap, getComponentQuantity, createPinoutMap, getComponentPinout } from '../utils/parseBackendResponse';
import { Settings2 } from 'lucide-react';

interface ComponentBlock extends Component {
  x: number;
  y: number;
  connections: string[];
  category?: string;
  quantity?: number;
  pinout?: Record<string, { name: string; type: string; description: string }>;
}

interface ConnectionData {
  id: string;
  from: string;
  to: string;
  type: 'power' | 'signal' | 'data' | 'analog' | 'differential' | 'clock' | 'ground' | 'switching' | 'power_and_feedback' | 'feedback' | 'control';
  label?: string;
  pins?: string;
  connection_type?: string;
  signal_name?: string;
  from_pin?: string;
  to_pin?: string;
  edgeType?: 'default' | 'straight' | 'step' | 'smoothstep'; // User-selected edge rendering type
}

interface SystemArchitectureViewProps {
  components: Component[];
  onArchitectureComplete: (blocks: ComponentBlock[], connections: ConnectionData[]) => void;
  backendResponse?: any; // Optional backend response with component_bom
}

const nodeTypes = {
  component: ComponentNode as any,
};

// Default connection type colors
const defaultConnectionTypeColors: Record<string, string> = {
    power: '#ef4444', // red
    switching: '#f59e0b', // amber/orange for switching signals
    power_and_feedback: '#8b5cf6', // purple for combined power/feedback
    signal: '#3b82f6', // blue
    data: '#8b5cf6', // purple
    analog: '#f59e0b', // amber
    differential: '#ec4899', // pink
    clock: '#10b981', // green
    ground: '#6b7280', // gray
    feedback: '#9333ea', // purple for feedback
    control: '#06b6d4', // cyan for control signals
  };

// Available colors for custom connection types (distinct colors that don't repeat)
const customConnectionTypeColorPalette = [
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#a855f7', // Violet
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#22d3ee', // Sky
  '#34d399', // Emerald
  '#fb7185', // Pink
  '#60a5fa', // Light Blue
  '#a78bfa', // Light Purple
  '#fbbf24', // Amber
];

const getEdgeColor = (type: string) => {
  const typeLower = (type || '').toLowerCase();
  
  // Check default colors first
  if (defaultConnectionTypeColors[typeLower]) {
    return defaultConnectionTypeColors[typeLower];
  }
  
  // Check custom colors from localStorage
  try {
    const saved = localStorage.getItem('customConnectionTypeColors');
    if (saved) {
      const customColors = JSON.parse(saved);
      if (customColors[typeLower]) {
        return customColors[typeLower];
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Default gray for unknown types
  return '#6b7280';
};

// Get connection type color - uses stored colors for custom types
const getConnectionTypeColor = (connectionType: string, customConnectionTypeColors?: Record<string, string>): string => {
  const type = (connectionType || '').toLowerCase();
  
  // Check default colors first
  if (defaultConnectionTypeColors[type]) {
    return defaultConnectionTypeColors[type];
  }
  
  // Check custom colors if provided
  if (customConnectionTypeColors && customConnectionTypeColors[type]) {
    return customConnectionTypeColors[type];
  }
  
  // Default gray for unknown types
  return '#6b7280';
};

// Get edge style based on connection type (color, line style, width)
const getEdgeStyle = (type: string) => {
  const baseStyle: React.CSSProperties = {
    stroke: getEdgeColor(type),
    zIndex: 1,
  };

  // Apply different line styles based on connection type
  switch (type) {
    case 'power':
      return {
        ...baseStyle,
        strokeWidth: 4,
        strokeDasharray: undefined, // solid line
      };
    case 'switching':
      return {
        ...baseStyle,
        strokeWidth: 5,
        strokeDasharray: undefined, // solid line
      };
    case 'power_and_feedback':
      return {
        ...baseStyle,
        strokeWidth: 4,
        strokeDasharray: '10,5', // dashed line
      };
    case 'signal':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: undefined, // solid line
      };
    case 'data':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '5,5', // dotted line
      };
    case 'analog':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '8,4', // dashed line
      };
    case 'differential':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '3,3', // dotted line
      };
    case 'clock':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '12,4,4,4', // dash-dot pattern
      };
    case 'ground':
      return {
        ...baseStyle,
        strokeWidth: 4,
        strokeDasharray: '15,5', // long dashes
      };
    case 'feedback':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '6,6', // medium dashes
      };
    case 'control':
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: '4,4', // short dashes
      };
    default:
      return {
        ...baseStyle,
        strokeWidth: 3,
        strokeDasharray: undefined, // solid line
      };
  }
};

// Helper function to extract pin number from pin name and create handle ID
// Examples: "VIN (Pin 1)" -> "pin-1", "Pin 7" -> "pin-7", "OUTPUT" -> null
const extractHandleId = (pinName?: string): string | undefined => {
  if (!pinName) return undefined;
  
  // Try to extract pin number from patterns like "Pin 1", "Pin 7", "(Pin 1)", etc.
  const pinMatch = pinName.match(/[Pp]in\s*(\d+)/i);
  if (pinMatch) {
    return `pin-${pinMatch[1]}`;
  }
  
  // If it's just a number, use it directly
  const numberMatch = pinName.match(/^(\d+)$/);
  if (numberMatch) {
    return `pin-${numberMatch[1]}`;
  }
  
  // For named pins like "OUTPUT", "INPUT", etc., try to find matching pin in pinout
  // This would require access to component data, so return undefined for now
  return undefined;
};

export function SystemArchitectureView({ components, onArchitectureComplete, backendResponse }: SystemArchitectureViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [blocks, setBlocks] = useState<ComponentBlock[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [openConnectionTypeDropdown, setOpenConnectionTypeDropdown] = useState(false);
  const [showAddConnectionType, setShowAddConnectionType] = useState(false);
  const [newConnectionType, setNewConnectionType] = useState('');
  
  // Load custom connection types from localStorage
  const [customConnectionTypes, setCustomConnectionTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('customConnectionTypes');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Load custom connection type colors from localStorage
  const [customConnectionTypeColors, setCustomConnectionTypeColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('customConnectionTypeColors');
    return saved ? JSON.parse(saved) : {};
  });

  // Create color map for all components based on partNumber (component_id)
  const componentColorMap = useMemo(() => {
    const partNumbers = blocks.map(b => b.partNumber || b.id).filter(Boolean) as string[];
    return createComponentColorMap(partNumbers);
  }, [blocks]);

  // Convert blocks and connections to React Flow format
  const initialNodes = useMemo(() => {
    return blocks.map((block) => {
      const componentId = block.partNumber || block.id;
      const componentColor = componentColorMap.get(componentId);
      
      return {
        id: block.id,
        type: 'component',
        position: { x: block.x, y: block.y },
        data: {
          ...block,
          category: block.category,
          componentColor,
          pinout: block.pinout,
        },
      } as Node;
    });
  }, [blocks, componentColorMap]);

  const initialEdges = useMemo(() => {
    // Get node positions and dimensions for intersection detection
    const nodeData = new Map<string, { x: number; y: number; width: number; height: number }>();
    blocks.forEach(block => {
      // Estimate node dimensions (ComponentNode is typically around 280x200, but can vary)
      // We'll use a conservative estimate and add padding
      const estimatedWidth = 300;
      const estimatedHeight = 250;
      nodeData.set(block.id, { 
        x: block.x, 
        y: block.y,
        width: estimatedWidth,
        height: estimatedHeight
      });
    });

    // Track connections between same source/target/handles to create unique IDs and calculate offsets
    const connectionCounts = new Map<string, number>();
    const pathGroups = new Map<string, number>(); // Track how many edges share the same path
    
    // Track all edge paths to detect and prevent intersections
    const edgePaths = new Map<string, {
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      level: number;
    }>();
    
    // Helper function to check if two line segments intersect
    const doLinesIntersect = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number },
      p4: { x: number; y: number }
    ): boolean => {
      const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
      if (denom === 0) return false; // Parallel lines
      
      const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
      const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
      
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    
    // Helper function to find a non-intersecting level for a new edge
    const findNonIntersectingLevel = (
      sourceX: number,
      sourceY: number,
      targetX: number,
      targetY: number
    ): number => {
      let level = 0;
      const maxLevels = 20; // Maximum number of levels to try
      
      for (let i = 0; i < maxLevels; i++) {
        const offset = i === 0 ? 0 : (i % 2 === 1 ? Math.ceil(i / 2) : -Math.ceil(i / 2)) * 30;
        const testY1 = sourceY + offset;
        const testY2 = targetY + offset;
        
        let intersects = false;
        for (const [_, path] of edgePaths) {
          // Check if this path would intersect with existing paths at this level
          if (doLinesIntersect(
            { x: sourceX, y: testY1 },
            { x: targetX, y: testY2 },
            { x: path.sourceX, y: path.sourceY + path.level * 30 },
            { x: path.targetX, y: path.targetY + path.level * 30 }
          )) {
            intersects = true;
            break;
          }
        }
        
        if (!intersects) {
          level = i;
          break;
        }
      }
      
      return level;
    };


    return connections.map((conn) => {
      // Extract pin numbers from pin names
      const sourcePinId = extractHandleId(conn.from_pin);
      const targetPinId = extractHandleId(conn.to_pin);
      
      // Construct full handle IDs with component IDs
      // Only use pins - no default handles allowed
      let sourceHandle: string | undefined;
      let targetHandle: string | undefined;
      
      if (sourcePinId) {
        // Has pin number, use pin handle
        sourceHandle = `${conn.from}-${sourcePinId}`;
      }
      // No default handles - connections must use specific pins
      
      if (targetPinId) {
        // Has pin number, use pin handle
        targetHandle = `${conn.to}-${targetPinId}`;
      }
      // No default handles - connections must use specific pins
      
      // Create a unique key for this connection path
      const connectionKey = `${conn.from}-${conn.to}-${sourceHandle || 'default'}-${targetHandle || 'default'}`;
      const connectionIndex = connectionCounts.get(connectionKey) || 0;
      connectionCounts.set(connectionKey, connectionIndex + 1);
      
      // Create a path group key (same source/target, ignoring handles) for waypoint calculation
      const pathKey = `${conn.from}-${conn.to}`;
      const pathIndex = pathGroups.get(pathKey) || 0;
      pathGroups.set(pathKey, pathIndex + 1);
      
      // Get node positions to calculate edge path for intersection detection
      const sourceNodeInfo = nodeData.get(conn.from);
      const targetNodeInfo = nodeData.get(conn.to);
      
      // Estimate edge endpoints
      let sourceX = 0;
      let sourceY = 0;
      let targetX = 0;
      let targetY = 0;
      
      if (sourceNodeInfo && targetNodeInfo) {
        // Estimate handle positions
        sourceX = sourceHandle?.includes('left') || !sourceHandle 
          ? sourceNodeInfo.x 
          : sourceNodeInfo.x + sourceNodeInfo.width;
        sourceY = sourceNodeInfo.y + sourceNodeInfo.height;
        
        targetX = targetHandle?.includes('right') || !targetHandle
          ? targetNodeInfo.x + targetNodeInfo.width
          : targetNodeInfo.x;
        targetY = targetNodeInfo.y + targetNodeInfo.height;
      }
      
      // Find a non-intersecting level for this edge
      const level = findNonIntersectingLevel(sourceX, sourceY, targetX, targetY);
      
      // Store this edge path for future intersection checks
      const edgeKey = `${conn.from}-${conn.to}-${sourceHandle || 'default'}-${targetHandle || 'default'}-${pathIndex}`;
      edgePaths.set(edgeKey, {
        sourceX,
        sourceY,
        targetX,
        targetY,
        level
      });
      
      // Calculate offset based on level (30px separation per level to prevent intersections)
      const offset = level === 0 
        ? 0 
        : level % 2 === 1
          ? Math.ceil(level / 2) * 30
          : -Math.ceil(level / 2) * 30;
      
      // Create unique edge ID that includes handle information
      const edgeId = sourceHandle || targetHandle 
        ? `${conn.id}-${sourceHandle || 'src'}-${targetHandle || 'tgt'}`
        : connectionIndex > 0 
          ? `${conn.id}-${connectionIndex}`
          : conn.id;
      
      // Create detailed label with connection_type, signal_name, and voltage/pins
      const labelParts = [];
      
      // Add connection type
      if (conn.connection_type) {
        labelParts.push(`[${conn.connection_type}]`);
      } else if (conn.type) {
        labelParts.push(`[${conn.type}]`);
      }
      
      // Add signal name
      if (conn.signal_name) {
        labelParts.push(conn.signal_name);
      } else if (conn.label) {
        labelParts.push(conn.label);
      }
      
      // Add pins/voltage info
      if (conn.pins) {
        labelParts.push(`(${conn.pins})`);
      }
      
      // Use edgeType from connection data, default to 'straight' if not set
      const edgeType = (conn.edgeType || 'straight') as 'default' | 'straight' | 'step' | 'smoothstep';

      // For smoothstep edges, determine the same direction for both endpoints
      let sourcePosition: Position | undefined;
      let targetPosition: Position | undefined;
      
      if (edgeType === 'smoothstep' && sourceNodeInfo && targetNodeInfo) {
        // Calculate the primary direction of the connection
        const deltaX = targetX - sourceX;
        const deltaY = targetY - sourceY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Determine if connection is primarily horizontal or vertical
        if (absDeltaX > absDeltaY) {
          // Horizontal connection - both endpoints use the same horizontal side
          if (deltaX > 0) {
            // Left to right: both exit/enter from right
            sourcePosition = Position.Right;
            targetPosition = Position.Right;
          } else {
            // Right to left: both exit/enter from left
            sourcePosition = Position.Left;
            targetPosition = Position.Left;
          }
        } else {
          // Vertical connection - both endpoints use the same vertical side
          if (deltaY > 0) {
            // Top to bottom: both exit/enter from bottom
            sourcePosition = Position.Bottom;
            targetPosition = Position.Bottom;
          } else {
            // Bottom to top: both exit/enter from top
            sourcePosition = Position.Top;
            targetPosition = Position.Top;
          }
        }
      }

      const labelText = labelParts.join(' ') || conn.type;
      const isHovered = hoveredEdgeId === edgeId;
      const isSelected = selectedEdgeId === edgeId;
      
      return {
        id: edgeId,
        source: conn.from,
        target: conn.to,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
        type: edgeType, // Use edgeType from connection data
        sourcePosition: sourcePosition,
        targetPosition: targetPosition,
        animated: conn.type === 'switching' || conn.type === 'power',
        style: getEdgeStyle(conn.type),
        zIndex: 1,
        label: (isHovered || isSelected) ? labelText : undefined, // Show label on hover or when selected
        labelStyle: {
          fill: getEdgeColor(conn.type),
          fontWeight: 600,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: 'white',
          fillOpacity: 0.95,
          padding: '2px 6px',
          borderRadius: '4px',
        },
        data: {
          connectionId: conn.id, // Store connection ID for deletion
        },
        // Use pathOptions with offset to prevent overlapping edges
        // For smoothstep edges, add bend property to increase height/curvature
        pathOptions: {
          offset: offset,
          ...(edgeType === 'smoothstep' && {
            bend: 50, // Increase this value for taller/more curved paths (default is usually 20-30)
          }),
        },
        // No markerEnd - connections are non-directional
      } as Edge;
    });
  }, [connections, blocks, hoveredEdgeId, selectedEdgeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when blocks/connections change
  useEffect(() => {
    const updatedNodes = blocks.map((block) => {
      const componentId = block.partNumber || block.id;
      const componentColor = componentColorMap.get(componentId);
      
      // Ensure pinout is always an object and create a new reference to trigger re-render
      const pinout = block.pinout ? { ...block.pinout } : {};
      
      const nodeData = {
        ...block,
        category: block.category,
        componentColor,
        pinout: pinout, // Use the new pinout object reference
      };
      
      // Debug: Log node data to verify pinout is included
      if (Object.keys(pinout).length > 0) {
        console.log('Creating node with pinout:', {
          id: block.id,
          pinout: pinout,
          pinoutKeys: Object.keys(pinout),
          pinoutEntries: Object.entries(pinout),
        });
      }
      
      return {
        id: block.id,
        type: 'component',
        position: { x: block.x, y: block.y },
        data: nodeData,
      } as Node;
    });
    
    console.log('Updating nodes, total nodes:', updatedNodes.length);
    setNodes(updatedNodes);
  }, [blocks, componentColorMap, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // FIX: If we started from a specific handle, force it to be used
      const correctSourceHandle = (window as any).__lastConnectStartHandleId && params.sourceHandle !== (window as any).__lastConnectStartHandleId
        ? (window as any).__lastConnectStartHandleId
        : params.sourceHandle;
      
      // Debug: Log which handles are being used
      console.log('🔴 Connection params:', {
        source: params.source,
        target: params.target,
        originalSourceHandle: params.sourceHandle,
        correctedSourceHandle: correctSourceHandle,
        targetHandle: params.targetHandle,
        expectedHandle: (window as any).__lastConnectStartHandleId
      });
      
      if (correctSourceHandle !== params.sourceHandle) {
        console.warn('⚠️ Fixed handle mismatch! Changed from', params.sourceHandle, 'to', correctSourceHandle);
      }
      
      // Create unique edge ID using sourceHandle and targetHandle to prevent overlapping
      const edgeId = correctSourceHandle || params.targetHandle
        ? `edge-${params.source}-${params.target}-${correctSourceHandle || 'src'}-${params.targetHandle || 'tgt'}-${Date.now()}`
        : `edge-${params.source}-${params.target}-${Date.now()}`;
      
      const newEdge: Edge = {
        ...params,
        sourceHandle: correctSourceHandle,
        id: edgeId,
        type: 'smoothstep',
        animated: true,
        style: getEdgeStyle('signal'), // Default to signal type styling for new connections
      };
      setEdges((eds) => {
        // Check if edge already exists to prevent duplicates
        const exists = eds.some(e => 
          e.source === params.source && 
          e.target === params.target &&
          e.sourceHandle === params.sourceHandle &&
          e.targetHandle === params.targetHandle
        );
        if (exists) return eds;
        return addEdge(newEdge, eds);
      });
      
      // Extract pin information from handle IDs
      // Handle IDs are now: ${componentId}-pin-${number}
      const extractPinFromHandle = (handleId?: string | null): string | undefined => {
        if (!handleId) return undefined;
        // Remove component ID prefix (everything before the pin number)
        const parts = handleId.split('-');
        if (parts.length >= 2) {
          // Find where the pin part starts (after component ID)
          const pinPart = parts.slice(1).join('-'); // Get everything after component ID
          // Remove -target suffix if present
          const cleanPart = pinPart.replace(/-target$/, '');
          if (cleanPart.startsWith('pin-')) {
            return `Pin ${cleanPart.replace('pin-', '')}`;
          }
        }
        return handleId;
      };
      
      // Also update connections state
      const newConnection: ConnectionData = {
        id: `conn-${params.source}-${params.target}-${Date.now()}`,
        from: params.source!,
        to: params.target!,
        type: 'signal',
        from_pin: extractPinFromHandle(params.sourceHandle ?? undefined),
        to_pin: extractPinFromHandle(params.targetHandle ?? undefined),
        edgeType: 'straight', // Default to straight for new connections
      };
      setConnections((prev) => [...prev, newConnection]);
    },
    [setEdges]
  );

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      console.log('🔵 Connection STARTED from:', { 
        nodeId: params.nodeId, 
        handleId: params.handleId, 
        handleType: params.handleType 
      });
      // Store the starting handle ID to verify it's used correctly
      if (params.handleId) {
        (window as any).__lastConnectStartHandleId = params.handleId;
      }
    },
    []
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const conn = connection as Connection;
      console.log('🟢 isValidConnection called:', {
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        expectedHandle: (window as any).__lastConnectStartHandleId
      });
      
      // Verify the sourceHandle matches what we started with
      if ((window as any).__lastConnectStartHandleId && conn.sourceHandle) {
        const matches = conn.sourceHandle === (window as any).__lastConnectStartHandleId;
        if (!matches) {
          console.error('❌ Handle mismatch! Started with:', (window as any).__lastConnectStartHandleId, 'but got:', conn.sourceHandle);
        }
      }
      
      return true; // Allow all connections for now
    },
    []
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setOpenConnectionTypeDropdown(false);
    },
    []
  );

  const onEdgeMouseEnter = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setHoveredEdgeId(edge.id);
    },
    []
  );

  const onEdgeMouseLeave = useCallback(
    () => {
      setHoveredEdgeId(null);
    },
    []
  );

  const handleEdgeTypeChange = useCallback(
    (edgeId: string, newEdgeType: 'default' | 'straight' | 'step' | 'smoothstep') => {
      // Find the connection that corresponds to this edge
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) return;

      // Find the connection in our connections array
      const connection = connections.find(conn => {
        // Match by source/target and handles
        const sourcePinId = extractHandleId(conn.from_pin);
        const targetPinId = extractHandleId(conn.to_pin);
        const sourceHandle = sourcePinId ? `${conn.from}-${sourcePinId}` : undefined;
        const targetHandle = targetPinId ? `${conn.to}-${targetPinId}` : undefined;
        
        return conn.from === edge.source && 
               conn.to === edge.target &&
               (sourceHandle || 'default') === (edge.sourceHandle || 'default') &&
               (targetHandle || 'default') === (edge.targetHandle || 'default');
      });

      if (connection) {
        // Update the connection's edgeType
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === connection.id
              ? { ...conn, edgeType: newEdgeType }
              : conn
          )
        );
      }
    },
    [edges, connections]
  );

  const handleConnectionTypeChange = useCallback(
    (edgeId: string, newConnectionType: ConnectionData['type']) => {
      // Find the connection that corresponds to this edge
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) return;

      // Find the connection in our connections array
      const connection = connections.find(conn => {
        // Match by source/target and handles
        const sourcePinId = extractHandleId(conn.from_pin);
        const targetPinId = extractHandleId(conn.to_pin);
        const sourceHandle = sourcePinId ? `${conn.from}-${sourcePinId}` : undefined;
        const targetHandle = targetPinId ? `${conn.to}-${targetPinId}` : undefined;
        
        return conn.from === edge.source && 
               conn.to === edge.target &&
               (sourceHandle || 'default') === (edge.sourceHandle || 'default') &&
               (targetHandle || 'default') === (edge.targetHandle || 'default');
      });

      if (connection) {
        // Update the connection's type
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === connection.id
              ? { ...conn, type: newConnectionType }
              : conn
          )
        );
      }
    },
    [edges, connections]
  );

  const handleAddConnectionType = useCallback(() => {
    // Compute connectionTypes inside the callback to avoid initialization order issues
    const defaultConnectionTypes: ConnectionData['type'][] = [
      'power',
      'signal',
      'data',
      'analog',
      'differential',
      'clock',
      'ground',
      'switching',
      'power_and_feedback',
      'feedback',
      'control',
    ];
    const allConnectionTypes = [...defaultConnectionTypes, ...customConnectionTypes] as ConnectionData['type'][];
    
    if (newConnectionType.trim() && !allConnectionTypes.includes(newConnectionType.trim().toLowerCase() as ConnectionData['type'])) {
      const newType = newConnectionType.trim().toLowerCase();
      const updated = [...customConnectionTypes, newType];
      setCustomConnectionTypes(updated);
      localStorage.setItem('customConnectionTypes', JSON.stringify(updated));
      
      // Assign a unique color to the new connection type
      const usedColors = new Set([
        ...Object.values(defaultConnectionTypeColors),
        ...Object.values(customConnectionTypeColors)
      ]);
      
      // Find first available color from palette
      let assignedColor = customConnectionTypeColorPalette.find(color => !usedColors.has(color));
      
      // If all colors are used, cycle through palette
      if (!assignedColor) {
        const colorIndex = customConnectionTypes.length % customConnectionTypeColorPalette.length;
        assignedColor = customConnectionTypeColorPalette[colorIndex];
      }
      
      const updatedColors = { ...customConnectionTypeColors, [newType]: assignedColor };
      setCustomConnectionTypeColors(updatedColors);
      localStorage.setItem('customConnectionTypeColors', JSON.stringify(updatedColors));
      
      setNewConnectionType('');
      setShowAddConnectionType(false);
    }
  }, [newConnectionType, customConnectionTypes, customConnectionTypeColors]);

  const handleRemoveConnectionType = useCallback((typeToRemove: string) => {
    const updated = customConnectionTypes.filter(t => t !== typeToRemove);
    setCustomConnectionTypes(updated);
    localStorage.setItem('customConnectionTypes', JSON.stringify(updated));
    
    // Remove color assignment
    const updatedColors = { ...customConnectionTypeColors };
    delete updatedColors[typeToRemove];
    setCustomConnectionTypeColors(updatedColors);
    localStorage.setItem('customConnectionTypeColors', JSON.stringify(updatedColors));
  }, [customConnectionTypes, customConnectionTypeColors]);

  // Connection types list (default + custom)
  const defaultConnectionTypes: ConnectionData['type'][] = [
    'power',
    'signal',
    'data',
    'analog',
    'differential',
    'clock',
    'ground',
    'switching',
    'power_and_feedback',
    'feedback',
    'control',
  ];
  const connectionTypes: ConnectionData['type'][] = [...defaultConnectionTypes, ...customConnectionTypes] as ConnectionData['type'][];

  // Initial AI analysis and auto-layout
  useEffect(() => {
    const stages = [
      'Analyzing component types...',
      'Detecting power domains...',
      'Mapping signal flows...',
      'Computing optimal layout...',
      'Generating block diagram...'
    ];

    let currentStage = 0;
    let currentProgress = 0;

    const stageInterval = setInterval(() => {
      currentStage = Math.min(currentStage + 1, stages.length - 1);
      setAnalysisStage(currentStage);
      
      if (currentStage >= stages.length - 1) {
        clearInterval(stageInterval);
      }
    }, 400);

    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 2, 100);
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          generateInitialLayout();
          setIsAnalyzing(false);
        }, 300);
      }
    }, 32);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [components]);

  const generateInitialLayout = () => {
    // Use all components from the subsystem
    const selectedComponents = components;

    // Layout components in a linear horizontal flow pattern
    // Power flow: Buck Controller → LDO
    const componentOrder = [
      'MAX8553E',           // Buck Controller
      'LD39200DPUR'         // LDO
    ];

    const sortedComponents = selectedComponents.sort((a, b) => {
      const indexA = componentOrder.indexOf(a.id);
      const indexB = componentOrder.indexOf(b.id);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const columnWidth = 500; // Horizontal spacing between components
    const startX = 200;
    const startY = 300; // Same Y for all components (horizontal line)

    let allBlocks: ComponentBlock[] = [];
    let autoConnections: ConnectionData[] = [];

    // Layout: Linear horizontal layout - all components on the same row
    sortedComponents.forEach((comp: Component, idx: number) => {
      let x, y;
      const category = 
        comp.id === 'MAX8553E' ? 'Buck Conversion' :
        comp.id === 'LD39200DPUR' ? 'Linear Regulation' :
        'Other';
      
      // Place all components side by side horizontally on the same row
      x = startX + idx * columnWidth;
      y = startY;
      
      // Get quantity and pinout from backend response or count instances
      const partNumber = comp.partNumber || comp.id;
      let quantity: number | undefined;
      let pinout: Record<string, { name: string; type: string; description: string }> | undefined;
      
      if (backendResponse) {
        const quantityMap = createQuantityMap(backendResponse);
        const pinoutMap = createPinoutMap(backendResponse);
        const backendQuantity = getComponentQuantity(partNumber, quantityMap);
        pinout = getComponentPinout(partNumber, pinoutMap) || comp.pinout; // Fallback to component's pinout if not in backend
        if (backendQuantity && backendQuantity > 1) {
          quantity = backendQuantity;
        }
      } else {
        // Fallback: use component's existing pinout and count instances of same part
        pinout = comp.pinout;
        const samePartComponents = sortedComponents.filter(c => 
          (c.partNumber || c.id) === partNumber
        );
        if (samePartComponents.length > 1) {
          quantity = samePartComponents.length;
        }
      }
      
      allBlocks.push({
        ...comp,
        x,
        y,
        connections: [],
        category,
        quantity,
        pinout,
      });
    });

    setBlocks(allBlocks);

    // Generate ALL connections based on the JSON topology
    const inputFilter = allBlocks.find(b => b.id === 'SPM5030VT-R68M-D-1');
    const buckController = allBlocks.find(b => b.id === 'MAX8553E');
    const buckInductor = allBlocks.find(b => b.id === 'SRP4020TA-1R5M');
    const interStageFilter = allBlocks.find(b => b.id === 'SPM5030VT-R68M-D-2');
    const ldo = allBlocks.find(b => b.id === 'LD39200DPUR');

    // Power flow connections with connection_type and signal_name
    // 1. Input Filter → Buck Controller (VIN_FILTERED)
    if (inputFilter && buckController) {
      autoConnections.push({
        id: 'conn-002',
        from: inputFilter.id,
        to: buckController.id,
        type: 'power',
        connection_type: 'power',
        signal_name: 'VIN_FILTERED',
        label: 'VIN_FILTERED',
        pins: '3.0-5.5V'
      });
    }

    // 2. Buck Controller → Buck Inductor (Switching Node LX)
    if (buckController && buckInductor) {
      autoConnections.push({
        id: 'conn-003',
        from: buckController.id,
        to: buckInductor.id,
        type: 'switching',
        connection_type: 'switching',
        signal_name: 'SW_NODE',
        label: 'SW_NODE',
        pins: 'LX (Pin 7)'
      });
    }

    // 3. Buck Inductor → Buck Controller (Feedback FB)
    if (buckInductor && buckController) {
      autoConnections.push({
        id: 'conn-004',
        from: buckInductor.id,
        to: buckController.id,
        type: 'power_and_feedback',
        connection_type: 'power_and_feedback',
        signal_name: 'VOUT_BUCK',
        label: 'VOUT_BUCK',
        pins: 'FB (Pin 5)'
      });
    }

    // 4. Buck Inductor → Inter-Stage Filter (VOUT_BUCK)
    if (buckInductor && interStageFilter) {
      autoConnections.push({
        id: 'conn-005',
        from: buckInductor.id,
        to: interStageFilter.id,
        type: 'power',
        connection_type: 'power',
        signal_name: 'VOUT_BUCK',
        label: 'VOUT_BUCK',
        pins: '3.3-3.6V'
      });
    }

    // 5. Inter-Stage Filter → LDO (VOUT_FILTERED)
    if (interStageFilter && ldo) {
      autoConnections.push({
        id: 'conn-006',
        from: interStageFilter.id,
        to: ldo.id,
        type: 'power',
        connection_type: 'power',
        signal_name: 'VOUT_FILTERED',
        label: 'VOUT_FILTERED',
        pins: '3.3-3.6V'
      });
    }


    setConnections(autoConnections);
  };

  const handleComplete = () => {
    // Convert React Flow nodes back to blocks format
    const updatedBlocks = nodes.map((node) => ({
      ...blocks.find(b => b.id === node.id)!,
      x: node.position.x,
      y: node.position.y,
    }));
    
    onArchitectureComplete(updatedBlocks, connections);
  };

  // Builder mode handlers
  const handleAddComponent = useCallback((component: Omit<ComponentBlock, 'x' | 'y' | 'connections'>) => {
    // Find a good position for the new component (center of viewport or next to existing)
    const newX = blocks.length > 0 
      ? Math.max(...blocks.map(b => b.x)) + 400 
      : 400;
    const newY = blocks.length > 0 
      ? blocks[0].y 
      : 300;
    
    const newBlock: ComponentBlock = {
      ...component,
      x: newX,
      y: newY,
      connections: [],
      position: { x: newX, y: newY },
      // Explicitly preserve pinout and specs - ensure they're always objects
      pinout: component.pinout || {},
      specs: component.specs || {},
    };
    
    console.log('Adding component block:', {
      id: newBlock.id,
      pinout: newBlock.pinout,
      pinoutKeys: Object.keys(newBlock.pinout || {}),
    });
    
    setBlocks((prev) => [...prev, newBlock]);
  }, [blocks]);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<ComponentBlock>) => {
    console.log('handleUpdateComponent called:', {
      id,
      updates,
      updatesPinout: updates.pinout,
      updatesPinoutKeys: updates.pinout ? Object.keys(updates.pinout) : [],
      updatesPinoutEntries: updates.pinout ? Object.entries(updates.pinout) : [],
    });
    
    setBlocks((prev) => {
      const updated = prev.map((block) => {
        if (block.id === id) {
          // Always use the pinout from updates if provided, even if empty
          // This ensures that when user clears all pins, it's saved as empty
          // Create a new object reference to ensure React detects the change
          const updatedPinout = updates.pinout !== undefined 
            ? (updates.pinout ? { ...updates.pinout } : {})
            : (block.pinout ? { ...block.pinout } : {});
          
          const updatedBlock: ComponentBlock = { 
            ...block, 
            ...updates,
            // Explicitly set pinout and specs to ensure they're preserved
            pinout: updatedPinout,
            specs: updates.specs !== undefined ? (updates.specs ? { ...updates.specs } : {}) : (block.specs ? { ...block.specs } : {}),
            // Preserve position and connections
            x: block.x,
            y: block.y,
            connections: block.connections,
            position: block.position || { x: block.x, y: block.y },
          };
          
          console.log('Updated block:', {
            id: updatedBlock.id,
            pinout: updatedBlock.pinout,
            pinoutKeys: Object.keys(updatedBlock.pinout || {}),
            pinoutEntries: Object.entries(updatedBlock.pinout || {}),
          });
          
          return updatedBlock;
        }
        return block;
      });
      
      console.log('Blocks after update:', updated.map(b => ({
        id: b.id,
        hasPinout: !!b.pinout,
        pinoutKeys: b.pinout ? Object.keys(b.pinout) : [],
      })));
      
      return updated;
    });
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setConnections((prev) => prev.filter((conn) => conn.from !== id && conn.to !== id));
  }, []);

  const handleAddConnection = useCallback((connection: Omit<ConnectionData, 'id'>) => {
    const newConnection: ConnectionData = {
      ...connection,
      id: `conn-${connection.from}-${connection.to}-${Date.now()}`,
    };
    setConnections((prev) => [...prev, newConnection]);
  }, []);

  const handleUpdateConnection = useCallback((id: string, updates: Partial<ConnectionData>) => {
    setConnections((prev) => 
      prev.map((conn) => 
        conn.id === id 
          ? { ...conn, ...updates }
          : conn
      )
    );
  }, []);

  const handleDeleteConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((conn) => conn.id !== id));
    setSelectedEdgeId(null); // Clear selection after deletion
  }, []);

  // Handler to delete connection from edge
  const handleDeleteEdge = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge && edge.data?.connectionId && typeof edge.data.connectionId === 'string') {
      handleDeleteConnection(edge.data.connectionId);
    } else {
      // Fallback: try to find connection by matching edge properties
      const edgeToDelete = edges.find(e => e.id === edgeId);
      if (edgeToDelete) {
        const connection = connections.find(conn => {
          const sourcePinId = extractHandleId(conn.from_pin);
          const targetPinId = extractHandleId(conn.to_pin);
          const sourceHandle = sourcePinId ? `${conn.from}-${sourcePinId}` : undefined;
          const targetHandle = targetPinId ? `${conn.to}-${targetPinId}` : undefined;
          
          return conn.from === edgeToDelete.source && 
                 conn.to === edgeToDelete.target &&
                 (sourceHandle || 'default') === (edgeToDelete.sourceHandle || 'default') &&
                 (targetHandle || 'default') === (edgeToDelete.targetHandle || 'default');
        });
        if (connection) {
          handleDeleteConnection(connection.id);
        }
      }
    }
  }, [edges, connections, handleDeleteConnection]);

  // Create edgeTypes with props
  const edgeTypes = useMemo(() => ({
    default: (props: any) => <CustomEdge {...props} selectedEdgeId={selectedEdgeId} onDelete={handleDeleteEdge} />,
    straight: (props: any) => <CustomEdge {...props} selectedEdgeId={selectedEdgeId} onDelete={handleDeleteEdge} />,
    step: (props: any) => <CustomEdge {...props} selectedEdgeId={selectedEdgeId} onDelete={handleDeleteEdge} />,
    smoothstep: (props: any) => <CustomEdge {...props} selectedEdgeId={selectedEdgeId} onDelete={handleDeleteEdge} />,
  }), [selectedEdgeId, handleDeleteEdge]);

  const stages = [
    'Analyzing component types...',
    'Detecting power domains...',
    'Mapping signal flows...',
    'Computing optimal layout...',
    'Generating block diagram...'
  ];

  if (isAnalyzing) {
    return (
      <div className="h-full overflow-y-auto p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="w-full max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 mb-6 shadow-2xl">
              <Layers className="h-12 w-12 text-white animate-pulse" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">
              Define System Topology
            </h2>
            <p className="text-purple-200 text-lg">
              Design component interconnections before generating requirements • {components.length} identified components
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-200 text-sm font-medium">
                  {stages[analysisStage]}
                </span>
                <span className="text-purple-200 text-sm font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
                  </div>
                </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex">
      <style>{`
        .react-flow__edges {
          z-index: 10 !important;
        }
        .react-flow__edge {
          z-index: 10 !important;
        }
        .react-flow__edge-path {
          stroke-width: 4px;
          pointer-events: stroke;
        }
        .react-flow__node {
          z-index: 1;
        }
        .react-flow__edge-label {
          z-index: 11 !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onEdgeClick={onEdgeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          setOpenConnectionTypeDropdown(false);
          setShowAddConnectionType(false);
        }}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const data = node.data as unknown as ComponentBlock;
            if (data.type.includes('regulator') || data.type.includes('ldo')) return '#a855f7';
            if (data.type.includes('battery') || data.type.includes('charger')) return '#22c55e';
            if (data.type.includes('converter')) return '#f59e0b';
            if (data.type.includes('protection')) return '#ef4444';
            if (data.type.includes('communication')) return '#3b82f6';
            return '#6b7280';
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
        <Panel position="top-right" className="m-4 flex gap-2">
          <Button 
            onClick={() => setIsBuilderMode(!isBuilderMode)} 
            variant={isBuilderMode ? "default" : "outline"}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {isBuilderMode ? 'Exit Builder' : 'Builder Mode'}
          </Button>
          <Button onClick={handleComplete} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Complete Architecture
          </Button>
        </Panel>
        
        {/* Edge Type Selection Panel */}
        {selectedEdgeId && (() => {
          const selectedEdge = edges.find(e => e.id === selectedEdgeId);
          if (!selectedEdge) return null;
          
          // Find the connection for this edge
          const connection = connections.find(conn => {
            const sourcePinId = extractHandleId(conn.from_pin);
            const targetPinId = extractHandleId(conn.to_pin);
            const sourceHandle = sourcePinId ? `${conn.from}-${sourcePinId}` : undefined;
            const targetHandle = targetPinId ? `${conn.to}-${targetPinId}` : undefined;
            
            return conn.from === selectedEdge.source && 
                   conn.to === selectedEdge.target &&
                   (sourceHandle || 'default') === (selectedEdge.sourceHandle || 'default') &&
                   (targetHandle || 'default') === (selectedEdge.targetHandle || 'default');
          });
          
          const currentEdgeType = connection?.edgeType || 'straight';
          const currentConnectionType = connection?.type || 'signal';
          
          return (
            <Panel position="top-left" className="m-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 min-w-[250px] space-y-4">
                {/* Connection Type Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">Connection Type</h3>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenConnectionTypeDropdown(!openConnectionTypeDropdown);
                        setShowAddConnectionType(false);
                      }}
                      className="h-9 w-full px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center justify-between gap-2 transition-all shadow-sm hover:shadow"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm shrink-0"
                          style={{ backgroundColor: getConnectionTypeColor(currentConnectionType, customConnectionTypeColors) }}
                        />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {currentConnectionType.charAt(0).toUpperCase() + currentConnectionType.slice(1).replace(/_/g, ' ')}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 ${openConnectionTypeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {openConnectionTypeDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => {
                            setOpenConnectionTypeDropdown(false);
                            setShowAddConnectionType(false);
                          }}
                        />
                        <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-hidden flex flex-col">
                          <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9ca3af #f3f4f6' }}>
                            <div className="py-1">
                    {connectionTypes.map((type) => (
                                <div key={type} className="flex items-center group">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleConnectionTypeChange(selectedEdgeId, type);
                                      setOpenConnectionTypeDropdown(false);
                                      setShowAddConnectionType(false);
                                    }}
                                    className={`w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 transition-all ${
                                      currentConnectionType === type
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <div
                                      className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm shrink-0"
                                      style={{ backgroundColor: getConnectionTypeColor(type, customConnectionTypeColors) }}
                                    />
                                    <span className="flex-1">{type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}</span>
                                    {currentConnectionType === type && (
                                      <span className="text-blue-600 font-semibold text-base">✓</span>
                                    )}
                                  </button>
                                  {customConnectionTypes.includes(type) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveConnectionType(type);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 px-2 text-red-500 hover:text-red-700 text-xs transition-opacity"
                                      title="Remove custom type"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="border-t border-gray-200 pt-2 pb-2 flex-shrink-0">
                            {showAddConnectionType ? (
                              <div className="px-3 pb-2 flex gap-2">
                                <Input
                                  value={newConnectionType}
                                  onChange={(e) => setNewConnectionType(e.target.value)}
                                  placeholder="New type"
                                  className="h-8 text-sm flex-1 border-gray-300 rounded-lg"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddConnectionType();
                                    } else if (e.key === 'Escape') {
                                      setShowAddConnectionType(false);
                                      setNewConnectionType('');
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleAddConnectionType}
                                  className="h-8 px-3 text-sm rounded-lg"
                                >
                                  Add
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddConnectionType(false);
                                    setNewConnectionType('');
                                  }}
                                  className="h-8 w-8 p-0 rounded-lg"
                                >
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowAddConnectionType(true)}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-blue-600 font-medium transition-colors rounded-b-lg"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add custom type</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Preview of connection style */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs text-gray-500">Style:</div>
                    <div className="flex items-center gap-1 flex-1">
                      <div
                        className="h-2 flex-1 rounded"
                        style={{
                          backgroundColor: getEdgeColor(currentConnectionType),
                          borderTop: `2px solid ${getEdgeColor(currentConnectionType)}`,
                          borderStyle: getEdgeStyle(currentConnectionType).strokeDasharray ? 'dashed' : 'solid',
                          borderWidth: '0 0 2px 0',
                        }}
                      />
                      <span className="text-xs text-gray-400">
                        {getEdgeStyle(currentConnectionType).strokeDasharray ? 'Dashed' : 'Solid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edge Type Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">Edge Type</h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleEdgeTypeChange(selectedEdgeId, 'default')}
                      variant={currentEdgeType === 'default' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Default (Bezier)
                    </Button>
                    <Button
                      onClick={() => handleEdgeTypeChange(selectedEdgeId, 'straight')}
                      variant={currentEdgeType === 'straight' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Straight
                    </Button>
                    <Button
                      onClick={() => handleEdgeTypeChange(selectedEdgeId, 'step')}
                      variant={currentEdgeType === 'step' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Step
                    </Button>
                    <Button
                      onClick={() => handleEdgeTypeChange(selectedEdgeId, 'smoothstep')}
                      variant={currentEdgeType === 'smoothstep' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                    >
                      Smooth Step
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          );
        })()}
      </ReactFlow>
      
      {/* Builder Sidebar */}
      {isBuilderMode && (
        <ArchitectureBuilderSidebar
          blocks={blocks}
          connections={connections}
          onAddComponent={handleAddComponent}
          onUpdateComponent={handleUpdateComponent}
          onDeleteComponent={handleDeleteComponent}
          onAddConnection={handleAddConnection}
          onUpdateConnection={handleUpdateConnection}
          onDeleteConnection={handleDeleteConnection}
          onClose={() => setIsBuilderMode(false)}
        />
      )}
    </div>
  );
}
