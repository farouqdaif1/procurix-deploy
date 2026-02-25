import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { Component } from '@/app/types';
import { getComponentColor } from '../utils/componentColors';

interface ComponentNodeData extends Component {
  category?: string;
  quantity?: number;
  componentColor?: { bg: string; text: string; border: string };
  pinout?: Record<string, { name: string; type: string; description: string }>;
}

export const ComponentNode = (props: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const data = props.data as unknown as ComponentNodeData;
  const selected = props.selected;
  
  // Debug: Log when component receives new data
  console.log('ComponentNode render:', {
    id: data.id,
    hasPinout: !!data.pinout,
    pinoutKeys: data.pinout ? Object.keys(data.pinout) : [],
    pinoutEntries: data.pinout ? Object.entries(data.pinout) : [],
    pinoutType: typeof data.pinout,
    pinoutValue: data.pinout,
  });
  
  // Get color for this component based on partNumber (component_id)
  const componentColor = data.componentColor || getComponentColor(data.partNumber || data.id);

  const getComplianceBadge = () => {
    if (data.complianceStatus === 'compliant') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Compliant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
        <AlertCircle className="h-3 w-3" />
        {data.complianceStatus}
      </span>
    );
  };

  const getKeySpecs = () => {
    const specs: string[] = [];
    if (data.specs.voltage) specs.push(`${data.specs.voltage}V`);
    if (data.specs.current) specs.push(`${data.specs.current}A`);
    if (data.specs.input_voltage_min && data.specs.input_voltage_max) {
      specs.push(`Vin: ${data.specs.input_voltage_min}-${data.specs.input_voltage_max}`);
    }
    if (data.specs.output_voltage) specs.push(`Vout: ${data.specs.output_voltage}`);
    if (data.specs.inductance) specs.push(`L: ${data.specs.inductance}`);
    if (data.specs.efficiency_typ) {
      // Extract first number from efficiency range (e.g., "90-95%" -> "90")
      // Convert to string first in case it's a number
      const effStr = String(data.specs.efficiency_typ);
      const effMatch = effStr.match(/^(\d+)/);
      if (effMatch) specs.push(`Eff: ${effMatch[1]}`);
    }
    return specs;
  };

  // Get color for pin type - supports custom types with unique colors
  const getPinColor = (pinType: string): string => {
    const type = (pinType || '').toUpperCase();
    
    // Default pin type colors
    const defaultColors: Record<string, string> = {
      'INPUT': '#3b82f6',    // Blue
      'GROUND': '#6b7280',   // Gray
      'OUTPUT': '#10b981',   // Green
      'POWER': '#f59e0b',    // Orange/Amber
      'ANALOG': '#8b5cf6',   // Purple
      'DIGITAL': '#ec4899',  // Pink
    };
    
    // Check default colors first
    if (defaultColors[type]) {
      return defaultColors[type];
    }
    
    // Load custom pin type colors from localStorage
    try {
      const saved = localStorage.getItem('customPinTypeColors');
      if (saved) {
        const customColors: Record<string, string> = JSON.parse(saved);
        if (customColors[type]) {
          return customColors[type];
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Default gray for unknown types
    return '#9ca3af';
  };

  // Generate handles - returns handles separately from pin content
  // Only show handles if pinout is defined and has pins
  const generateHandles = () => {
    const componentId = data.id;
    
    // Debug pinout check
    console.log('generateHandles check:', {
      id: componentId,
      hasPinout: !!data.pinout,
      pinoutType: typeof data.pinout,
      pinoutValue: data.pinout,
      pinoutKeys: data.pinout ? Object.keys(data.pinout) : [],
      pinoutLength: data.pinout ? Object.keys(data.pinout).length : 0,
    });
    
    // No default handles - user must add pins explicitly
    if (!data.pinout || Object.keys(data.pinout).length === 0) {
      console.log('No handles generated - pinout is empty or missing');
      return null;
    }
    
    console.log('Generating handles for', Object.keys(data.pinout).length, 'pins');

    const pins = Object.entries(data.pinout).sort(([a], [b]) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    const handles: React.ReactElement[] = [];
    const totalPins = pins.length;
    const pinsPerSide = Math.ceil(totalPins / 2);
    
    // Left side handles
    const leftPins = pins.slice(0, pinsPerSide);
    const leftStartPercent = 10;
    const leftEndPercent = 90;
    const leftRange = leftEndPercent - leftStartPercent;

    leftPins.forEach(([pinNumber, pinData], index) => {
      const pin = pinData as { name: string; type: string; description: string };
      const totalLeftPins = leftPins.length;
      const topOffset = totalLeftPins > 1
        ? `${leftStartPercent + (index / (totalLeftPins - 1)) * leftRange}%`
        : '50%';
      
      handles.push(
        <Handle
          key={`handle-left-${pinNumber}`}
          id={`${componentId}-pin-${pinNumber}`}
          type="source"
          position={Position.Left}
          className="w-4 h-4"
          style={{
            top: topOffset,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: getPinColor(pin.type),
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
          }}
          data-pin-number={pinNumber}
          data-pin-name={pin.name}
          data-pin-type={pin.type}
        />
      );
    });

    // Right side handles
    const rightPins = pins.slice(pinsPerSide);
    const rightStartPercent = 10;
    const rightEndPercent = 90;
    const rightRange = rightEndPercent - rightStartPercent;

    rightPins.forEach(([pinNumber, pinData], index) => {
      const pin = pinData as { name: string; type: string; description: string };
      const totalRightPins = rightPins.length;
      const topOffset = totalRightPins > 1
        ? `${rightStartPercent + (index / (totalRightPins - 1)) * rightRange}%`
        : '50%';
      
      handles.push(
        <Handle
          key={`handle-right-${pinNumber}`}
          id={`${componentId}-pin-${pinNumber}`}
          type="source"
          position={Position.Right}
          className="w-4 h-4"
          style={{
            top: topOffset,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: getPinColor(pin.type),
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
          }}
          data-pin-number={pinNumber}
          data-pin-name={pin.name}
          data-pin-type={pin.type}
        />
      );
    });

    return <>{handles}</>;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 transition-all ${
        selected ? 'border-blue-500 shadow-xl' : 'border-gray-200'
      }`}
      style={{ minWidth: '280px', maxWidth: '320px' }}
    >
      {/* Colored Type Section at Top */}
      <div 
        className="px-4 py-2 border-b"
        style={{ 
          backgroundColor: componentColor.bg,
          borderColor: componentColor.border 
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase" style={{ color: componentColor.text }}>
              {data.type || 'COMPONENT'}
            </span>
            {data.pinout && Object.keys(data.pinout).length > 0 && (
              <span 
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ 
                  backgroundColor: componentColor.text,
                  color: componentColor.bg 
                }}
              >
                {Object.keys(data.pinout).length} Pins
              </span>
            )}
          </div>
          {data.category && (
            <span 
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ 
                backgroundColor: componentColor.text,
                color: componentColor.bg 
              }}
            >
              {data.category}
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            {data.partNumber && (
              <div className="text-xs font-medium text-gray-600">{data.partNumber}</div>
            )}
            {data.reference && (
              <div className="text-xs text-gray-400 mt-0.5">Ref: {data.reference}</div>
            )}
            {data.pinout && Object.keys(data.pinout).length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Pins: {Object.keys(data.pinout).length}
              </div>
            )}
          </div>
          {getComplianceBadge()}
        </div>
        
        {data.manufacturer && (
          <div className="text-xs text-gray-500">Manufacturer: {data.manufacturer}</div>
        )}
        
        {data.description && (
          <div className="text-xs text-gray-600 mt-1.5">{data.description}</div>
        )}
      </div>

      {/* Key Specs */}
      {getKeySpecs().length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex flex-wrap gap-1.5">
            {getKeySpecs().map((spec, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pin Box - All pins appear inside this box */}
      <div className="relative border-b border-gray-200">
        {/* Render handles around the border */}
        {generateHandles()}
        
        {/* Pin content inside the box */}
        <div className="px-4 py-2">
          {data.pinout && typeof data.pinout === 'object' && Object.keys(data.pinout).length > 0 ? (
            (() => {
              const sortedPins = Object.entries(data.pinout).sort(([a], [b]) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numA - numB;
              });
              
              // Split pins into left and right sides (same logic as handles)
              const totalPins = sortedPins.length;
              const pinsPerSide = Math.ceil(totalPins / 2);
              const leftPins = sortedPins.slice(0, pinsPerSide);
              const rightPins = sortedPins.slice(pinsPerSide);
              
              return (
                <div className="grid grid-cols-2 gap-x-4">
                  {/* Left side pins column */}
                  <div className="flex flex-col gap-0.5">
                    {leftPins.map(([pinNumber, pinData]) => {
                      const pin = pinData as { name: string; type: string; description: string };
                      return (
                        <div
                          key={pinNumber}
                          className="flex flex-col text-xs"
                        >
                          <span className="font-medium text-gray-700">{pin.name}</span>
                          <span className="text-gray-400 text-xs capitalize">{pin.type.toLowerCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Right side pins column */}
                  <div className="flex flex-col gap-0.5">
                    {rightPins.map(([pinNumber, pinData]) => {
                      const pin = pinData as { name: string; type: string; description: string };
                      return (
                        <div
                          key={pinNumber}
                          className="flex flex-col items-end text-xs"
                        >
                          <span className="font-medium text-gray-700">{pin.name}</span>
                          <span className="text-gray-400 text-xs capitalize">{pin.type.toLowerCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-gray-400">No pinout defined</div>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>Details</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 py-3 bg-gray-50 space-y-2">
            {/* Basic Information */}
            {data.specs.package && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Package:</span>
                <span className="text-gray-700 font-medium">{data.specs.package}</span>
              </div>
            )}
            
            {data.specs.function && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Function:</span>
                <span className="text-gray-700 font-medium">{data.specs.function}</span>
              </div>
            )}

            {/* All Specs */}
            {Object.entries(data.specs).map(([key, value]) => {
              // Skip already displayed specs
              if (['package', 'function', 'voltage', 'current'].includes(key)) return null;
              
              return (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-gray-700 font-medium">{String(value)}</span>
                </div>
              );
            })}

            {/* Compliance Information */}
            {data.complianceScore !== undefined && (
              <div className="pt-2 mt-2 border-t border-gray-300">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Compliance Score:</span>
                  <span className="text-gray-700 font-medium">{data.complianceScore}%</span>
                </div>
              </div>
            )}

            {/* Instance Information */}
            {data.specs.instance_function && (
              <div className="pt-2 mt-2 border-t border-gray-300">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Instance Function:</span>
                  <span className="text-gray-700 font-medium">{data.specs.instance_function}</span>
                </div>
                {data.specs.instance_position && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Position:</span>
                    <span className="text-gray-700 font-medium">{data.specs.instance_position}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Status */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {data.isIdentified ? 'Identified' : 'Unidentified'}
          </span>
          {data.isGeneric && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
              Generic
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

ComponentNode.displayName = 'ComponentNode';
