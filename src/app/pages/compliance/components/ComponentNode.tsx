import type { Component } from '@/app/types';
import { CheckCircle, XCircle, AlertCircle, Zap, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ComponentNodeProps {
  component: Component;
  scale: number;
  isSelected?: boolean;
  onClick?: () => void;
  onExplore?: () => void;
}

export function ComponentNode({ component, scale, isSelected, onClick, onExplore }: ComponentNodeProps) {
  const getStatusIcon = () => {
    switch (component.complianceStatus) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (component.complianceStatus) {
      case 'compliant':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'partial':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  // Adjust size based on zoom level
  const getSize = () => {
    if (scale < 0.5) return { width: 120, height: 60, fontSize: 'text-xs' };
    if (scale < 1) return { width: 180, height: 90, fontSize: 'text-sm' };
    return { width: 280, height: 140, fontSize: 'text-base' };
  };

  const size = getSize();
  const showDetails = scale >= 1;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`absolute cursor-pointer rounded-lg border-2 bg-white shadow-lg transition-all ${getStatusColor()} ${
        isSelected ? 'ring-4 ring-blue-400' : ''
      }`}
      style={{
        left: component.position?.x || 0,
        top: component.position?.y || 0,
        width: size.width,
        height: size.height,
      }}
      onClick={onClick}
    >
      <div className="flex h-full flex-col p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={`font-bold truncate ${size.fontSize}`}>
              {component.reference}
            </div>
            {scale >= 0.5 && (
              <div className="text-xs text-gray-600 truncate">
                {component.partNumber || 'Generic'}
              </div>
            )}
          </div>
          {getStatusIcon()}
        </div>

        {/* Details (only visible when zoomed in) */}
        {showDetails && (
          <>
            <div className="mt-2 flex-1 space-y-1 text-xs text-gray-600">
              <div className="truncate">{component.manufacturer || 'Generic'}</div>
              {component.complianceScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Compliance:</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        component.complianceScore >= 70
                          ? 'bg-green-500'
                          : component.complianceScore >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${component.complianceScore}%` }}
                    />
                  </div>
                  <span>{component.complianceScore}%</span>
                </div>
              )}
              {component.specs.efficiency !== undefined && (
                <div>Efficiency: {(component.specs.efficiency * 100).toFixed(0)}%</div>
              )}
              {component.specs.voltage !== undefined && (
                <div>
                  {component.specs.voltage}V @ {component.specs.current}A
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-2 flex gap-2">
              {component.complianceStatus === 'failed' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplore?.();
                  }}
                  className="flex-1 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                >
                  Fix Now
                </button>
              )}
              {component.complianceStatus === 'compliant' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplore?.();
                  }}
                  className="flex-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
                >
                  <Zap className="inline h-3 w-3 mr-1" />
                  Explore
                </button>
              )}
            </div>
          </>
        )}

        {/* Compact view (mid-zoom) */}
        {!showDetails && scale >= 0.5 && (
          <div className="mt-2 text-xs">
            {component.complianceScore !== undefined && (
              <div className="text-gray-600">{component.complianceScore}%</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
