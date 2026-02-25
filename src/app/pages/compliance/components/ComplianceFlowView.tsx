import { useMemo, useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Subsystem, Component } from '@/app/types';
import { ComponentNode } from '../../architecture/components/ComponentNode';
import { SubsystemGroupNode } from '../../subsystems/components/SubsystemGroupNode';
import { ZoomControls, type ZoomLevel } from './ZoomControls';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';

interface ComplianceFlowViewProps {
  subsystems: Subsystem[];
  components: Component[];
  selectedComponentId?: string;
  onComponentSelect?: (componentId: string) => void;
  onComponentExplore?: (componentId: string) => void;
}

// Helper function to extract pin number from pin name and create handle ID
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
  
  return undefined;
};

const nodeTypes = {
  component: ComponentNode as any,
  group: SubsystemGroupNode as any,
};

export function ComplianceFlowView({ 
  subsystems, 
  components, 
  selectedComponentId,
  onComponentSelect,
  onComponentExplore 
}: ComplianceFlowViewProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('component');
  
  // Generate layout with subsystems and their components
  const { initialNodes, initialEdges } = useMemo(() => {
    const groupNodes: Node[] = [];
    const componentNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Color palette for different subsystems
    const subsystemColors = [
      '#8b5cf6', // purple
      '#3b82f6', // blue
      '#22c55e', // green
      '#fb923c', // orange
      '#ec4899', // pink
      '#818cf8', // indigo
    ];

    // Layout subsystems in a grid with better spacing
    const columns = Math.ceil(Math.sqrt(subsystems.length));
    const subsystemSpacing = 600;
    const componentSpacing = 180;
    const groupPadding = 40;
    const groupMargin = 100;

    subsystems.forEach((subsystem, subsystemIndex) => {
      // Filter components that belong to this subsystem
      const subsystemComponents = components.filter(c => subsystem.componentIds.includes(c.id));
      
      const col = subsystemIndex % columns;
      const row = Math.floor(subsystemIndex / columns);
      
      // Calculate group dimensions dynamically based on the number of components (25% bigger)
      const compsPerRow = 4;
      const numRows = Math.ceil(subsystemComponents.length / compsPerRow);
      
      const actualCols = Math.min(subsystemComponents.length, compsPerRow);
      const baseWidth = actualCols * componentSpacing + groupPadding * 2;
      const groupWidth = baseWidth * 1.25; // 25% bigger
      
      const baseHeight = numRows * componentSpacing + groupPadding * 2 + 40;
      const groupHeight = baseHeight * 1.25; // 25% bigger
      
      const subsystemX = groupMargin + col * subsystemSpacing;
      const subsystemY = groupMargin + row * subsystemSpacing;

      // Create group container node
      const groupId = `group-${subsystem.id}`;
      groupNodes.push({
        id: groupId,
        type: 'group',
        position: { x: subsystemX, y: subsystemY },
        style: {
          width: groupWidth,
          height: groupHeight,
          border: 'none',
          outline: 'none',
        },
        data: {
          subsystem,
          color: subsystemIndex.toString(),
          componentCount: subsystemComponents.length,
          width: groupWidth,
          height: groupHeight,
        },
        draggable: true,
      });

      // Create component nodes within subsystem group
      subsystemComponents.forEach((comp, compIndex) => {
        const compCol = compIndex % compsPerRow;
        const compRow = Math.floor(compIndex / compsPerRow);
        
        const compX = groupPadding + compCol * componentSpacing;
        const compY = groupPadding + 30 + compRow * componentSpacing;

        // Assign shapes in a rotating pattern using existing shapes
        const availableShapes: ('diamond' | 'circle' | 'square' | 'triangle')[] = ['diamond', 'circle', 'square', 'triangle'];
        const shape = availableShapes[compIndex % availableShapes.length];

        componentNodes.push({
          id: comp.id,
          type: 'component',
          position: { x: compX, y: compY },
          parentId: groupId,
          extent: 'parent',
          data: {
            ...comp,
            category: subsystem.type,
            shape,
          },
          selected: comp.id === selectedComponentId,
        });
      });

      // Create connections between components within the same subsystem
      subsystemComponents.forEach((comp, compIndex) => {
        const compsPerRow = 4;
        const compRow = Math.floor(compIndex / compsPerRow);
        const compCol = compIndex % compsPerRow;
        
        // Connect to component on the right (if exists)
        if (compCol < compsPerRow - 1 && compIndex + 1 < subsystemComponents.length) {
          const rightComp = subsystemComponents[compIndex + 1];
          if (!newEdges.find(e => e.id === `edge-${comp.id}-${rightComp.id}`)) {
            newEdges.push({
              id: `edge-${comp.id}-${rightComp.id}-horizontal`,
              source: comp.id,
              target: rightComp.id,
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: subsystemColors[subsystemIndex % subsystemColors.length],
                strokeWidth: 1.5,
                opacity: 0.5,
              },
            });
          }
        }
        
        // Connect to component below (if exists)
        if (compRow < Math.ceil(subsystemComponents.length / compsPerRow) - 1) {
          const belowIndex = compIndex + compsPerRow;
          if (belowIndex < subsystemComponents.length) {
            const belowComp = subsystemComponents[belowIndex];
            newEdges.push({
              id: `edge-${comp.id}-${belowComp.id}-vertical`,
              source: comp.id,
              target: belowComp.id,
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: subsystemColors[subsystemIndex % subsystemColors.length],
                strokeWidth: 1.5,
                opacity: 0.5,
              },
            });
          }
        }
      });
    });

    // Connect groups that share components or have dependencies
    subsystems.forEach((subsystem, idx) => {
      const subsystemComps = components.filter(c => subsystem.componentIds.includes(c.id));
      const groupId = `group-${subsystem.id}`;
      
      subsystems.slice(idx + 1).forEach((otherSubsystem) => {
        const otherComps = components.filter(c => otherSubsystem.componentIds.includes(c.id));
        const otherGroupId = `group-${otherSubsystem.id}`;
        
        const hasConnection = subsystemComps.some(sc => 
          otherComps.some(oc => {
            const scType = sc.type.toLowerCase();
            const ocType = oc.type.toLowerCase();
            return (scType.includes('power') && ocType.includes('power')) ||
                   (scType.includes('signal') && ocType.includes('signal')) ||
                   (scType.includes('data') && ocType.includes('data'));
          })
        );

        if (hasConnection) {
          newEdges.push({
            id: `edge-${groupId}-${otherGroupId}`,
            source: groupId,
            target: otherGroupId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: subsystemColors[idx % subsystemColors.length],
              strokeWidth: 3,
              opacity: 0.6,
            },
            label: 'interacts',
            labelStyle: {
              fill: subsystemColors[idx % subsystemColors.length],
              fontWeight: 600,
              fontSize: 11,
            },
            labelBgStyle: {
              fill: 'white',
              fillOpacity: 0.9,
            },
          });
        }
      });
    });

    const newNodes = [...groupNodes, ...componentNodes];
    return { initialNodes: newNodes, initialEdges: newEdges };
  }, [subsystems, components, selectedComponentId]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Create unique edge ID using sourceHandle and targetHandle to prevent overlapping
      const edgeId = params.sourceHandle || params.targetHandle
        ? `edge-${params.source}-${params.target}-${params.sourceHandle || 'src'}-${params.targetHandle || 'tgt'}-${Date.now()}`
        : `edge-${params.source}-${params.target}-${Date.now()}`;
      
      const newEdge = {
        ...params,
        id: edgeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
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
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'component' && onComponentSelect) {
      onComponentSelect(node.id);
    }
  }, [onComponentSelect]);

  const handleZoomLevelChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level);
  }, []);

  return (
    <ReactFlowProvider>
      <ComplianceFlowContent
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        zoomLevel={zoomLevel}
        onZoomLevelChange={handleZoomLevelChange}
      />
    </ReactFlowProvider>
  );
}

