import { useState, useEffect } from 'react';
import { Loader2, Sparkles, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { analyzeSystem, getSystemAnalysis, selectSystemType, type SystemSuggestion } from '@/app/services/api';

interface AnalysisViewProps {
  onSystemTypeSelected: (systemType: string) => void;
}

export function AnalysisView({ onSystemTypeSelected }: AnalysisViewProps) {
  const { sessionId } = useSession();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [suggestions, setSuggestions] = useState<SystemSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');

  // Fetch system analysis on mount
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!sessionId) {
        setError('No session found. Please upload a BOM first.');
        setIsAnalyzing(false);
        return;
      }

      setIsAnalyzing(true);
      setError(null);

      try {
        // Try GET first, fallback to POST if 404
        let result;
        try {
          result = await getSystemAnalysis(sessionId);
          console.log('Got system analysis from GET endpoint');
        } catch (getError: any) {
          // If 404, try POST to generate analysis
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get system analysis: 404')) {
            console.log('System analysis not found, generating...');
            result = await analyzeSystem(sessionId, additionalContext || undefined);
            console.log('Generated system analysis from POST endpoint');
          } else {
            throw getError;
          }
        }
        
        if (!result.success) {
          throw new Error('Analysis request was not successful');
        }

        setSuggestions(result.suggestions);
        setIsAnalyzing(false);
        setHasGenerated(true);
        toast.success(`Analysis complete! Found ${result.suggestions.length} system type suggestions`);
      } catch (error) {
        setIsAnalyzing(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze system';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    fetchAnalysis();
  }, [sessionId]);

  const handleGenerate = async () => {
    if (!sessionId) {
      setError('No session found. Please upload a BOM first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeSystem(sessionId, additionalContext || undefined);
      
      if (!result.success) {
        throw new Error('Analysis request was not successful');
      }

      setSuggestions(result.suggestions);
      setIsAnalyzing(false);
      setHasGenerated(true);
      toast.success(`Analysis complete! Found ${result.suggestions.length} system type suggestions`);
    } catch (error) {
      setIsAnalyzing(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze system';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSelectSuggestion = (index: number) => {
    setSelectedSuggestion(index);
  };

  const handleProceed = async () => {
    if (selectedSuggestion !== null && sessionId) {
      try {
        // Call API to select the system type
        await selectSystemType(sessionId, selectedSuggestion);
        
        const selected = suggestions[selectedSuggestion];
        onSystemTypeSelected(selected.systemType);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to select system type';
        toast.error(errorMessage);
      }
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown';
    }
  };

  // Show centered loader when analyzing (like upload page)
  if (isAnalyzing) {
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
                  Analyzing System Components...
                </h3>
                <p className="text-gray-600 mb-6">
                  AI is analyzing your BOM to suggest system types
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show centered form when no suggestions generated yet
  if (!hasGenerated && !isAnalyzing) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Context Input Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-300 bg-white p-6"
            >
            <div className="space-y-6">
              <div>
                <label htmlFor="additional-context" className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Context (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Provide additional context about your system to help AI generate more accurate suggestions. 
                  For example: "This is for an automotive power management system" or "Industrial IoT device for monitoring"
                </p>
                <textarea
                  id="additional-context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., This is for an automotive power management system..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-400 focus:outline-none resize-none text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to generate without additional context
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isAnalyzing || !sessionId}
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate System Type Suggestions
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Error State */}
        {error && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-gray-300 bg-white p-12 mb-8"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-16 w-16 text-gray-400" />
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Unable to Analyze System
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  {error}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Please make sure you have completed classification and try again.
                </p>
                <button
                  onClick={handleGenerate}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Suggestions Display */}
        {!isAnalyzing && !error && suggestions.length > 0 && (
          <>
            <div className="mb-6">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700 flex-1">
                  <strong>Select a System Type:</strong> Review the AI suggestions below and select the system type that best matches your design. Each suggestion includes architectural clues, application domains, and confidence level.
                  {additionalContext && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <strong>Context used:</strong> "{additionalContext}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestion === index;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectSuggestion(index)}
                    className={`rounded-lg border p-6 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            <span className={`text-lg font-bold ${
                              isSelected ? 'text-white' : 'text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {suggestion.systemType}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {suggestion.primaryFunction}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getConfidenceColor(suggestion.confidence)}`}>
                          {getConfidenceBadge(suggestion.confidence)}
                        </span>
                        {isSelected && (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          Key Architectural Clues
                        </h4>
                        <ul className="space-y-1">
                          {suggestion.keyArchitecturalClues.map((clue, clueIndex) => (
                            <li key={clueIndex} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>{clue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          Likely Application Domains
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.likelyApplicationDomains.map((domain, domainIndex) => (
                            <span
                              key={domainIndex}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                            >
                              {domain}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        <strong>Reasoning:</strong> {suggestion.reasoning}
                      </p>
                    </div>

                    {/* Proceed Button - Only show when selected */}
                    {isSelected && (
                      <div className="mt-6 pt-6 border-t border-blue-200" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={handleProceed}
                          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span>Proceed with {suggestion.systemType}</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
