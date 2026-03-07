import type { SessionStage } from '@/app/types';
import { Upload, Zap, FileText, Box, CheckCircle, Layers, Filter, Sparkles, ClipboardCheck, Lock } from 'lucide-react';

interface StageIndicatorProps {
  currentStage: SessionStage;
  maxReachedStage?: number | null; // The highest stage number reached (from current_stage in BOM)
  onStageClick?: (stage: SessionStage) => void;
}

const allStages: { id: SessionStage; label: string; icon: any; stageNumber: number }[] = [
  { id: 'upload', label: 'Upload', icon: Upload, stageNumber: 1 },
  // { id: 'discovery', label: 'Discovery', icon: Sparkles }, // Commented out
  { id: 'fundamental', label: 'Classify', icon: Filter, stageNumber: 2 },
  { id: 'analysis', label: 'Analysis', icon: Sparkles, stageNumber: 3 },
  { id: 'validate', label: 'Validate', icon: Zap, stageNumber: 4 }, // Commented out
  { id: 'requirements', label: 'Requirements', icon: FileText, stageNumber: 5 },
  { id: 'architecture', label: 'Architecture', icon: Layers, stageNumber: 6 },

  { id: 'subsystems', label: 'Subsystems', icon: Box, stageNumber: 7 },
  { id: 'review', label: 'Review', icon: ClipboardCheck, stageNumber: 8 },
];

// Filter out commented stages
const stages = allStages.filter(stage => 
  stage.id !== 'discovery'
);

export function StageIndicator({ currentStage, maxReachedStage, onStageClick }: StageIndicatorProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStage);
  
  // If currentStage is not found, default to -1 (no stage available)
  const safeCurrentIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const isActive = stage.id === currentStage;
        
        // Determine if stage is completed based on maxReachedStage
        // A stage is complete if its stageNumber is less than or equal to maxReachedStage
        const isComplete = maxReachedStage !== null && maxReachedStage !== undefined 
          ? stage.stageNumber <= maxReachedStage && !isActive
          : idx < safeCurrentIndex; // Fallback to old logic if maxReachedStage not provided
        
        // A stage is available if it's been reached (stageNumber <= maxReachedStage) or is the current stage
        // BUT: Upload stage (stageNumber 1) is always disabled - users can only go back to Classify (stageNumber 2) and later
        const baseIsAvailable = maxReachedStage !== null && maxReachedStage !== undefined
          ? stage.stageNumber <= maxReachedStage || isActive
          : idx <= safeCurrentIndex; // Fallback to old logic if maxReachedStage not provided
        
        // Upload stage is always disabled (stageNumber 1), Classify (stageNumber 2) is the earliest navigable stage
        const isAvailable = baseIsAvailable && stage.stageNumber >= 2;

        // Special styling for upload stage - always locked/disabled
        const isUploadStage = stage.id === 'upload';
        const isLocked = isUploadStage && !isActive; // Upload is locked unless it's the current stage

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => isAvailable && onStageClick?.(stage.id)}
              disabled={!isAvailable}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isLocked
                  ? 'bg-slate-100 text-slate-400 border-2 border-slate-300 cursor-not-allowed opacity-75'
                  : isComplete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isAvailable
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title={isLocked ? 'Upload stage is locked - cannot navigate back to it' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{stage.label}</span>
              {isLocked && <Lock className="h-3 w-3" />}
              {isComplete && !isLocked && <CheckCircle className="h-4 w-4" />}
            </button>
            {idx < stages.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 ${
                  maxReachedStage !== null && maxReachedStage !== undefined
                    ? stage.stageNumber < maxReachedStage
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                    : idx < safeCurrentIndex
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
