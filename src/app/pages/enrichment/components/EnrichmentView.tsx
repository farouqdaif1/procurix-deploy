import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Loader2, Database, AlertCircle,
  ArrowRight, Cpu, AlertTriangle, Link,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import {
  triggerModelEnrichment,
  getModelEnrichmentStatus,
  updatePartDatasheetUrl,
  type ModelEnrichmentStatus,
  type PartEnrichmentDetail,
  type PartEnrichmentState,
} from '@/app/services/api';
import { PartModelDrawer } from '@/app/shared/components/PartModelDrawer';

// ── Per-part card ─────────────────────────────────────────────────────────────

interface PartCardProps {
  part: PartEnrichmentDetail;
  isEditing: boolean;
  urlInput: string;
  isSubmitting: boolean;
  onViewModel: () => void;
  onToggleEdit: () => void;
  onUrlChange: (v: string) => void;
  onSubmitUrl: () => void;
}

function PartCard({
  part, isEditing, urlInput, isSubmitting,
  onViewModel, onToggleEdit, onUrlChange, onSubmitUrl,
}: PartCardProps) {
  const borderClass: Record<PartEnrichmentState, string> = {
    done: 'border-green-200 bg-green-50',
    extracting: 'border-blue-100 bg-white',
    no_datasheet: 'border-amber-200 bg-amber-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-4 py-3 transition-colors ${borderClass[part.status]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {part.status === 'done' && (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          )}
          {part.status === 'extracting' && (
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
          )}
          {part.status === 'no_datasheet' && (
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <span className="font-mono text-sm font-medium text-gray-800">{part.mpn}</span>
          {part.status === 'no_datasheet' && (
            <span className="text-xs text-amber-600">No datasheet found</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {part.status === 'done' && (
            <button
              onClick={onViewModel}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
            >
              <Cpu className="h-3 w-3" />
              View Model
            </button>
          )}
          {part.status === 'no_datasheet' && (
            <button
              onClick={onToggleEdit}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 border border-amber-200 rounded px-2 py-1 hover:bg-amber-50 transition-colors"
            >
              <Link className="h-3 w-3" />
              {isEditing ? 'Cancel' : 'Add URL'}
            </button>
          )}
        </div>
      </div>

      {part.status === 'no_datasheet' && isEditing && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            placeholder="https://example.com/datasheet.pdf"
            value={urlInput}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && onSubmitUrl()}
            className="flex-1 text-xs border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
            autoFocus
          />
          <button
            onClick={onSubmitUrl}
            disabled={isSubmitting || !urlInput.trim()}
            className="flex items-center gap-1 text-xs bg-amber-500 text-white rounded px-3 py-1.5 hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : 'Retry'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function EnrichmentView() {
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const [status, setStatus] = useState<ModelEnrichmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelDrawerMpn, setModelDrawerMpn] = useState<string | null>(null);
  const [editingMpns, setEditingMpns] = useState<Set<string>>(new Set());
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [submittingMpns, setSubmittingMpns] = useState<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const s = await getModelEnrichmentStatus(sessionId);
        setStatus(s);
        if (s.complete) stopPolling();
      } catch {
        setError('Failed to fetch enrichment status.');
        stopPolling();
      }
    };

    const init = async () => {
      try {
        await triggerModelEnrichment(sessionId);
        const initial = await getModelEnrichmentStatus(sessionId);
        setStatus(initial);
        if (!initial.complete) {
          pollingRef.current = setInterval(fetchStatus, 4000);
        }
      } catch {
        toast.error('Failed to start enrichment.');
        setError('Failed to start enrichment.');
      }
    };

    init();
    return () => stopPolling();
  }, [sessionId]);

  const toggleEditing = (mpn: string) => {
    setEditingMpns(prev => {
      const next = new Set(prev);
      if (next.has(mpn)) next.delete(mpn);
      else next.add(mpn);
      return next;
    });
  };

  const handleSubmitUrl = async (mpn: string) => {
    const url = (urlInputs[mpn] ?? '').trim();
    if (!url || !sessionId) return;

    setSubmittingMpns(prev => new Set(prev).add(mpn));
    try {
      await updatePartDatasheetUrl(sessionId, mpn, url);

      // Optimistically flip to extracting
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          extracting: prev.extracting + 1,
          no_datasheet: prev.no_datasheet - 1,
          complete: false,
          parts: prev.parts.map(p =>
            p.mpn === mpn ? { mpn, status: 'extracting' as PartEnrichmentState } : p
          ),
        };
      });

      setEditingMpns(prev => { const n = new Set(prev); n.delete(mpn); return n; });
      setUrlInputs(prev => { const n = { ...prev }; delete n[mpn]; return n; });

      // Restart polling if it stopped (e.g. was previously complete)
      if (!pollingRef.current) {
        const fetchStatus = async () => {
          try {
            const s = await getModelEnrichmentStatus(sessionId);
            setStatus(s);
            if (s.complete) stopPolling();
          } catch {
            stopPolling();
          }
        };
        pollingRef.current = setInterval(fetchStatus, 4000);
      }
    } catch {
      toast.error(`Failed to update datasheet URL for ${mpn}.`);
    } finally {
      setSubmittingMpns(prev => { const n = new Set(prev); n.delete(mpn); return n; });
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No active session.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const enrichable = status.done + status.extracting;
  const progressPct = enrichable > 0
    ? Math.round((status.done / enrichable) * 100)
    : 100;

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-7 w-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">Part Model Enrichment</h1>
        </div>
        <p className="text-sm text-gray-500">
          Extracting electrical models from datasheets using Docling + Claude.
          {status.total === 0 && ' No non-auxiliary parts found.'}
        </p>
      </div>

      {/* Progress bar — only when there are parts with datasheets */}
      {enrichable > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{status.done} of {enrichable} enriched</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {!status.complete && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Extracting — this may take a few minutes per part
            </p>
          )}
        </div>
      )}

      {/* No-datasheet hint */}
      {status.no_datasheet > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {status.no_datasheet} part{status.no_datasheet > 1 ? 's' : ''} have no datasheet URL.
            Add a direct PDF link below to enrich them, or continue without.
          </span>
        </div>
      )}

      {/* Per-part cards */}
      {status.parts.length > 0 && (
        <div className="space-y-2 mb-10">
          {status.parts.map((part) => (
            <PartCard
              key={part.mpn}
              part={part}
              isEditing={editingMpns.has(part.mpn)}
              urlInput={urlInputs[part.mpn] ?? ''}
              isSubmitting={submittingMpns.has(part.mpn)}
              onViewModel={() => setModelDrawerMpn(part.mpn)}
              onToggleEdit={() => toggleEditing(part.mpn)}
              onUrlChange={(v) => setUrlInputs(prev => ({ ...prev, [part.mpn]: v }))}
              onSubmitUrl={() => handleSubmitUrl(part.mpn)}
            />
          ))}
        </div>
      )}

      {/* Continue */}
      {status.complete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <button
            onClick={() => navigate('/validate')}
            className="flex items-center gap-2 bg-blue-500 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            Continue to Part Review
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      <PartModelDrawer
        designId={sessionId}
        mpn={modelDrawerMpn ?? ''}
        isOpen={modelDrawerMpn !== null}
        onClose={() => setModelDrawerMpn(null)}
      />
    </div>
  );
}
