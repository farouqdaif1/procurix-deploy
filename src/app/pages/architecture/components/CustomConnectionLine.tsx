import { getStraightPath, type ConnectionLineProps } from '@xyflow/react';

export function CustomConnectionLine({ fromX, fromY, toX, toY, connectionLineStyle }: ConnectionLineProps & { connectionLineStyle?: any }) {
  const [edgePath] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        style={connectionLineStyle || { stroke: '#b1b1b7' }}
        fill="none"
        d={edgePath}
      />
    </g>
  );
}
