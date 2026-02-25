import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './utils';

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [path] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge
        id={id}
        className="react-flow__edge-path"
        path={path}
        markerEnd={markerEnd}
        style={style}
      />
      {label && (
        <g transform={`translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`}>
          <rect
            x={-50}
            y={-10}
            width={100}
            height={20}
            style={labelBgStyle}
            rx={4}
          />
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
    </>
  );
}
