import { useMemo, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Subsystem, Component, Requirement } from '@/app/types';
import { CheckCircle } from 'lucide-react';
import { ComponentNode } from '../../architecture/components/ComponentNode';
import { SubsystemNode } from './SubsystemNode';
import { SubsystemGroupNode } from './SubsystemGroupNode';
import { Button } from '@/app/shared/components/ui/button';

interface SubsystemsFlowViewProps {
  subsystems: Subsystem[];
  components: Component[];
  requirements: Requirement[];
  onComplete: () => void;
}

const nodeTypes = {
  component: ComponentNode as any,
  subsystem: SubsystemNode as any,
  group: SubsystemGroupNode as any,
};

// Removed getEdgeColor - using subsystemColors directly now

export function SubsystemsFlowView({ subsystems, components, requirements, onComplete }: SubsystemsFlowViewProps) {
  // Generate layout with subsystems and their components
  const { initialNodes, initialEdges } = useMemo(() => {
    const groupNodes: Node[] = []; // Group nodes (backgrounds) - render first
    const componentNodes: Node[] = []; // Component nodes - render on top
    const newEdges: Edge[] = [];

    console.log('Generating nodes/edges:', { 
      subsystemsCount: subsystems.length, 
      componentsCount: components.length,
      subsystems: subsystems.map(s => ({ id: s.id, name: s.name, componentIds: s.componentIds }))
    });

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
    const subsystemSpacing = 600; // Increased spacing between groups
    const componentSpacing = 180;
    const groupPadding = 40; // Padding inside each group
    const groupMargin = 100; // Margin around each group

    subsystems.forEach((subsystem, subsystemIndex) => {
      // Filter components that belong to this subsystem using componentIds array
      const subsystemComponents = components.filter(c => subsystem.componentIds.includes(c.id));
      console.log(`Subsystem ${subsystem.name}: ${subsystemComponents.length} components`, {
        subsystemId: subsystem.id,
        componentIds: subsystem.componentIds,
        foundComponents: subsystemComponents.map(c => c.id)
      });
      
      const col = subsystemIndex % columns;
      const row = Math.floor(subsystemIndex / columns);
      
      // Calculate group dimensions dynamically based on the number of components (25% bigger)
      const compsPerRow = 4; // Components per row
      const numRows = Math.ceil(subsystemComponents.length / compsPerRow);
      
      // Calculate width: based on number of columns (compsPerRow) or actual component count if less
      const actualCols = Math.min(subsystemComponents.length, compsPerRow);
      const baseWidth = actualCols * componentSpacing + groupPadding * 2;
      const groupWidth = baseWidth * 1.25; // 25% bigger
      
      // Calculate height: based on number of rows needed for all components
      const baseHeight = numRows * componentSpacing + groupPadding * 2 + 40; // +40 for label
      const groupHeight = baseHeight * 1.25; // 25% bigger
      
      const subsystemX = groupMargin + col * subsystemSpacing;
      const subsystemY = groupMargin + row * subsystemSpacing;

      // Create group container node (background container for visual grouping)
      const groupId = `group-${subsystem.id}`;
      groupNodes.push({
        id: groupId,
        type: 'group',
        position: { x: subsystemX, y: subsystemY },
        style: {
          width: groupWidth,
          height: groupHeight,
          border: 'none', // Remove React Flow's default border
          outline: 'none', // Remove any outline
        },
        data: {
          subsystem,
          color: subsystemIndex.toString(),
          componentCount: subsystemComponents.length,
          width: groupWidth,
          height: groupHeight,
          componentIds: subsystemComponents.map(c => c.id), // Store component IDs for this group
        },
        draggable: true, // Allow dragging groups
      });

      // Create component nodes within subsystem group using React Flow's parent-child relationship
      subsystemComponents.forEach((comp, compIndex) => {
        const compCol = compIndex % compsPerRow;
        const compRow = Math.floor(compIndex / compsPerRow);
        
        // Positions are relative to the parent group (not absolute)
        const compX = groupPadding + compCol * componentSpacing;
        const compY = groupPadding + 30 + compRow * componentSpacing; // +30 for label space

        // Assign shapes in a rotating pattern using existing shapes: diamond, circle, square, triangle
        // This ensures each subsystem has a mix of all available shapes
        const availableShapes: ('diamond' | 'circle' | 'square' | 'triangle')[] = ['diamond', 'circle', 'square', 'triangle'];
        const shape = availableShapes[compIndex % availableShapes.length];

        componentNodes.push({
          id: comp.id,
          type: 'component',
          position: { x: compX, y: compY },
          parentId: groupId, // Link to parent group - React Flow handles movement automatically
          extent: 'parent', // Constrain component within parent bounds
          data: {
            ...comp,
            category: subsystem.type,
            shape,
          },
        });
      });

      // Create connections between components within the same subsystem
      subsystemComponents.forEach((comp, compIndex) => {
        // Connect each component to the next one in the subsystem (creating a chain)
        if (compIndex < subsystemComponents.length - 1) {
          const nextComp = subsystemComponents[compIndex + 1];
          newEdges.push({
            id: `edge-${comp.id}-${nextComp.id}`,
            source: comp.id,
            target: nextComp.id,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: subsystemColors[subsystemIndex % subsystemColors.length],
              strokeWidth: 2,
              opacity: 0.6,
            },
            label: '',
          });
        }
        
        // Also connect components in a grid pattern (connect to adjacent components)
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
      
      // Find other subsystems that might connect (simplified logic)
      subsystems.slice(idx + 1).forEach((otherSubsystem) => {
        const otherComps = components.filter(c => otherSubsystem.componentIds.includes(c.id));
        const otherGroupId = `group-${otherSubsystem.id}`;
        
        // Check if components are connected (simplified - check if they share power/signal types)
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

    // Combine nodes: groups first (background), then components (foreground)
    const newNodes = [...groupNodes, ...componentNodes];
    console.log('Generated nodes:', newNodes.length, 'edges:', newEdges.length, 'groups:', groupNodes.length);
    return { initialNodes: newNodes, initialEdges: newEdges };
  }, [subsystems, components, requirements]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  return (
    <div className="h-full w-full">
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
        onConnect={onConnect}
        nodeTypes={nodeTypes}
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
            if (node.type === 'subsystem') return '#8b5cf6';
            const data = node.data as any;
            if (data.type?.includes('regulator') || data.type?.includes('ldo')) return '#a855f7';
            if (data.type?.includes('battery') || data.type?.includes('charger')) return '#22c55e';
            if (data.type?.includes('converter')) return '#f59e0b';
            if (data.type?.includes('protection')) return '#ef4444';
            if (data.type?.includes('communication')) return '#3b82f6';
            return '#6b7280';
          }}
          className="bg-white border border-gray-200 rounded-lg"
        />
        <Panel position="top-right" className="m-4">
          <Button onClick={onComplete} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Complete Subsystems
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
