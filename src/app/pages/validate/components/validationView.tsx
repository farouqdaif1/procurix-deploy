import { useState, useEffect } from 'react';
import type { Component } from '@/app/types';
import { CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { validateParts, getValidationResults, type ValidationResult } from '@/app/services/api';

interface ValidationViewProps {
  components: Component[];
  onValidationComplete: (validatedComponents: Component[]) => void;
}

export function ValidationView({ components: _components, onValidationComplete }: ValidationViewProps) {
  const { sessionId } = useSession();
  const [isValidating, setIsValidating] = useState(true);
  const [validationData, setValidationData] = useState<{
    total_parts: number;
    valid_parts: number;
    invalid_parts: number;
    validation_results: ValidationResult[];
    auxiliary_parts_skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');

  useEffect(() => {
    const fetchValidation = async () => {
      if (!sessionId) {
        setIsValidating(false);
        setError('No session found. Please upload a BOM first.');
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        // Try GET first, fallback to POST if 404
        let result;
        try {
          result = await getValidationResults(sessionId);
          console.log('Got validation results from GET endpoint');
        } catch (getError: any) {
          // If 404, try POST to generate validation
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get validation results: 404')) {
            console.log('Validation results not found, generating...');
            result = await validateParts(sessionId);
            console.log('Generated validation results from POST endpoint');
          } else {
            throw getError;
          }
        }
        
        if (!result.success) {
          throw new Error('Validation request was not successful');
        }

        setValidationData({
          total_parts: result.total_parts,
          valid_parts: result.valid_parts,
          invalid_parts: result.invalid_parts,
          validation_results: result.validation_results,
          auxiliary_parts_skipped: result.auxiliary_parts_skipped,
        });
        
        setIsValidating(false);
        toast.success(`Validation complete! ${result.valid_parts} valid, ${result.invalid_parts} invalid parts`);
      } catch (error) {
        setIsValidating(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to validate parts';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    fetchValidation();
  }, [sessionId]);

  // Filter validation results
  const filteredResults = validationData?.validation_results.filter((result) => {
    // Apply filter mode
    if (filterMode === 'valid' && result.status !== 'valid') return false;
    if (filterMode === 'invalid' && result.status !== 'invalid') return false;

    // Apply search query
    if (searchQuery.trim() === '') return true;
    
    const query = searchQuery.toLowerCase();
    return (
      result.mpn.toLowerCase().includes(query) ||
      result.message.toLowerCase().includes(query) ||
      (result.manufacturer && result.manufacturer.toLowerCase().includes(query))
    );
  }) || [];

  const handleProceed = () => {
    // Convert validation results to components format
    const validatedComponents: Component[] = validationData?.validation_results.map((result, index) => ({
      id: `comp-${result.mpn}-${index}`,
      reference: result.mpn.substring(0, 8),
      partNumber: result.mpn,
      description: result.message,
      type: 'IC',
      manufacturer: result.manufacturer || undefined,
      isIdentified: result.status === 'valid',
      isGeneric: result.status === 'invalid',
      complianceStatus: 'unknown' as const,
      specs: {},
    })) || [];
    
    onValidationComplete(validatedComponents);
  };

  // Show centered loader when validating (like upload page)
  if (isValidating) {
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
                  Validating Parts...
                </h3>
                <p className="text-gray-600 mb-6">
                  Checking parts against component databases
                </p>
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

        {/* Error State */}
        {error && !isValidating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-gray-300 bg-white p-12 mb-8"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-16 w-16 text-gray-400" />
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Unable to Validate Parts
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  {error}
                </p>
                <p className="text-sm text-gray-500">
                  Please make sure you have completed classification and try again.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Validation Results */}
        {!isValidating && !error && validationData && (
          <>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-lg border border-gray-300 bg-white p-6 text-center">
                <div className="text-4xl font-bold text-gray-900">{validationData.total_parts}</div>
                <div className="text-sm text-gray-600 mt-1">Total Parts</div>
              </div>
              <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-center">
                <div className="text-4xl font-bold text-green-600">{validationData.valid_parts}</div>
                <div className="text-sm text-gray-700 mt-1">Valid Parts</div>
              </div>
              <div className="rounded-lg border border-gray-300 bg-gray-50 p-6 text-center">
                <div className="text-4xl font-bold text-gray-700">{validationData.invalid_parts}</div>
                <div className="text-sm text-gray-600 mt-1">Invalid Parts</div>
              </div>
              <div className="rounded-lg border border-blue-300 bg-blue-50 p-6 text-center">
                <div className="text-4xl font-bold text-blue-600">{validationData.auxiliary_parts_skipped}</div>
                <div className="text-sm text-gray-700 mt-1">Auxiliary Skipped</div>
              </div>
            </div>

        <div className="rounded-xl border border-gray-300 bg-white p-6 mb-6">
          {/* Search Bar and Filter Toggle */}
          <div className="mb-6 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by MPN or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none transition-colors text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({validationData.total_parts})
              </button>
              <button
                onClick={() => setFilterMode('valid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterMode === 'valid'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Valid ({validationData.valid_parts})
              </button>
              <button
                onClick={() => setFilterMode('invalid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterMode === 'invalid'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <X className="h-4 w-4 inline mr-1" />
                Invalid ({validationData.invalid_parts})
              </button>
            </div>

            {/* Results count */}
            {(searchQuery || filterMode !== 'all') && (
              <div className="text-sm text-gray-600">
                    Showing {filteredResults.length} of {validationData.total_parts} parts
              </div>
            )}
          </div>
          
              {/* Validation Results List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto mb-6">
                {filteredResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">No results found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
                  filteredResults.map((result, idx) => {
                    const isValid = result.status === 'valid';
                
                return (
                      <motion.div
                        key={`${result.mpn}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-lg border p-6 transition-all ${
                          isValid
                            ? 'border-green-300 bg-white hover:border-green-400'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Header Section */}
                          <div className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {isValid ? (
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                  <CheckCircle className="h-7 w-7 text-green-600" />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                  <X className="h-7 w-7 text-red-600" />
                                </div>
                            )}
                          </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <h3 className="font-bold text-xl text-gray-900">{result.mpn}</h3>
                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  isValid
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-600 text-white'
                                }`}>
                                  {result.status.toUpperCase()}
                                </span>
                          </div>

                              {/* Information Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                {/* Manufacturer */}
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Manufacturer:</span>
                                  <span className="text-sm text-gray-900 font-medium">
                                    {result.manufacturer || <span className="text-gray-400 italic">Not specified</span>}
                                  </span>
                    </div>

                                {/* Source */}
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Source:</span>
                                  <span className="text-sm text-gray-900 font-medium">
                                    {result.source || <span className="text-gray-400 italic">Not available</span>}
                                  </span>
                        </div>

                                {/* Confidence */}
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Confidence:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900 font-medium">
                                      {result.confidence > 0 ? `${(result.confidence * 100).toFixed(0)}%` : <span className="text-gray-400 italic">N/A</span>}
                                    </span>
                                    {result.confidence > 0 && (
                                      <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            isValid ? 'bg-green-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${result.confidence * 100}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Suggestions Count */}
                                {result.suggestions && result.suggestions.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Suggestions:</span>
                                    <span className="text-sm text-gray-900 font-medium">
                                      {result.suggestions.length} available
                                      </span>
                                  </div>
                                )}
                                  </div>
                                  
                              {/* Message */}
                              <div className={`rounded-lg p-3 ${
                                isValid 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-red-50 border border-red-200'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[80px]">Message:</span>
                                  <p className={`text-sm flex-1 ${
                                    isValid ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    {result.message}
                                  </p>
                                </div>
                                  </div>

                              {/* Suggestions List */}
                              {result.suggestions && result.suggestions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                    Alternative Suggestions ({result.suggestions.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {result.suggestions.slice(0, 3).map((suggestion: any, sIdx: number) => (
                                      <div
                                        key={sIdx}
                                        className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs"
                                      >
                                        <div className="font-medium text-gray-900">
                                          {suggestion.mpn || suggestion.partNumber || 'Unknown'}
                                        </div>
                                        {suggestion.manufacturer && (
                                          <div className="text-gray-600 mt-1">
                                            {suggestion.manufacturer}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {result.suggestions.length > 3 && (
                                      <div className="text-xs text-gray-500 italic">
                                        +{result.suggestions.length - 3} more suggestions
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                );
              })
            )}
          </div>

              {/* Proceed Button */}
              <button
                onClick={handleProceed}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Proceed to Next Step</span>
              </button>
            </div>
              </>
            )}
      </div>
    </div>
  );
}