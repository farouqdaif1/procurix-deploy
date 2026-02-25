import { memo } from 'react';
import type { Subsystem } from '@/app/types';

interface SubsystemGroupNodeData {
  subsystem: Subsystem;
  color: string;
  componentCount: number;
  width?: number;
  height?: number;
}

interface SubsystemGroupNodeProps {
  data: SubsystemGroupNodeData;
  selected?: boolean;
}

// Color palette for different subsystems
const subsystemColors = [
  { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.6)', text: 'rgba(139, 92, 246, 1)' }, // purple
  { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.6)', text: 'rgba(59, 130, 246, 1)' }, // blue
  { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.6)', text: 'rgba(34, 197, 94, 1)' }, // green
  { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.6)', text: 'rgba(251, 146, 60, 1)' }, // orange
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.6)', text: 'rgba(236, 72, 153, 1)' }, // pink
  { bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.6)', text: 'rgba(129, 140, 248, 1)' }, // indigo
];

export const SubsystemGroupNode = memo(({ data, selected }: SubsystemGroupNodeProps) => {
  const colorIndex = parseInt(data.color) || 0;
  const colors = subsystemColors[colorIndex % subsystemColors.length];
  const width = data.width || 800;
  const height = data.height || 600;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.bg,
        border: `3px dashed ${colors.border}`,
        borderRadius: '20px',
        position: 'relative',
        boxShadow: selected 
          ? `0 0 25px ${colors.border}, inset 0 0 20px ${colors.bg}` 
          : `inset 0 0 20px ${colors.bg}`,
        pointerEvents: 'none', // Allow clicks to pass through to components
        zIndex: 0,
      }}
    />
  );
});

SubsystemGroupNode.displayName = 'SubsystemGroupNode';
