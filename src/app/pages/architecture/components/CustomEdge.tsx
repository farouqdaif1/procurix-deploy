import { BaseEdge, getBezierPath, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import { X } from 'lucide-react';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: any;
  targetPosition?: any;
  style?: React.CSSProperties;
  markerEnd?: string;
  label?: string;
  labelStyle?: React.CSSProperties;
  labelBgStyle?: React.CSSProperties;
  type?: string;
  pathOptions?: any;
  selectedEdgeId?: string | null;
  onDelete?: (edgeId: string) => void;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  type,
  selectedEdgeId,
  onDelete,
  pathOptions,
}: CustomEdgeProps) {
  const isSelected = selectedEdgeId === id;
  
  // Get the path based on edge type
  let edgePath: string;
  
  if (type === 'smoothstep') {
    const [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: (pathOptions as any)?.bend || 20,
    });
    edgePath = path;
  } else if (type === 'straight') {
    const [path] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    edgePath = path;
  } else if (type === 'step') {
    // Step edges use smoothstep path as fallback
    const [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    edgePath = path;
  } else {
    // default (bezier)
    const [path] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    edgePath = path;
  }

  // Calculate button position (middle of the edge, positioned above it)
  const buttonX = (sourceX + targetX) / 2;
  const buttonY = (sourceY + targetY) / 2 - 12; // Position 12px above the connection line

  // Calculate label position (middle of the edge)
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      
      {/* Label */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          {labelBgStyle && (
            <rect
              x={-50}
              y={-10}
              width={100}
              height={20}
              style={labelBgStyle}
              rx={4}
            />
          )}
          <text
            x={0}
            y={5}
            textAnchor="middle"
            style={labelStyle}
            className="react-flow__edge-text"
          >
            {label}
          </text>
        </g>
      )}
      
      {/* Remove Button - only show when selected */}
      {isSelected && onDelete && (
        <g transform={`translate(${buttonX}, ${buttonY})`}>
          <foreignObject
            x={-8}
            y={-8}
            width={16}
            height={16}
            className="react-flow__edge-button"
          >
            <div className="flex items-center justify-center w-full h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors cursor-pointer border border-white"
                title="Remove connection"
                style={{
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}
