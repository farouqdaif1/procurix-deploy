import { useState, useEffect, useRef } from 'react';
import type { Component } from '@/app/types';
import { CheckCircle, Cpu, Zap, AlertCircle, Loader2, Search, X, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { classifyParts, getClassification, bulkUpdateClassification } from '@/app/services/api';

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
  const [isApplying, setIsApplying] = useState(false);
  
  // Track original state from GET request to detect changes
  const originalClassificationMapRef = useRef<Record<string, 'auxiliary' | 'non-auxiliary' | null>>({});
  const dataFromGetRef = useRef<boolean>(false);

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
        // Try GET first, fallback to POST if 404 or if all values are null
        let classificationResult;
        try {
          classificationResult = await getClassification(sessionId);
          console.log('Got classification from GET endpoint');
          dataFromGetRef.current = true;
          
          // Store original classification map for change detection
          originalClassificationMapRef.current = { ...classificationResult.classification_map };
          
          // Check if classification_map has all null values (classification not done yet)
          const classificationMap = classificationResult.classification_map || {};
          const allValuesNull = Object.values(classificationMap).every(value => value === null);
          
          if (allValuesNull && Object.keys(classificationMap).length > 0) {
            console.log('Classification map has all null values, triggering classification...');
            classificationResult = await classifyParts(sessionId);
            console.log('Generated classification from POST endpoint');
            dataFromGetRef.current = false;
            // Update original map after POST classification
            originalClassificationMapRef.current = { ...classificationResult.classification_map };
          }
        } catch (getError: any) {
          // If 404, try POST to generate classification
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get classification: 404')) {
            console.log('Classification not found, generating...');
            classificationResult = await classifyParts(sessionId);
            console.log('Generated classification from POST endpoint');
            dataFromGetRef.current = false;
            // Update original map after POST classification
            originalClassificationMapRef.current = { ...classificationResult.classification_map };
          } else {
            throw getError;
          }
        }
        
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
            // Handle null classification (not classified yet)
            const isFundamental = classification === null 
              ? undefined 
              : classification === 'non-auxiliary' 
                ? true 
                : false;
            
            const component = {
              id: `comp-${partNumber}-${index}`,
              reference: partNumber, // Use part_number from API as reference
              partNumber: partNumber, // From classification_map
              description: partNumber, // Use part_number as description
              type: 'IC',
              isFundamental: isFundamental, // From classification_map (can be undefined if null)
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

  const handleClassify = (componentId: string, isFundamental: boolean) => {
    const component = localComponents.find((c) => c.id === componentId);
    
    // Validate component and partNumber
    if (!component) {
      toast.error('Component not found');
      return;
    }
    
    if (!component.partNumber || component.partNumber.trim() === '') {
      toast.error('Part number is missing or invalid');
      console.error('Component missing partNumber:', component);
      return;
    }

    // Determine new classification based on isFundamental
    // isFundamental = true means non-auxiliary, false means auxiliary
    const newClassification: 'auxiliary' | 'non-auxiliary' = isFundamental ? 'non-auxiliary' : 'auxiliary';
    const oldClassification: 'auxiliary' | 'non-auxiliary' | null = component.isFundamental === true 
      ? 'non-auxiliary' 
      : component.isFundamental === false 
        ? 'auxiliary' 
        : null;

    // If classification hasn't changed, do nothing
    if (newClassification === oldClassification) {
      return;
    }

    // Update UI locally (no API call yet)
    setLocalComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, isFundamental } : c))
    );
  };

  // Calculate pending changes by comparing current state with original state
  const getPendingChanges = () => {
    const changes: Array<{ mpn: string; new_classification: 'auxiliary' | 'non-auxiliary' }> = [];
    
    localComponents.forEach((component) => {
      if (!component.partNumber) return;
      
      const mpn = component.partNumber.trim();
      const originalClassification = originalClassificationMapRef.current[mpn];
      
      // Determine current classification
      const currentClassification: 'auxiliary' | 'non-auxiliary' | null = component.isFundamental === true 
        ? 'non-auxiliary' 
        : component.isFundamental === false 
          ? 'auxiliary' 
          : null;
      
      // Only include if it's different from original
      if (currentClassification !== originalClassification && currentClassification !== null) {
        changes.push({
          mpn,
          new_classification: currentClassification,
        });
      }
    });
    
    return changes;
  };

  const handleApplyClassification = async () => {
    if (!sessionId) {
      toast.error('Session ID is missing');
      return;
    }

    const pendingChanges = getPendingChanges();
    
    if (pendingChanges.length === 0) {
      toast.info('No changes to apply');
      return;
    }

    setIsApplying(true);

    try {
      console.log('Applying bulk classification updates:', { partsCount: pendingChanges.length });
      const result = await bulkUpdateClassification(sessionId, pendingChanges);

      // Update stats from API response
      if (result.statistics && classificationStats) {
        setClassificationStats({
          total_parts: result.statistics.total_parts,
          auxiliary_parts: result.statistics.exempt_count, // exempt_count = auxiliary parts
          non_auxiliary_parts: result.statistics.candidates_count, // candidates_count = non-auxiliary parts
        });
      }

      // Update original map to reflect applied changes
      pendingChanges.forEach((change) => {
        originalClassificationMapRef.current[change.mpn] = change.new_classification;
      });

      toast.success(result.message || `Successfully applied ${pendingChanges.length} classification changes`);
      
      // Redirect to next step after successful apply
      onClassificationComplete(localComponents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply classification';
      toast.error(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const handleProceed = () => {
    // Go to next stage without applying changes (when no changes exist)
    onClassificationComplete(localComponents);
  };

  const fundamentalComponents = localComponents.filter((c) => c.isFundamental === true);
  const auxiliaryComponents = localComponents.filter((c) => c.isFundamental === false);
  const unclassifiedComponents = localComponents.filter((c) => c.isFundamental === undefined);

  const allClassified = unclassifiedComponents.length === 0;
  const pendingChanges = getPendingChanges();
  const hasPendingChanges = pendingChanges.length > 0;
  const dataFromGet = dataFromGetRef.current;

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

  // Show centered loader when classifying (like upload page)
  if (isClassifying) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-gray-300 bg-gray-50 p-12 text-center transition-all">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Processing Classification...
                </h3>
                <p className="text-gray-600 mb-6">
                  Classifying {currentClassifying} of {classificationStats?.total_parts || '...'} parts
                </p>
                {classificationStats && (
                  <div className="w-full max-w-md mx-auto">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${classifyProgress}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {Math.round(classifyProgress)}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Component Classification
          </h1>
          <p className="text-lg text-gray-600">
            Classify components as <strong>Fundamental (Essential)</strong> or{' '}
            <strong>Auxiliary (Non-Essential)</strong>
          </p> */}
        </motion.div>

        {/* Error State */}
        {error && !isClassifying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-gray-300 bg-white p-12 mb-8"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-16 w-16 text-gray-400" />
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
              <div className="rounded-lg border border-blue-300 bg-blue-50 p-6 text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {classificationStats?.non_auxiliary_parts ?? fundamentalComponents.length}
                </div>
                <div className="text-sm text-gray-700 mt-1">Fundamental (Non-Auxiliary)</div>
                {classificationStats && (
                  <div className="text-xs text-gray-600 mt-1">
                    {classificationStats.total_parts} total parts
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-gray-300 bg-gray-50 p-6 text-center">
                <div className="text-4xl font-bold text-gray-700">
                  {classificationStats?.auxiliary_parts ?? auxiliaryComponents.length}
                </div>
                <div className="text-sm text-gray-700 mt-1">Auxiliary</div>
                {classificationStats && (
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.round((classificationStats.auxiliary_parts / classificationStats.total_parts) * 100)}% of total
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-gray-300 bg-white p-6 text-center">
                <div className="text-4xl font-bold text-gray-900">
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

            {/* Component List */}
            <div className="rounded-xl border border-gray-300 bg-white p-6 mb-6">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search components by reference, part number, type, or description..."
                    className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none text-sm transition-colors"
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

              {/* Status Messages */}
              {allClassified && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>
                      <strong>All Set!</strong> AI has classified all {localComponents.length} components. Review below if needed, or proceed directly to System Architecture.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>
                      <strong>Classification Complete!</strong> {fundamentalComponents.length} fundamental components will be used for system architecture. {auxiliaryComponents.length} auxiliary components will be tracked separately.
                    </span>
                  </div>
                </div>
              )}

              {/* Two-Pane Layout */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Left Pane: Fundamental Components */}
                <div className="rounded-lg border border-blue-300 bg-blue-50 p-3">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-300">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Fundamental</h4>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
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
                        return (
                          <motion.div
                            key={comp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => handleClassify(comp.id, false)}
                            className="bg-white border border-blue-300 rounded p-2 transition-all group cursor-pointer hover:border-blue-500"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {comp.partNumber && (
                                <span className="text-sm text-blue-700 font-mono bg-blue-50 border border-blue-300 px-2 py-1 rounded font-medium">
                                  {comp.partNumber}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 group-hover:text-blue-600">Move →</span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: Auxiliary Components */}
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">Auxiliary</h4>
                    </div>
                    <div className="text-lg font-bold text-gray-700">
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
                        return (
                          <motion.div
                            key={comp.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => handleClassify(comp.id, true)}
                            className="bg-white border border-gray-300 rounded p-2 transition-all group cursor-pointer hover:border-gray-400"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 group-hover:text-gray-700">← Move</span>
                              {comp.partNumber && (
                                <span className="text-sm text-gray-700 font-mono bg-gray-50 border border-gray-300 px-2 py-1 rounded font-medium">
                                  {comp.partNumber}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!allClassified ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-gray-300 px-4 py-2 text-gray-600 font-medium text-sm cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  <AlertCircle className="h-4 w-4" />
                  Classify {unclassifiedComponents.length} component(s) first
                </button>
              ) : hasPendingChanges ? (
                <button
                  onClick={handleApplyClassification}
                  disabled={isApplying}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium text-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying {pendingChanges.length} change(s)...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Apply Classification ({pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''})
                    </>
                  )}
                </button>
              ) : dataFromGet ? (
                <button
                  onClick={handleProceed}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-white font-medium text-sm hover:bg-green-700 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Go to Next Stage</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleProceed}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium text-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle className="h-4 w-4" />
                  Proceed to Next Stage
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}