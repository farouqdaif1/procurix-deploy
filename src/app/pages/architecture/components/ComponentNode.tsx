import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronUp, ExternalLink, Cpu } from 'lucide-react';
import type { Component } from '@/app/types';
import { getComponentColor } from '../utils/componentColors';

interface ComponentNodeData extends Component {
  category?: string;
  quantity?: number;
  componentColor?: { bg: string; text: string; border: string };
  pinout?: Record<string, { name: string; type: string; description: string }>;
}

// Keys to exclude from the specs display (shown elsewhere or not useful)
const EXCLUDED_SPEC_KEYS = ['Category', 'Description', 'Manufacturer', 'Datasheet', 'Status', 'Source', 'Confidence', 'Instance'];

export const ComponentNode = (props: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const data = props.data as unknown as ComponentNodeData;
  const selected = props.selected;

  // Detect if this is an instance (id ends with _N where N is a number)
  const instanceMatch = data.id?.match(/_(\d+)$/);
  const isInstance = !!instanceMatch;
  const instanceIndex = instanceMatch ? parseInt(instanceMatch[1], 10) : null;

  // Base part number (without instance suffix)
  const baseMpn = isInstance && data.id
    ? data.id.replace(/_\d+$/, '')
    : (data.partNumber || data.id);

  const componentColor = data.componentColor || getComponentColor(baseMpn);

  // Get category from specs or data
  const category = data.specs?.Category || data.category;

  // Get manufacturer from specs or data
  const manufacturer = data.specs?.Manufacturer || data.manufacturer;

  // Get description from specs or data
  const description = data.specs?.Description || data.description;

  // Get datasheet URL
  const datasheetUrl = data.specs?.Datasheet;

  // Filter specs for display (exclude meta fields shown elsewhere)
  const getDisplaySpecs = () => {
    if (!data.specs) return [];
    return Object.entries(data.specs)
      .filter(([key, value]) => !EXCLUDED_SPEC_KEYS.includes(key) && value != null && value !== '')
      .map(([key, value]) => ({ key, value: String(value) }));
  };

  // Get key specs for the compact view (first 3 important ones)
  const getKeySpecs = () => {
    return getDisplaySpecs().slice(0, 3);
  };

  // Get color for pin type
  const getPinColor = (pinType: string): string => {
    const type = (pinType || '').toUpperCase();
    const defaultColors: Record<string, string> = {
      'INPUT': '#3b82f6',
      'GROUND': '#6b7280',
      'OUTPUT': '#10b981',
      'POWER': '#f59e0b',
      'ANALOG': '#8b5cf6',
      'DIGITAL': '#ec4899',
    };

    if (defaultColors[type]) return defaultColors[type];

    try {
      const saved = localStorage.getItem('customPinTypeColors');
      if (saved) {
        const customColors: Record<string, string> = JSON.parse(saved);
        if (customColors[type]) return customColors[type];
      }
    } catch {
      // Ignore localStorage errors
    }

    return '#9ca3af';
  };

  // Generate handles for pins
  const generateHandles = () => {
    const componentId = data.id;

    if (!data.pinout || Object.keys(data.pinout).length === 0) return null;

    const pins = Object.entries(data.pinout).sort(([a], [b]) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });

    const handles: React.ReactElement[] = [];
    const totalPins = pins.length;
    const pinsPerSide = Math.ceil(totalPins / 2);

    const leftPins = pins.slice(0, pinsPerSide);
    const rightPins = pins.slice(pinsPerSide);

    leftPins.forEach(([pinNumber, pinData], index) => {
      const pin = pinData as { name: string; type: string; description: string };
      const totalLeftPins = leftPins.length;
      const topOffset = totalLeftPins > 1 ? `${10 + (index / (totalLeftPins - 1)) * 80}%` : '50%';

      handles.push(
        <Handle
          key={`handle-left-${pinNumber}`}
          id={`${componentId}-pin-${pinNumber}`}
          type="source"
          position={Position.Left}
          style={{
            top: topOffset,
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: getPinColor(pin.type),
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      );
    });

    rightPins.forEach(([pinNumber, pinData], index) => {
      const pin = pinData as { name: string; type: string; description: string };
      const totalRightPins = rightPins.length;
      const topOffset = totalRightPins > 1 ? `${10 + (index / (totalRightPins - 1)) * 80}%` : '50%';

      handles.push(
        <Handle
          key={`handle-right-${pinNumber}`}
          id={`${componentId}-pin-${pinNumber}`}
          type="source"
          position={Position.Right}
          style={{
            top: topOffset,
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: getPinColor(pin.type),
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      );
    });

    return <>{handles}</>;
  };

  const displaySpecs = getDisplaySpecs();
  const keySpecs = getKeySpecs();

  return (
    <div
      className={`bg-white rounded-xl shadow-md border transition-all duration-200 ${
        selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-100' : 'border-gray-200 hover:shadow-lg'
      }`}
      style={{ minWidth: '260px', maxWidth: '300px' }}
    >
      {/* Default handles when no pinout */}
      {(!data.pinout || Object.keys(data.pinout).length === 0) && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            style={{
              top: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#94a3b8',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            style={{
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#94a3b8',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        </>
      )}

      {/* Header with colored accent */}
      <div
        className="px-4 py-3 rounded-t-xl"
        style={{
          background: `linear-gradient(135deg, ${componentColor.bg} 0%, ${componentColor.bg}dd 100%)`,
        }}
      >
        {/* Category and Instance badges */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {category && (
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: componentColor.text,
              }}
            >
              {category}
            </span>
          )}
          {isInstance && (
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: componentColor.text,
                color: componentColor.bg,
              }}
            >
              #{instanceIndex}
            </span>
          )}
        </div>

        {/* Part Number - Main title */}
        <div className="flex items-start gap-2">
          <Cpu className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: componentColor.text }} />
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-sm leading-tight truncate"
              style={{ color: componentColor.text }}
              title={baseMpn}
            >
              {baseMpn}
            </h3>
            {manufacturer && (
              <p
                className="text-xs mt-0.5 opacity-80"
                style={{ color: componentColor.text }}
              >
                {manufacturer}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-600 line-clamp-2">{description}</p>
        </div>
      )}

      {/* Key Specs as pills */}
      {keySpecs.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-1.5">
            {keySpecs.map(({ key, value }) => (
              <span
                key={key}
                className="inline-flex items-center text-[10px] px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
              >
                <span className="text-slate-500 mr-1">{key}:</span>
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pinout section */}
      {data.pinout && Object.keys(data.pinout).length > 0 && (
        <div className="relative border-b border-gray-100">
          {generateHandles()}
          <div className="px-4 py-2">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Pinout</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {Object.keys(data.pinout).length} pins
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {Object.entries(data.pinout)
                .sort(([a], [b]) => (parseInt(a) || 0) - (parseInt(b) || 0))
                .slice(0, 6)
                .map(([pinNumber, pinData]) => {
                  const pin = pinData as { name: string; type: string };
                  return (
                    <div key={pinNumber} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getPinColor(pin.type) }}
                      />
                      <span className="text-gray-700 truncate">{pin.name}</span>
                    </div>
                  );
                })}
              {Object.keys(data.pinout).length > 6 && (
                <span className="text-[10px] text-gray-400 col-span-2">
                  +{Object.keys(data.pinout).length - 6} more...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Details */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">
            {isExpanded ? 'Hide details' : 'Show details'}
            {displaySpecs.length > 0 && !isExpanded && (
              <span className="ml-1 text-gray-400">({displaySpecs.length})</span>
            )}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
            {/* Datasheet link */}
            {datasheetUrl && (
              <a
                href={datasheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                <span>View Datasheet</span>
              </a>
            )}

            {/* All specs */}
            {displaySpecs.length > 0 ? (
              <div className="space-y-1 pt-1">
                {displaySpecs.map(({ key, value }) => (
                  <div key={key} className="flex justify-between items-start text-[11px] py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{key}</span>
                    <span className="text-gray-800 font-medium text-right ml-2 max-w-[140px] break-words">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              !datasheetUrl && (
                <p className="text-[11px] text-gray-400 italic py-2">No additional specs available</p>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 rounded-b-xl border-t border-gray-100"
        style={{ backgroundColor: '#fafafa' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data.specs?.Status && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                data.specs.Status === 'valid'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {data.specs.Status === 'valid' ? 'Verified' : data.specs.Status}
              </span>
            )}
            {data.specs?.Confidence && (
              <span className="text-[10px] text-gray-500">
                {data.specs.Confidence}
              </span>
            )}
          </div>
          {data.specs?.Source && (
            <span className="text-[10px] text-gray-400">
              via {data.specs.Source}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

ComponentNode.displayName = 'ComponentNode';
