import { useState, useEffect } from 'react';
import type { Component } from '@/app/types';
import { CheckCircle, Cpu, Zap, AlertCircle, Info, Loader2, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { classifyParts, updateClassification } from '@/app/services/api';

interface FundamentalClassificationViewProps {
  components: Component[];
  onClassificationComplete: (classifiedComponents: Component[]) => void;
}

export function FundamentalClassificationView({
  components: _components, // Unused - we create components from classification data
  onClassificationComplete,
}: FundamentalClassificationViewProps) {
  const { sessionId } = useSession();
  const [isClassifying, setIsClassifying] = useState(true);
  const [classifyProgress, setClassifyProgress] = useState(0);
  const [currentClassifying, setCurrentClassifying] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [localComponents, setLocalComponents] = useState<Component[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationStats, setClassificationStats] = useState<{
    total_parts: number;
    auxiliary_parts: number;
    non_auxiliary_parts: number;
  } | null>(null);
  const [updatingComponents, setUpdatingComponents] = useState<Set<string>>(new Set());

  // Fetch classification data when component mounts or sessionId changes
  useEffect(() => {
    const fetchClassification = async () => {
      if (!sessionId) {
        setIsClassifying(false);
        setError('No session found. Please upload a BOM first.');
        return;
      }
      
      setIsClassifying(true);
      setError(null);
      setClassifyProgress(0);
      setCurrentClassifying(0);
      
      try {
        const classificationResult = await classifyParts(sessionId);
        
        if (!classificationResult.success) {
          throw new Error('Classification request was not successful');
        }
        
        // Store classification stats
        setClassificationStats({
          total_parts: classificationResult.total_parts,
          auxiliary_parts: classificationResult.auxiliary_parts,
          non_auxiliary_parts: classificationResult.non_auxiliary_parts,
        });
        
        // Create components from classification_map
        // Create components for ALL parts in classification_map
        const classificationEntries = Object.entries(classificationResult.classification_map);
        console.log('Classification entries count:', classificationEntries.length);
        console.log('Classification map:', classificationResult.classification_map);
        
        const createdComponents: Component[] = classificationEntries.map(
          ([partNumber, classification], index) => {
            // Use only API data - part_number from classification_map
            const component = {
              id: `comp-${partNumber}-${index}`,
              reference: partNumber, // Use part_number from API as reference
              partNumber: partNumber, // From classification_map
              description: partNumber, // Use part_number as description
              type: 'IC',
              isFundamental: classification === 'non-auxiliary' ? true : false, // From classification_map
              isIdentified: true,
              isGeneric: false,
              complianceStatus: 'unknown' as const,
              specs: {},
            } as Component;
            
            return component;
          }
        );
        
        console.log('Created components:', createdComponents.length);
        console.log('Fundamental:', createdComponents.filter(c => c.isFundamental === true).length);
        console.log('Auxiliary:', createdComponents.filter(c => c.isFundamental === false).length);
        console.log('All components:', createdComponents);
        
        // Set components immediately
        setLocalComponents(createdComponents);
        
        // Simulate progress while processing
        const totalComponents = classificationResult.total_parts;
        let current = 0;
        
        const progressInterval = setInterval(() => {
          current++;
          setCurrentClassifying(current);
          setClassifyProgress((current / totalComponents) * 100);
          
          if (current >= totalComponents) {
            clearInterval(progressInterval);
            
            setIsClassifying(false);
            toast.success(`Classification complete: ${classificationResult.non_auxiliary_parts} non-auxiliary, ${classificationResult.auxiliary_parts} auxiliary parts`);
          }
        }, 50);
        
      } catch (error) {
        setIsClassifying(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch classification';
        setError(errorMessage);
        toast.error(errorMessage);
        setLocalComponents([]);
      }
    };
    
    fetchClassification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleClassify = async (componentId: string, isFundamental: boolean) => {
    const component = localComponents.find((c) => c.id === componentId);
    if (!component || !component.partNumber || !sessionId) {
      return;
    }

    // Check if already updating this component
    if (updatingComponents.has(componentId)) {
      return;
    }

    // Determine new classification based on isFundamental
    // isFundamental = true means non-auxiliary, false means auxiliary
    const newClassification: 'auxiliary' | 'non-auxiliary' = isFundamental ? 'non-auxiliary' : 'auxiliary';
    const oldClassification: 'auxiliary' | 'non-auxiliary' = component.isFundamental ? 'non-auxiliary' : 'auxiliary';

    // If classification hasn't changed, do nothing
    if (newClassification === oldClassification) {
      return;
    }

    // Optimistically update UI
    setLocalComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, isFundamental } : c))
    );

    // Mark as updating
    setUpdatingComponents((prev) => new Set(prev).add(componentId));

    try {
      // Call API to update classification
      const result = await updateClassification(sessionId, component.partNumber, newClassification);

      // Update stats from API response
      if (result.statistics && classificationStats) {
        setClassificationStats({
          total_parts: result.statistics.total_parts,
          auxiliary_parts: result.statistics.exempt_count, // exempt_count = auxiliary parts
          non_auxiliary_parts: result.statistics.candidates_count, // candidates_count = non-auxiliary parts
        });
      }

      toast.success(result.message || `Updated ${component.partNumber} classification`);
    } catch (error) {
      // Revert optimistic update on error
      setLocalComponents((prev) =>
        prev.map((c) => (c.id === componentId ? { ...c, isFundamental: !isFundamental } : c))
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to update classification';
      toast.error(errorMessage);
    } finally {
      // Remove from updating set
      setUpdatingComponents((prev) => {
        const next = new Set(prev);
        next.delete(componentId);
        return next;
      });
    }
  };

  const handleProceed = () => {
    onClassificationComplete(localComponents);
  };

  const fundamentalComponents = localComponents.filter((c) => c.isFundamental === true);
  const auxiliaryComponents = localComponents.filter((c) => c.isFundamental === false);
  const unclassifiedComponents = localComponents.filter((c) => c.isFundamental === undefined);

  const allClassified = unclassifiedComponents.length === 0;

  // Filter components based on search query
  const filterComponents = (components: Component[]) => {
    if (!searchQuery.trim()) return components;
    
    const query = searchQuery.toLowerCase();
    return components.filter((comp) => {
      const reference = (comp.reference || '').toLowerCase();
      const partNumber = (comp.partNumber || '').toLowerCase();
      const description = (comp.description || '').toLowerCase();
      const type = (comp.type || '').toLowerCase();
      
      return (
        reference.includes(query) ||
        partNumber.includes(query) ||
        description.includes(query) ||
        type.includes(query)
      );
    });
  };

  const filteredFundamental = filterComponents(fundamentalComponents);
  const filteredAuxiliary = filterComponents(auxiliaryComponents);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Component Classification
          </h1>
          <p className="text-lg text-gray-600">
            Classify components as <strong>Fundamental (Essential)</strong> or{' '}
            <strong>Auxiliary (Non-Essential)</strong>
          </p>
        </motion.div>

        {/* Classification Loading State */}
        {isClassifying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-12 mb-8"
          >
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  AI Classification in Progress
                </h3>
                <p className="text-lg text-gray-600">
                  Classifying {currentClassifying} of {classificationStats?.total_parts || '...'} parts...
                </p>
                {classificationStats && (
                  <p className="text-sm text-gray-500 mt-1">
                    Processing {classificationStats.total_parts} parts from BOM
                  </p>
                )}
              </div>

              <div className="w-full max-w-md">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${classifyProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                  <span>Analyzing component types and functions</span>
                  <span className="font-medium">{Math.round(classifyProgress)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !isClassifying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-red-200 bg-red-50 p-12 mb-8"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Unable to Load Classification
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  {error}
                </p>
                <p className="text-sm text-gray-500">
                  Please make sure you have uploaded a BOM file and try again.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Show content only after classification is complete */}
        {!isClassifying && !error && localComponents.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {classificationStats?.non_auxiliary_parts ?? fundamentalComponents.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Fundamental (Non-Auxiliary)</div>
                {classificationStats && (
                  <div className="text-xs text-gray-500 mt-1">
                    {classificationStats.total_parts} total parts
                  </div>
                )}
              </div>
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6 text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {classificationStats?.auxiliary_parts ?? auxiliaryComponents.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Auxiliary</div>
                {classificationStats && (
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((classificationStats.auxiliary_parts / classificationStats.total_parts) * 100)}% of total
                  </div>
                )}
              </div>
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
                <div className="text-4xl font-bold text-yellow-600">
                  {unclassifiedComponents.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Unclassified</div>
                {classificationStats && unclassifiedComponents.length === 0 && (
                  <div className="text-xs text-green-600 mt-1 font-medium">
                    All classified ✓
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Fundamental Components:</strong> Core components critical to primary
                functionality (e.g., MCU, power regulators, sensors).
                <br />
                <strong>Auxiliary Components:</strong> Supporting components that enhance but aren't
                essential (e.g., status LEDs, debug interfaces, optional features).
              </div>
            </div>

            {/* Component List */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Classification Complete</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Click any component to move it between categories
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-800 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ready to Proceed
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search components by reference, part number, type, or description..."
                    className="w-full pl-12 pr-12 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-sm transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-2 text-xs text-gray-600">
                    Showing {filteredFundamental.length + filteredAuxiliary.length} of {fundamentalComponents.length + auxiliaryComponents.length} components
                  </div>
                )}
              </div>

              {/* Two-Pane Layout */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left Pane: Fundamental Components */}
                <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-300">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Fundamental</h4>
                        <p className="text-xs text-gray-600">Core functionality</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {fundamentalComponents.length}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {filteredFundamental.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Cpu className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No fundamental components</p>
                        <p className="text-xs">Click items on the right to move here</p>
                      </div>
                    ) : (
                      filteredFundamental.map((comp) => {
                        const isUpdating = updatingComponents.has(comp.id);
                        return (
                          <motion.div
                            key={comp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => !isUpdating && handleClassify(comp.id, false)}
                            className={`bg-white border-2 rounded-lg p-3 transition-all group ${
                              isUpdating
                                ? 'border-blue-400 cursor-wait opacity-60'
                                : 'border-blue-200 cursor-pointer hover:border-blue-400 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {comp.partNumber && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm text-blue-600 font-mono bg-blue-100 px-2 py-0.5 rounded font-semibold">
                                      {comp.partNumber}
                                    </span>
                                    {isUpdating && (
                                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className={`text-xs transition-colors whitespace-nowrap ${
                                isUpdating
                                  ? 'text-blue-500'
                                  : 'text-gray-400 group-hover:text-purple-500'
                              }`}>
                                {isUpdating ? 'Updating...' : 'Move →'}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: Auxiliary Components */}
                <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-purple-300">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Auxiliary</h4>
                        <p className="text-xs text-gray-600">Supporting components</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {auxiliaryComponents.length}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {filteredAuxiliary.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No auxiliary components</p>
                        <p className="text-xs">Click items on the left to move here</p>
                      </div>
                    ) : (
                      filteredAuxiliary.map((comp) => {
                        const isUpdating = updatingComponents.has(comp.id);
                        return (
                          <motion.div
                            key={comp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => !isUpdating && handleClassify(comp.id, true)}
                            className={`bg-white border-2 rounded-lg p-3 transition-all group ${
                              isUpdating
                                ? 'border-purple-400 cursor-wait opacity-60'
                                : 'border-purple-200 cursor-pointer hover:border-purple-400 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className={`text-xs transition-colors whitespace-nowrap ${
                                isUpdating
                                  ? 'text-purple-500'
                                  : 'text-gray-400 group-hover:text-blue-500'
                              }`}>
                                {isUpdating ? 'Updating...' : '← Move'}
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                {comp.partNumber && (
                                  <div className="flex items-center justify-end gap-2 mb-1">
                                    {isUpdating && (
                                      <Loader2 className="h-3 w-3 text-purple-500 animate-spin" />
                                    )}
                                    <span className="text-sm text-purple-600 font-mono bg-purple-100 px-2 py-0.5 rounded font-semibold">
                                      {comp.partNumber}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Info message - Optional review */}
              {allClassified ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      <strong>All Set!</strong> AI has classified all {localComponents.length} components. Review above if needed, or proceed directly to System Architecture.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      <strong>Action Required:</strong> Please classify all{' '}
                      {unclassifiedComponents.length} remaining component(s) before proceeding.
                    </span>
                  </div>
                </div>
              )}

              {/* Proceed Button - Always enabled if all classified */}
              <button
                onClick={handleProceed}
                disabled={!allClassified}
                className="w-full rounded-lg bg-blue-500 px-6 py-4 text-white font-bold text-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                {!allClassified ? (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Classify {unclassifiedComponents.length} component(s) first
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6" />
                    Apply Classification ({fundamentalComponents.length} Fundamental, {auxiliaryComponents.length} Auxiliary)
                  </>
                )}
              </button>
            </div>

            {/* Summary Stats */}
            {allClassified && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <strong>Classification Complete!</strong> {fundamentalComponents.length}{' '}
                    fundamental components will be used for system architecture.{' '}
                    {auxiliaryComponents.length} auxiliary components will be tracked separately.
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}