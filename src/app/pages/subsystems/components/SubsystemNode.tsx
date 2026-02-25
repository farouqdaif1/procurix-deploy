import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Package, CheckCircle2 } from 'lucide-react';
import type { Subsystem } from '@/app/types';

interface SubsystemNodeData extends Subsystem {
  componentCount?: number;
  requirementCount?: number;
}

interface SubsystemNodeProps {
  data: SubsystemNodeData;
  selected?: boolean;
}

export const SubsystemNode = memo(({ data, selected }: SubsystemNodeProps) => {
  return (
    <div className="relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-purple-500 border-2 border-white"
        style={{ top: '50%' }}
      />
      
      {/* Subsystem Container */}
      <div
        className={`px-6 py-5 shadow-xl rounded-xl border-2 bg-white transition-all min-w-[240px] ${
          selected ? 'border-blue-500 shadow-2xl scale-105' : 'border-purple-200'
        }`}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600`}>
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">{data.name}</div>
            <div className="text-xs text-gray-500 truncate">{data.type}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 pt-3 border-t border-gray-100">
          {data.componentCount !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                <Package className="h-3 w-3" />
                Components
              </span>
              <span className="font-semibold text-gray-900">{data.componentCount}</span>
            </div>
          )}
          {data.requirementCount !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Requirements</span>
              <span className="font-semibold text-gray-900">{data.requirementCount}</span>
            </div>
          )}
          {data.complianceScore !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Compliance
              </span>
              <span className={`font-semibold ${
                data.complianceScore >= 70 ? 'text-green-600' :
                data.complianceScore >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.complianceScore}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-purple-500 border-2 border-white"
        style={{ top: '50%' }}
      />
    </div>
  );
});

SubsystemNode.displayName = 'SubsystemNode';
