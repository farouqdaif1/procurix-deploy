import { useState, useEffect, useRef } from 'react';
import type { Component } from '@/app/types';
import type { PartDetail, PartCandidate } from '@/app/services/api';
import { CheckCircle, Cpu, Zap, AlertCircle, Loader2, Search, X, ArrowRight, RotateCcw, ExternalLink, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { classifyPartsStream, selectPartMatch, getClassification, bulkUpdateClassification } from '@/app/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'research' | 'selection' | 'classify';

interface StreamLine {
  id: string;
  mpn?: string;
  icon: 'spin' | 'check' | 'miss' | 'cached' | 'classify';
  text: string;
  meta?: string;   // category · manufacturer
  source?: string; // nexar / tavily / cache
  multiMatch?: boolean;
}

interface FundamentalClassificationViewProps {
  components: Component[];
  onClassificationComplete: (classifiedComponents: Component[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function srcBadge(source: string | undefined | null) {
  if (!source || source === 'unknown') return null;
  const styles: Record<string, string> = {
    nexar: 'bg-blue-50 text-blue-600 border-blue-200',
    nexar_confirmed: 'bg-green-50 text-green-600 border-green-200',
    tavily: 'bg-purple-50 text-purple-600 border-purple-200',
    cache: 'bg-gray-50 text-gray-500 border-gray-200',
    combined: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };
  const label: Record<string, string> = {
    nexar: 'nexar', nexar_confirmed: 'confirmed', tavily: 'tavily',
    cache: 'cached', combined: 'nexar+web',
  };
  const cls = styles[source] ?? styles.cache;
  return (
    <span className={`inline-block border text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {label[source] ?? source}
    </span>
  );
}

// ── Phase 1: Research terminal ─────────────────────────────────────────────────

function ResearchPhase({ sessionId, onComplete, setCurrentStage }: {
  sessionId: string;
  onComplete: (result: PartDetail[]) => void;
  setCurrentStage: (s: number | null) => void;
}) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const push = (line: StreamLine) =>
    setLines(prev => [...prev, line]);
  const replace = (id: string, update: Partial<StreamLine>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...update } : l));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    classifyPartsStream(
      sessionId,
      (event) => {
        if (event.type === 'start') {
          setTotal(event.total);
          push({ id: 'start', icon: 'classify', text: event.message });
        } else if (event.type === 'searching') {
          push({ id: event.mpn, icon: 'spin', text: `Looking up`, mpn: event.mpn });
        } else if (event.type === 'found' || event.type === 'cached') {
          const meta = [event.category, event.candidates?.[0]?.manufacturer].filter(Boolean).join(' · ');
          const multi = (event.candidates?.length ?? 0) > 1 && !event.candidates?.[0]?.is_exact_match;
          replace(event.type === 'cached' ? event.mpn : event.mpn, {
            icon: multi ? 'miss' : 'check',
            text: multi ? `${event.candidates!.length} candidates — review needed` : (event.category || 'found'),
            meta,
            source: event.source,
            multiMatch: multi,
          });
        } else if (event.type === 'not_found') {
          replace(event.mpn, { icon: 'miss', text: 'not found in Nexar', source: undefined });
        } else if (event.type === 'classifying') {
          push({ id: 'classifying', icon: 'classify', text: event.message });
        } else if (event.type === 'complete') {
          push({ id: 'done', icon: 'check', text: `Done — ${event.result.non_auxiliary_parts} fundamental, ${event.result.auxiliary_parts} auxiliary` });
          setDone(true);
          setTimeout(() => onComplete(event.result.parts ?? []), 600);
        } else if (event.type === 'error') {
          setError(event.message);
        }
      },
      setCurrentStage,
    ).catch(e => setError(String(e)));
  }, []);

  const iconEl = (icon: StreamLine['icon']) => {
    if (icon === 'spin') return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />;
    if (icon === 'check') return <span className="text-green-500 shrink-0 font-bold text-xs">✓</span>;
    if (icon === 'miss') return <span className="text-yellow-500 shrink-0 font-bold text-xs">?</span>;
    if (icon === 'cached') return <span className="text-blue-400 shrink-0 font-bold text-xs">↩</span>;
    return <span className="text-gray-400 shrink-0 text-xs">·</span>;
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-mono text-sm">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-gray-300 text-xs font-semibold tracking-wide">PART RESEARCH</span>
        {total > 0 && (
          <span className="text-gray-500 text-xs">{Math.min(lines.filter(l => l.mpn).length, total)} / {total}</span>
        )}
      </div>

      {/* Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
        <AnimatePresence initial={false}>
          {lines.map(line => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.08 }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 w-4 flex justify-center">{iconEl(line.icon)}</div>
              <div className="flex-1 min-w-0">
                {line.mpn && (
                  <span className="text-blue-400 font-medium mr-2">{line.mpn}</span>
                )}
                <span className={line.icon === 'check' ? 'text-gray-200' : line.icon === 'miss' ? 'text-yellow-400' : 'text-gray-400'}>
                  {line.text}
                </span>
                {line.meta && <span className="text-gray-600 ml-2 text-xs">{line.meta}</span>}
                {line.source && <span className="ml-2">{srcBadge(line.source)}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {error && (
          <div className="text-red-400 text-xs mt-2 border border-red-800 rounded px-3 py-2 bg-red-950/40">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Progress bar */}
      {total > 0 && !done && (
        <div className="shrink-0 px-6 pb-4">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              animate={{ width: `${(lines.filter(l => l.mpn).length / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Phase 2: MPN Selection ─────────────────────────────────────────────────────

function SelectionPhase({ parts, onComplete }: {
  parts: PartDetail[];
  onComplete: (parts: PartDetail[]) => void;
}) {
  const { sessionId } = useSession();
  // Only show parts that have multiple candidates AND no exact match
  const needsSelection = parts.filter(
    p => (p.candidates?.length ?? 0) > 1 && !p.candidates?.[0]?.is_exact_match
  );

  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    needsSelection.forEach(p => { m[p.part_number] = 0; });
    return m;
  });
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      for (const p of needsSelection) {
        const idx = selections[p.part_number] ?? 0;
        const candidate = p.candidates[idx];
        await selectPartMatch(sessionId, p.part_number, candidate);
      }
      // Merge selections back into parts
      const updated = parts.map(p => {
        const idx = selections[p.part_number];
        if (idx === undefined) return p;
        const c = p.candidates[idx];
        return { ...p, category: c.category, description: c.description, manufacturer: c.manufacturer, confidence: c.confidence };
      });
      onComplete(updated);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (needsSelection.length === 0) {
    onComplete(parts);
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="shrink-0 px-8 py-5 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-900">Confirm Part Matches</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {needsSelection.length} part{needsSelection.length !== 1 ? 's' : ''} with ambiguous Nexar results — pick the correct match.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {needsSelection.map(part => (
          <div key={part.part_number} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono font-bold text-gray-900">{part.part_number}</span>
              <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                {part.candidates.length} matches
              </span>
            </div>
            <div className="grid gap-2">
              {part.candidates.map((c, i) => (
                <button
                  key={c.mpn}
                  onClick={() => setSelections(prev => ({ ...prev, [part.part_number]: i }))}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    selections[part.part_number] === i
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-gray-900">{c.mpn}</div>
                      {c.category && <div className="text-xs text-gray-600 mt-0.5">{c.category}</div>}
                      {c.description && <div className="text-xs text-gray-400 truncate mt-0.5">{c.description}</div>}
                      {c.manufacturer && <div className="text-xs text-gray-500 mt-1">{c.manufacturer}</div>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {c.is_exact_match && (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">exact</span>
                      )}
                      {c.datasheet_url && (
                        <a href={c.datasheet_url} target="_blank" rel="noopener noreferrer"
                           onClick={e => e.stopPropagation()}
                           className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-3 w-3" /> datasheet
                        </a>
                      )}
                      {selections[part.part_number] === i && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 px-8 py-4 border-t bg-white">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Confirm Selections</>}
        </button>
      </div>
    </div>
  );
}

// ── Phase 3: Classify (fundamental / auxiliary) ────────────────────────────────

function ClassifyPhase({ initialParts, onComplete }: {
  initialParts: PartDetail[];
  onComplete: (components: Component[]) => void;
}) {
  const { sessionId, setCurrentStage } = useSession();

  const toComponent = (p: PartDetail, index: number): Component => ({
    id: `comp-${p.part_number}-${index}`,
    reference: p.part_number,
    partNumber: p.part_number,
    manufacturer: p.manufacturer ?? undefined,
    description: p.description || p.part_number,
    type: p.category || 'IC',
    isFundamental: p.classification == null ? undefined : p.classification === 'non-auxiliary',
    isIdentified: p.confidence >= 0.8,
    isGeneric: false,
    complianceStatus: 'unknown' as const,
    specs: {
      category: p.category,
      source: p.source,
      confidence: p.confidence,
      needs_review: p.needs_review,
      datasheet_url: p.datasheet_url,
      candidates: p.candidates,
    },
  });

  const [localComponents, setLocalComponents] = useState<Component[]>(() =>
    initialParts.map(toComponent)
  );
  const [partDetailMap] = useState<Record<string, PartDetail>>(() => {
    const m: Record<string, PartDetail> = {};
    initialParts.forEach(p => { m[p.part_number] = p; });
    return m;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const originalRef = useRef<Record<string, 'auxiliary' | 'non-auxiliary' | null>>({});

  useEffect(() => {
    initialParts.forEach(p => {
      originalRef.current[p.part_number] = p.classification ?? null;
    });
  }, []);

  const fundamentalComponents = localComponents.filter(c => c.isFundamental === true);
  const auxiliaryComponents = localComponents.filter(c => c.isFundamental === false);
  const unclassified = localComponents.filter(c => c.isFundamental === undefined);

  const filterComps = (comps: Component[]) => {
    if (!searchQuery.trim()) return comps;
    const q = searchQuery.toLowerCase();
    return comps.filter(c =>
      (c.partNumber || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.type || '').toLowerCase().includes(q)
    );
  };

  const handleMove = (id: string, isFundamental: boolean) => {
    setLocalComponents(prev => prev.map(c => c.id === id ? { ...c, isFundamental } : c));
  };

  const getPendingChanges = () =>
    localComponents.flatMap(c => {
      if (!c.partNumber) return [];
      const orig = originalRef.current[c.partNumber];
      const curr: 'auxiliary' | 'non-auxiliary' | null = c.isFundamental === true ? 'non-auxiliary' : c.isFundamental === false ? 'auxiliary' : null;
      if (curr !== null && curr !== orig) return [{ mpn: c.partNumber, new_classification: curr }];
      return [];
    });

  const handleApply = async () => {
    if (!sessionId) return;
    const changes = getPendingChanges();
    if (changes.length === 0) { onComplete(localComponents); return; }
    setIsApplying(true);
    try {
      await bulkUpdateClassification(sessionId, changes, setCurrentStage);
      changes.forEach(ch => { originalRef.current[ch.mpn] = ch.new_classification; });
      toast.success(`Applied ${changes.length} change${changes.length !== 1 ? 's' : ''}`);
      onComplete(localComponents);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsApplying(false);
    }
  };

  const PartCard = ({ comp, side }: { comp: Component; side: 'fund' | 'aux' }) => {
    const detail = comp.partNumber ? partDetailMap[comp.partNumber] : null;
    const [expanded, setExpanded] = useState(false);
    const hasCandidates = (detail?.candidates?.length ?? 0) > 1;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`rounded-lg border p-2.5 bg-white transition-all group cursor-pointer ${
          side === 'fund' ? 'border-blue-200 hover:border-blue-400' : 'border-gray-200 hover:border-gray-400'
        }`}
        onClick={() => handleMove(comp.id, side === 'aux')}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-mono text-xs font-semibold ${side === 'fund' ? 'text-blue-800' : 'text-gray-700'}`}>
                {comp.partNumber}
              </span>
              {detail && srcBadge(detail.source)}
              {hasCandidates && (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  className="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 hover:bg-yellow-100"
                >
                  {detail!.candidates.length} matches <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            {detail?.category && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{detail.category}</div>}
            {detail?.description && detail.description !== comp.partNumber && (
              <div className="text-[11px] text-gray-400 truncate">{detail.description}</div>
            )}
            {detail?.needs_review && (
              <span className="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                needs review
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5">
            {side === 'fund' ? '→ aux' : '→ fund'}
          </span>
        </div>

        {/* Candidate list (expandable) */}
        {expanded && hasCandidates && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1" onClick={e => e.stopPropagation()}>
            {detail!.candidates.map((c, i) => (
              <div key={c.mpn} className={`text-[11px] rounded px-2 py-1 ${i === 0 ? 'bg-blue-50 text-blue-800' : 'text-gray-600'}`}>
                <span className="font-mono font-medium">{c.mpn}</span>
                {c.category && <span className="text-gray-500 ml-1">· {c.category}</span>}
                {c.is_exact_match && <span className="ml-1 text-green-600">✓ exact</span>}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const pending = getPendingChanges();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 bg-white border-b flex items-center gap-4">
        <div className="flex gap-4 text-sm">
          <span className="text-blue-600 font-semibold">{fundamentalComponents.length} fundamental</span>
          <span className="text-gray-500">{auxiliaryComponents.length} auxiliary</span>
          {unclassified.length > 0 && <span className="text-yellow-600">{unclassified.length} unclassified</span>}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search parts…"
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Two-pane */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Fundamental */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm text-blue-900">Fundamental</span>
            <span className="ml-auto text-blue-600 font-bold text-sm">{fundamentalComponents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filterComps(fundamentalComponents).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                <Cpu className="h-8 w-8 mb-2 text-gray-300" />
                Click auxiliary parts to move here
              </div>
            ) : (
              filterComps(fundamentalComponents).map(comp => (
                <PartCard key={comp.id} comp={comp} side="fund" />
              ))
            )}
          </div>
        </div>

        {/* Auxiliary */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-sm text-gray-700">Auxiliary</span>
            <span className="ml-auto text-gray-600 font-bold text-sm">{auxiliaryComponents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filterComps(auxiliaryComponents).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                <Zap className="h-8 w-8 mb-2 text-gray-300" />
                Click fundamental parts to move here
              </div>
            ) : (
              filterComps(auxiliaryComponents).map(comp => (
                <PartCard key={comp.id} comp={comp} side="aux" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-3 border-t bg-white">
        {unclassified.length > 0 ? (
          <button disabled className="w-full rounded-lg bg-gray-200 py-2 text-gray-500 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Classify {unclassified.length} remaining part{unclassified.length !== 1 ? 's' : ''} first
          </button>
        ) : pending.length > 0 ? (
          <div className="flex gap-3">
            <button
              onClick={() => setLocalComponents(prev => prev.map(c => {
                const orig = c.partNumber ? originalRef.current[c.partNumber] : null;
                return { ...c, isFundamental: orig === null ? undefined : orig === 'non-auxiliary' };
              }))}
              disabled={isApplying}
              className="flex-1 rounded-lg bg-gray-100 py-2 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="flex-2 flex-[2] rounded-lg bg-blue-600 py-2 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isApplying ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</> : <><CheckCircle className="h-4 w-4" /> Apply {pending.length} change{pending.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        ) : (
          <button
            onClick={() => onComplete(localComponents)}
            className="w-full rounded-lg bg-green-600 py-2 text-white text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            Proceed to Validation <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FundamentalClassificationView({
  components: _components,
  onClassificationComplete,
}: FundamentalClassificationViewProps) {
  const { sessionId, setCurrentStage, refreshTrigger } = useSession();
  const [phase, setPhase] = useState<Phase>('research');
  const [enrichedParts, setEnrichedParts] = useState<PartDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  // If session already has classification data (navigating back), skip research
  useEffect(() => {
    if (!sessionId) return;
    // Check if classification already done by fetching GET endpoint
    getClassification(sessionId)
      .then(result => {
        const allNull = Object.values(result.classification_map).every(v => v === null);
        if (!allNull && result.parts?.length) {
          // Already classified — jump to classify phase
          setEnrichedParts(result.parts);
          setPhase('classify');
        }
        // Otherwise stay on research phase (will run stream)
      })
      .catch(() => {
        // 404 or error — start fresh with research
      });
  }, [sessionId, refreshTrigger]);

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No session. Please upload a BOM first.</p>
      </div>
    );
  }

  if (phase === 'research') {
    return (
      <ResearchPhase
        sessionId={sessionId}
        setCurrentStage={setCurrentStage}
        onComplete={parts => {
          setEnrichedParts(parts);
          // Check if any parts need selection
          const needsSel = parts.some(p => (p.candidates?.length ?? 0) > 1 && !p.candidates?.[0]?.is_exact_match);
          setPhase(needsSel ? 'selection' : 'classify');
        }}
      />
    );
  }

  if (phase === 'selection') {
    return (
      <SelectionPhase
        parts={enrichedParts}
        onComplete={updated => {
          setEnrichedParts(updated);
          setPhase('classify');
        }}
      />
    );
  }

  return (
    <ClassifyPhase
      initialParts={enrichedParts}
      onComplete={onClassificationComplete}
    />
  );
}
