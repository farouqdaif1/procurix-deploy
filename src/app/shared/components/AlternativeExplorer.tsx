import type { Alternative, Component } from '@/app/types';
import { X, Star, CheckCircle, XCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlternativeExplorerProps {
  component: Component;
  alternatives: Alternative[];
  onClose: () => void;
  onApply: (alternative: Alternative) => void;
}

export function AlternativeExplorer({ component, alternatives, onClose, onApply }: AlternativeExplorerProps) {
  const compliantAlternatives = alternatives.filter(a => a.complianceStatus === 'compliant');
  const nonCompliantAlternatives = alternatives.filter(a => a.complianceStatus !== 'compliant');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b bg-gray-50 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Explore Alternatives: {component.reference}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {component.partNumber} ({component.manufacturer})
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Current Component Summary */}
          <div className="border-b bg-red-50 px-6 py-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Component</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm">
                  {component.specs.voltage}V @ {component.specs.current}A | Efficiency: {(component.specs.efficiency! * 100).toFixed(0)}%
                </div>
                {component.failedRequirements && component.failedRequirements.length > 0 && (
                  <div className="text-sm text-red-600 font-medium">
                    ❌ {component.failedRequirements.length} Failed Requirements
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{component.complianceScore}%</div>
                <div className="text-xs text-gray-600">Compliance</div>
              </div>
            </div>
          </div>

          {/* Alternatives List */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="p-6 space-y-6">
              {/* Recommended */}
              {compliantAlternatives.filter(a => a.isRecommended).map((alt) => (
                <AlternativeCard
                  key={alt.id}
                  alternative={alt}
                  isRecommended
                  onApply={() => onApply(alt)}
                />
              ))}

              {/* Other Compliant */}
              {compliantAlternatives.filter(a => !a.isRecommended).length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Other Compliant Options</h3>
                    <span className="text-sm text-gray-500">
                      ({compliantAlternatives.filter(a => !a.isRecommended).length})
                    </span>
                  </div>
                  {compliantAlternatives.filter(a => !a.isRecommended).map((alt) => (
                    <AlternativeCard
                      key={alt.id}
                      alternative={alt}
                      onApply={() => onApply(alt)}
                    />
                  ))}
                </>
              )}

              {/* Non-Compliant */}
              {nonCompliantAlternatives.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-gray-900">Non-Compliant Options</h3>
                    <span className="text-sm text-gray-500">({nonCompliantAlternatives.length})</span>
                  </div>
                  {nonCompliantAlternatives.map((alt) => (
                    <AlternativeCard
                      key={alt.id}
                      alternative={alt}
                      onApply={() => onApply(alt)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AlternativeCard({
  alternative,
  isRecommended = false,
  onApply,
}: {
  alternative: Alternative;
  isRecommended?: boolean;
  onApply: () => void;
}) {
  const isCompliant = alternative.complianceStatus === 'compliant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border-2 p-4 ${
        isRecommended
          ? 'border-blue-500 bg-blue-50'
          : isCompliant
          ? 'border-green-300 bg-white'
          : 'border-red-300 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isRecommended && <Star className="h-5 w-5 fill-blue-500 text-blue-500" />}
            <h4 className="font-bold text-lg">
              {alternative.partNumber}
            </h4>
          </div>
          <p className="text-sm text-gray-600">{alternative.manufacturer}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
            {alternative.complianceScore}%
          </div>
          <div className="text-xs text-gray-600">Compliance</div>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-600">Output:</span> {alternative.specs.voltage}V ±1%
        </div>
        <div>
          <span className="text-gray-600">Current:</span> {alternative.specs.current}A
        </div>
        <div>
          <span className="text-gray-600">Efficiency:</span>{' '}
          <span className={alternative.efficiency! >= 0.85 ? 'text-green-600 font-medium' : ''}>
            {(alternative.efficiency! * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="text-gray-600">Noise:</span> {alternative.noise}µVrms
        </div>
      </div>

      {/* Improvements */}
      {isCompliant && alternative.improvements.length > 0 && (
        <div className="mb-3 space-y-1">
          {alternative.improvements.slice(0, 3).map((improvement, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-green-700">
              <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{improvement}</span>
            </div>
          ))}
        </div>
      )}

      {/* Failures */}
      {!isCompliant && alternative.failedRequirements.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="text-sm font-medium text-red-700">
            Failures ({alternative.failedRequirements.length}):
          </div>
          {alternative.failedRequirements.slice(0, 3).map((failure, idx) => (
            <div key={idx} className="text-xs text-red-600 pl-4">
              • {failure.requirementCode}: {failure.description}
            </div>
          ))}
        </div>
      )}

      {/* Impact Preview */}
      <div className="mb-3 rounded bg-gray-50 p-3 text-sm">
        <div className="font-medium text-gray-700 mb-1">Impact Preview:</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            BOM Compliance: {alternative.impact.complianceChange > 0 ? '+' : ''}
            {alternative.impact.complianceChange}%
          </div>
          <div>
            Cost Change: {alternative.impact.costChange > 0 ? '+' : ''}${alternative.impact.costChange.toFixed(2)}/unit
          </div>
          <div>
            {alternative.impact.isDropInReplacement ? '✅ Drop-in replacement' : '⚠️ PCB changes required'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a
          href={alternative.datasheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Datasheet
        </a>
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              isCompliant
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isCompliant ? 'Apply This Option' : 'View Details'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
