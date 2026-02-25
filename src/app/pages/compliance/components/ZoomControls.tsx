import { ZoomIn, ZoomOut, Maximize2, Layers } from 'lucide-react';

export type ZoomLevel = 'system' | 'component' | 'detail';

interface ZoomControlsProps {
  currentZoom: number;
  zoomLevel: ZoomLevel;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomLevelChange: (level: ZoomLevel) => void;
}

export function ZoomControls({
  currentZoom,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onZoomLevelChange,
}: ZoomControlsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {/* Zoom Level Selector */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-2">
        <div className="text-xs font-medium text-gray-500 mb-2 px-2">View Level</div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onZoomLevelChange('system')}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
              zoomLevel === 'system'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>System</span>
          </button>
          <button
            onClick={() => onZoomLevelChange('component')}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
              zoomLevel === 'component'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Component</span>
          </button>
          <button
            onClick={() => onZoomLevelChange('detail')}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
              zoomLevel === 'detail'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Detail</span>
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-2">
        <div className="text-xs font-medium text-gray-500 mb-2 px-2 text-center">
          {Math.round(currentZoom * 100)}%
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={onZoomIn}
            className="flex items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={onZoomOut}
            className="flex items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={onResetZoom}
            className="flex items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100"
            title="Reset View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
