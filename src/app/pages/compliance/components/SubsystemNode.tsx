import type { Subsystem, Component } from '@/app/types';
import { motion } from 'motion/react';
import { Cpu } from 'lucide-react';

interface SubsystemNodeProps {
  subsystem: Subsystem;
  components: Component[];
  scale: number;
}

export function SubsystemNode({ subsystem, components, scale }: SubsystemNodeProps) {
  const compliantCount = components.filter(c => c.complianceStatus === 'compliant').length;
  const totalCount = components.length;
  
  // Only show at system view (zoomed out)
  if (scale >= 0.8) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute rounded-2xl border-4 border-blue-300 bg-blue-50/30 backdrop-blur-sm"
      style={{
        left: (subsystem.position?.x || 0) - 100,
        top: (subsystem.position?.y || 0) - 150,
        width: 800,
        height: 500,
        pointerEvents: 'none',
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-6 w-6 text-blue-600" />
          <div>
            <div className="font-bold text-lg text-blue-900">{subsystem.name}</div>
            <div className="text-sm text-blue-700">{subsystem.type}</div>
          </div>
        </div>
        
        <div className="mt-2 space-y-1 text-sm text-blue-800">
          <div>Components: {totalCount}</div>
          <div>Compliant: {compliantCount}/{totalCount}</div>
          {subsystem.complianceScore !== undefined && (
            <div className="flex items-center gap-2">
              <span>Compliance:</span>
              <div className="flex-1 h-3 bg-blue-200 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className={`h-full ${
                    subsystem.complianceScore >= 70
                      ? 'bg-green-500'
                      : subsystem.complianceScore >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${subsystem.complianceScore}%` }}
                />
              </div>
              <span className="font-bold">{subsystem.complianceScore}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
