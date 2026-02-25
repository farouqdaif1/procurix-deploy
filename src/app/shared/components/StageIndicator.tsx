import type { SessionStage } from '@/app/types';
import { Upload, Zap, FileText, Box, CheckCircle, Search, History, Layers, Filter, Sparkles, ClipboardCheck } from 'lucide-react';

interface StageIndicatorProps {
  currentStage: SessionStage;
  onStageClick?: (stage: SessionStage) => void;
}

const allStages: { id: SessionStage; label: string; icon: any }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  // { id: 'discovery', label: 'Discovery', icon: Sparkles }, // Commented out
  { id: 'fundamental', label: 'Classify', icon: Filter },
  { id: 'analysis', label: 'Analysis', icon: Sparkles },
  { id: 'validate', label: 'Validate', icon: Zap }, // Commented out
  { id: 'requirements', label: 'Requirements', icon: FileText },
  { id: 'architecture', label: 'Architecture', icon: Layers },

  { id: 'subsystems', label: 'Subsystems', icon: Box },
  { id: 'compliance', label: 'Compliance', icon: CheckCircle },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
];

// Filter out commented stages
const stages = allStages.filter(stage => 
  stage.id !== 'discovery'
);

export function StageIndicator({ currentStage, onStageClick }: StageIndicatorProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const isActive = stage.id === currentStage;
        const isComplete = idx < currentIndex;
        const isAvailable = idx <= currentIndex;

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => isAvailable && onStageClick?.(stage.id)}
              disabled={!isAvailable}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isComplete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isAvailable
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{stage.label}</span>
              {isComplete && <CheckCircle className="h-4 w-4" />}
            </button>
            {idx < stages.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 ${
                  idx < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