// Inner component that uses React Flow hooks
function ComplianceFlowContent({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onConnect,
  zoomLevel,
  onZoomLevelChange,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onConnect: (connection: Connection) => void;
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
}) {
  const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow();
  const [currentZoom, setCurrentZoom] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const viewport = getViewport();
      setCurrentZoom(Math.round(viewport.zoom * 100));
    }, 100);
    return () => clearInterval(interval);
  }, [getViewport]);

  useEffect(() => {
    const zoomLevels = {
      system: 0.4,
      component: 1,
      detail: 1.5,
    };
    const viewport = getViewport();
    setViewport({ x: viewport.x, y: viewport.y, zoom: zoomLevels[zoomLevel] });
  }, [zoomLevel, setViewport, getViewport]);

  return (
    <div className="h-full w-full relative">
      <style>{`
        .react-flow__node-group {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'group') {
              const data = node.data as any;
              const colorIndex = parseInt(data.color) || 0;
              const colors = ['#8b5cf6', '#3b82f6', '#22c55e', '#fb923c', '#ec4899', '#818cf8'];
              return colors[colorIndex % colors.length];
            }
            const data = node.data as any;
            if (data.complianceStatus === 'compliant') return '#22c55e';
            if (data.complianceStatus === 'failed') return '#ef4444';
            if (data.complianceStatus === 'partial') return '#f59e0b';
            return '#6b7280';
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
      </ReactFlow>
      
      {/* View Level Controls */}
      <ZoomControls
        currentZoom={currentZoom / 100}
        zoomLevel={zoomLevel}
        onZoomIn={() => zoomIn(0.2)}
        onZoomOut={() => zoomOut(0.2)}
        onResetZoom={() => fitView()}
        onZoomLevelChange={onZoomLevelChange}
      />
    </div>
  );
}
