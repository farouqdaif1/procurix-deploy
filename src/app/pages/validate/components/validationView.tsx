import { useState, useEffect } from 'react';
import type { Component } from '@/app/types';
import { CheckCircle, AlertCircle, Search, X, ExternalLink, ArrowRight, Zap, Cpu } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { validateParts, getValidationResults, type ValidationResult } from '@/app/services/api';

interface ValidationViewProps {
  components: Component[];
  onValidationComplete: (validatedComponents: Component[]) => void;
}

export function ValidationView({ components: _components, onValidationComplete }: ValidationViewProps) {
  const { sessionId, setCurrentStage, refreshTrigger } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [data, setData] = useState<{
    total_parts: number;
    valid_parts: number;
    invalid_parts: number;
    validation_results: ValidationResult[];
    auxiliary_parts_skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'confirmed' | 'unresolved'>('all');

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError('No session found. Please upload a BOM first.');
      return;
    }

    // Try GET first (cached results), fall back to POST (advances FSM too)
    getValidationResults(sessionId)
      .then(result => {
        if (result.success && result.total_parts > 0) {
          setData(result);
        } else {
          return validateParts(sessionId, setCurrentStage).then(r => setData(r));
        }
      })
      .catch(() => validateParts(sessionId, setCurrentStage).then(r => setData(r)))
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [sessionId, refreshTrigger]);

  const filteredResults = (data?.validation_results ?? []).filter(r => {
    if (filterMode === 'confirmed' && r.status !== 'valid') return false;
    if (filterMode === 'unresolved' && r.status !== 'unresolved') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.mpn.toLowerCase().includes(q) ||
      (r.manufacturer ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (!sessionId || !data) return;
    setIsConfirming(true);
    try {
      await validateParts(sessionId, setCurrentStage);
      const components: Component[] = data.validation_results.map((r, i) => ({
        id: `comp-${r.mpn}-${i}`,
        reference: r.mpn,
        partNumber: r.mpn,
        manufacturer: r.manufacturer ?? undefined,
        description: r.description || r.mpn,
        type: r.category || 'IC',
        isIdentified: r.status === 'valid',
        isGeneric: r.status !== 'valid',
        complianceStatus: 'unknown' as const,
        specs: {},
      }));
      onValidationComplete(components);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading part review…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="text-gray-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const confirmed = data.valid_parts;
  const unresolved = data.invalid_parts;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 bg-white border-b">
        <h1 className="text-lg font-semibold text-gray-900">Part Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review fundamental parts before generating requirements
        </p>
      </div>

      {/* Stats */}
      <div className="shrink-0 px-6 py-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{data.total_parts}</div>
          <div className="text-xs text-gray-500 mt-1">Fundamental Parts</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{confirmed}</div>
          <div className="text-xs text-gray-600 mt-1">Confirmed</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{unresolved}</div>
          <div className="text-xs text-gray-600 mt-1">No Nexar Data</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{data.auxiliary_parts_skipped}</div>
          <div className="text-xs text-gray-600 mt-1">Auxiliary Skipped</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="shrink-0 px-6 pb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search parts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'confirmed', 'unresolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `All (${data.total_parts})` : f === 'confirmed' ? `Confirmed (${confirmed})` : `No data (${unresolved})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <Search className="h-8 w-8 mb-2 text-gray-300" />
            No results
          </div>
        ) : (
          filteredResults.map((r, idx) => {
            const isConfirmed = r.status === 'valid';
            return (
              <motion.div
                key={`${r.mpn}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`rounded-lg border bg-white p-4 ${
                  isConfirmed ? 'border-green-200' : 'border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center mt-0.5 ${
                    isConfirmed ? 'bg-green-100' : 'bg-amber-50'
                  }`}>
                    {isConfirmed
                      ? <Cpu className="h-5 w-5 text-green-600" />
                      : <AlertCircle className="h-5 w-5 text-amber-500" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-gray-900">{r.mpn}</span>
                      {r.manufacturer && (
                        <span className="text-xs text-gray-500">{r.manufacturer}</span>
                      )}
                      {isConfirmed ? (
                        <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">
                          {r.source === 'nexar_confirmed' ? 'confirmed' : r.source || 'nexar'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                          no data
                        </span>
                      )}
                    </div>

                    {r.category && (
                      <div className="text-xs text-gray-600 mt-0.5">{r.category}</div>
                    )}
                    {r.description && r.description !== r.mpn && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{r.description}</div>
                    )}

                    {/* Confidence bar for confirmed parts */}
                    {isConfirmed && r.confidence > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${r.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{(r.confidence * 100).toFixed(0)}%</span>
                      </div>
                    )}

                    {/* Unresolved message */}
                    {!isConfirmed && (
                      <p className="text-xs text-amber-700 mt-1">{r.message}</p>
                    )}
                  </div>

                  {/* Datasheet link */}
                  {r.datasheet_url && (
                    <a
                      href={r.datasheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> datasheet
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t bg-white">
        {unresolved > 0 && (
          <p className="text-xs text-amber-700 mb-3 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {unresolved} part{unresolved !== 1 ? 's' : ''} without Nexar data — you can still proceed; they'll be treated as unknown in requirements generation.
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {isConfirming ? (
            <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirming…</>
          ) : (
            <><Zap className="h-4 w-4" /> Confirm Parts & Generate Requirements<ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
