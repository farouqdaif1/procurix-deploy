import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Component, Subsystem } from '@/app/types';
import { ComponentNode } from './ComponentNode';
import { SubsystemNode } from './SubsystemNode';
import { ZoomControls } from './ZoomControls';
import type { ZoomLevel } from './ZoomControls';

interface BOMCanvasProps {
  components: Component[];
  subsystems: Subsystem[];
  selectedComponentId?: string;
  onComponentSelect: (componentId: string) => void;
  onComponentExplore: (componentId: string) => void;
}

export function BOMCanvas({
  components,
  subsystems,
  selectedComponentId,
  onComponentSelect,
  onComponentExplore,
}: BOMCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('component');
  const [currentScale, setCurrentScale] = useState(1);

  const getTargetZoom = (level: ZoomLevel) => {
    switch (level) {
      case 'system':
        return 0.4;
      case 'component':
        return 1;
      case 'detail':
        return 1.5;
    }
  };

  return (
    <div className="relative h-full w-full bg-gray-50">
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={2}
        centerOnInit
        onTransformed={(ref) => {
          setCurrentScale(ref.state.scale);
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
          <>
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div className="relative" style={{ width: 2000, height: 1200 }}>
                {/* Subsystem boundaries (visible when zoomed out) */}
                {subsystems.map((subsystem) => (
                  <SubsystemNode
                    key={subsystem.id}
                    subsystem={subsystem}
                    components={components.filter((c) =>
                      subsystem.componentIds.includes(c.id)
                    )}
                    scale={currentScale}
                  />
                ))}

                {/* Component nodes */}
                {components.map((component) => (
                  <ComponentNode
                    key={component.id}
                    component={component}
                    scale={currentScale}
                    isSelected={component.id === selectedComponentId}
                    onClick={() => onComponentSelect(component.id)}
                    onExplore={() => onComponentExplore(component.id)}
                  />
                ))}

                {/* Connection lines (visible at mid-zoom) */}
                {currentScale >= 0.5 && currentScale <= 1.2 && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: 2000, height: 1200 }}
                  >
                    {/* Draw simple connections between components */}
                    {components.slice(0, -1).map((comp, idx) => {
                      const nextComp = components[idx + 1];
                      if (!comp.position || !nextComp.position) return null;
                      
                      return (
                        <line
                          key={`${comp.id}-${nextComp.id}`}
                          x1={comp.position.x + 140}
                          y1={comp.position.y + 70}
                          x2={nextComp.position.x + 140}
                          y2={nextComp.position.y + 70}
                          stroke="#9ca3af"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.5"
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </TransformComponent>

            <ZoomControls
              currentZoom={currentScale}
              zoomLevel={zoomLevel}
              onZoomIn={() => zoomIn(0.2)}
              onZoomOut={() => zoomOut(0.2)}
              onResetZoom={() => resetTransform()}
              onZoomLevelChange={(level) => {
                setZoomLevel(level);
                const targetZoom = getTargetZoom(level);
                setTransform(0, 0, targetZoom, 300);
              }}
            />
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
