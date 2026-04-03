/**
 * Part Identification View
 *
 * Phase 1 — Research: streams identify-parts/stream, shows terminal-style log.
 * Phase 2 — Review: shows ALL parts (identified + needs-action) for explicit
 *            user approval before proceeding to System Identification.
 */

import { useState, useEffect, useRef } from 'react';
import type { PartCandidate } from '@/app/services/api';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  ExternalLink,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import {
  identifyPartsStream,
  selectPartMatch,
  confirmWebPart,
  saveCustomPart,
  suggestPartFields,
} from '@/app/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StreamLine {
  id: string;
  mpn?: string;
  icon: 'spin' | 'check' | 'miss' | 'web';
  text: string;
  meta?: string;
  source?: string;
}

/** A part that was cleanly identified (exact_match or cache hit). */
interface IdentifiedPart {
  mpn: string;
  status: 'exact_match';
  category?: string | null;
  description?: string | null;
  datasheet_url?: string | null;
  product_url?: string | null;
  source?: string;
  confidence?: string;
  candidates?: PartCandidate[];
  impact_level?: 'low' | 'high';
}

/** A part that needs user action (multi_match / web_found / not_found). */
interface ActionPart {
  mpn: string;
  status: 'multi_match' | 'web_found' | 'not_found';
  description?: string | null;
  datasheet_url?: string | null;
  product_url?: string | null;
  source?: string;
  confidence?: string;
  candidates?: PartCandidate[];
}

export interface PartIdentificationViewProps {
  onComplete: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function srcBadge(source: string | undefined | null) {
  if (!source || source === 'unknown') return null;
  const styles: Record<string, string> = {
    nexar: 'bg-blue-50 text-blue-600 border-blue-200',
    nexar_confirmed: 'bg-green-50 text-green-600 border-green-200',
    cache: 'bg-gray-50 text-gray-500 border-gray-200',
    web: 'bg-purple-50 text-purple-600 border-purple-200',
    web_broad: 'bg-orange-50 text-orange-600 border-orange-200',
    web_confirmed: 'bg-teal-50 text-teal-600 border-teal-200',
    user_provided: 'bg-green-50 text-green-700 border-green-300',
  };
  const label: Record<string, string> = {
    nexar: 'nexar', nexar_confirmed: 'confirmed', cache: 'cached',
    web: 'web', web_broad: 'ai search', web_confirmed: 'web ✓', user_provided: 'manual',
  };
  const cls = styles[source] ?? styles.cache;
  return (
    <span className={`inline-block border text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {label[source] ?? source}
    </span>
  );
}

// ── Phase 1: Research terminal ─────────────────────────────────────────────────

function ResearchPhase({
  sessionId,
  onComplete,
  setCurrentStage,
}: {
  sessionId: string;
  onComplete: (identified: IdentifiedPart[], needsAction: ActionPart[]) => void;
  setCurrentStage: (s: number | null) => void;
}) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const identifiedRef = useRef<IdentifiedPart[]>([]);
  const needsActionRef = useRef<ActionPart[]>([]);

  const push = (line: StreamLine) => setLines(prev => [...prev, line]);
  const replace = (id: string, update: Partial<StreamLine>) =>
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...update } : l)));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    identifyPartsStream(
      sessionId,
      (event) => {
        if (event.type === 'start') {
          setTotal(event.total);
          push({ id: 'start', icon: 'check', text: event.message });
        } else if (event.type === 'searching') {
          push({ id: event.mpn, icon: 'spin', text: 'Looking up', mpn: event.mpn });
        } else if (event.type === 'exact_match') {
          const meta = [event.category, event.candidates?.[0]?.manufacturer]
            .filter(Boolean).join(' · ');
          replace(event.mpn, {
            icon: 'check',
            text: event.category || 'identified',
            meta,
            source: event.source,
          });
          identifiedRef.current.push({
            mpn: event.mpn,
            status: 'exact_match',
            category: event.category,
            description: event.description,
            datasheet_url: event.datasheet_url,
            source: event.source,
            confidence: event.confidence,
            candidates: event.candidates,
            impact_level: event.impact_level,
          });
        } else if (event.type === 'multi_match') {
          replace(event.mpn, {
            icon: 'miss',
            text: `${event.candidate_count} candidates — pick one`,
            source: event.source,
          });
          needsActionRef.current.push({
            mpn: event.mpn,
            status: 'multi_match',
            source: event.source,
            candidates: event.candidates,
          });
        } else if (event.type === 'web_found') {
          replace(event.mpn, {
            icon: 'web',
            text: event.datasheet_url ? 'datasheet found — confirm' : 'web reference — confirm',
            source: event.source,
          });
          needsActionRef.current.push({
            mpn: event.mpn,
            status: 'web_found',
            description: event.description,
            datasheet_url: event.datasheet_url,
            product_url: event.product_url,
            confidence: event.confidence,
            source: event.source,
          });
        } else if (event.type === 'not_found') {
          replace(event.mpn, { icon: 'miss', text: 'not found — add manually' });
          needsActionRef.current.push({ mpn: event.mpn, status: 'not_found' });
        } else if (event.type === 'complete') {
          const idCount = identifiedRef.current.length;
          const actCount = needsActionRef.current.length;
          push({
            id: 'done',
            icon: 'check',
            text: `Done — ${idCount} identified, ${actCount} need review`,
          });
          setDone(true);
          setTimeout(
            () => onComplete(identifiedRef.current, needsActionRef.current),
            600,
          );
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
    if (icon === 'web') return <span className="text-purple-400 shrink-0 font-bold text-xs">⌂</span>;
    return <span className="text-gray-400 shrink-0 text-xs">·</span>;
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-mono text-sm">
      <div className="shrink-0 px-6 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-gray-300 text-xs font-semibold tracking-wide">PART IDENTIFICATION</span>
        {total > 0 && (
          <span className="text-gray-500 text-xs">
            {Math.min(lines.filter(l => l.mpn).length, total)} / {total}
          </span>
        )}
      </div>

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
                <span className={
                  line.icon === 'check' ? 'text-gray-200'
                  : line.icon === 'miss' ? 'text-yellow-400'
                  : 'text-gray-400'
                }>
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

// ── Phase 2: Review — all parts, explicit approval ────────────────────────────

function ReviewPhase({
  identified,
  needsAction,
  onComplete,
}: {
  identified: IdentifiedPart[];
  needsAction: ActionPart[];
  onComplete: () => void;
}) {
  const { sessionId } = useSession();

  // ── Identified parts state (allow switching candidate) ──
  // expandedId: which identified part card is open
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // override: user chose a different candidate for an identified part
  const [identifiedOverrides, setIdentifiedOverrides] = useState<Record<string, number>>({});

  // ── Multi-match state ──
  const [multiSel, setMultiSel] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      needsAction.filter(a => a.status === 'multi_match').map(a => [a.mpn, 0])
    )
  );

  // ── Web-found state ──
  const [webSel, setWebSel] = useState<Record<string, 'confirmed' | 'skipped' | null>>(() =>
    Object.fromEntries(
      needsAction.filter(a => a.status === 'web_found').map(a => [a.mpn, null])
    )
  );

  // ── Not-found custom forms ──
  interface CustomFields {
    description: string; manufacturer: string; category: string;
    datasheet_url: string; extraFields: Record<string, string>;
    suggestedFields: string[]; loadingFields: boolean;
  }
  const [customForms, setCustomForms] = useState<Record<string, CustomFields>>(() =>
    Object.fromEntries(
      needsAction.filter(a => a.status === 'not_found').map(a => [
        a.mpn,
        { description: '', manufacturer: '', category: '', datasheet_url: '',
          extraFields: {}, suggestedFields: [], loadingFields: false },
      ])
    )
  );

  const [saving, setSaving] = useState(false);

  const multiMatch = needsAction.filter(a => a.status === 'multi_match');
  const webFound   = needsAction.filter(a => a.status === 'web_found');
  const notFound   = needsAction.filter(a => a.status === 'not_found');

  // Validation: all web-found must be confirmed or skipped
  const webPending = webFound.filter(a => webSel[a.mpn] === null).length;
  const canProceed = webPending === 0;

  const loadSuggestedFields = async (mpn: string) => {
    if (!sessionId) return;
    setCustomForms(prev => ({ ...prev, [mpn]: { ...prev[mpn], loadingFields: true } }));
    const form = customForms[mpn];
    const fields = await suggestPartFields(sessionId, mpn, form.description || null, form.category || null);
    setCustomForms(prev => ({
      ...prev,
      [mpn]: {
        ...prev[mpn], loadingFields: false,
        suggestedFields: fields,
        extraFields: Object.fromEntries(fields.map(f => [f, ''])),
      },
    }));
  };

  const handleConfirm = async () => {
    if (!sessionId || !canProceed) return;
    setSaving(true);
    try {
      // Save multi-match selections (action-required)
      for (const a of multiMatch) {
        const candidates = a.candidates ?? [];
        const idx = multiSel[a.mpn] ?? 0;
        if (candidates[idx]) {
          await selectPartMatch(sessionId, a.mpn, candidates[idx]);
        }
      }
      // Save identified-part overrides (if user picked a different candidate)
      for (const p of identified) {
        const overrideIdx = identifiedOverrides[p.mpn];
        if (overrideIdx !== undefined && overrideIdx !== 0 && p.candidates?.[overrideIdx]) {
          await selectPartMatch(sessionId, p.mpn, p.candidates[overrideIdx]);
        }
      }
      // Save web-found confirmations
      for (const a of webFound) {
        if (webSel[a.mpn] === 'confirmed') {
          await confirmWebPart(
            sessionId, a.mpn,
            a.product_url ?? null, a.datasheet_url ?? null, a.description ?? null, null
          );
        }
      }
      // Save custom parts
      for (const a of notFound) {
        const form = customForms[a.mpn];
        const hasAny = form.description || form.manufacturer || form.category ||
          Object.values(form.extraFields).some(Boolean);
        if (hasAny) {
          await saveCustomPart(sessionId, a.mpn, {
            manufacturer: form.manufacturer || undefined,
            description: form.description || undefined,
            category: form.category || undefined,
            datasheet_url: form.datasheet_url || undefined,
            specs: Object.fromEntries(Object.entries(form.extraFields).filter(([, v]) => v)),
          });
        }
      }
      onComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalParts = identified.length + needsAction.length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <div className="shrink-0 px-8 py-5 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Part Identification Review</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review all {totalParts} parts before proceeding to System Identification.
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
              {identified.length} identified
            </span>
            {needsAction.length > 0 && (
              <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full font-medium">
                {needsAction.length} need review
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

        {/* ══ Section 1: Identified parts ══════════════════════════════════════ */}
        {identified.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Identified ({identified.length})
              <span className="text-xs text-gray-400 font-normal ml-1">
                — click to review or switch candidate
              </span>
            </h3>
            <div className="space-y-2">
              {identified.map(p => {
                const isOpen = expandedId === p.mpn;
                const selectedIdx = identifiedOverrides[p.mpn] ?? 0;
                const hasAlts = (p.candidates?.length ?? 0) > 1;

                return (
                  <div
                    key={p.mpn}
                    className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                      isOpen ? 'border-blue-300' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : p.mpn)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-gray-900 text-sm">{p.mpn}</span>
                        {srcBadge(identifiedOverrides[p.mpn] !== undefined
                          ? (p.candidates?.[identifiedOverrides[p.mpn]]?.mpn ? 'nexar_confirmed' : p.source)
                          : p.source)}
                        {p.category && (
                          <span className="text-xs text-gray-500">{p.category}</span>
                        )}
                        {p.description && p.description !== p.mpn && (
                          <span className="text-xs text-gray-400 truncate max-w-xs">{p.description}</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {hasAlts && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                            {p.candidates!.length} options
                          </span>
                        )}
                        {identifiedOverrides[p.mpn] !== undefined && (
                          <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                            changed
                          </span>
                        )}
                        {isOpen
                          ? <ChevronDown className="h-4 w-4 text-gray-400" />
                          : <ChevronRight className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                    </button>

                    {/* Expanded: show candidates to pick */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                        {p.datasheet_url && (
                          <a
                            href={p.datasheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mb-3"
                          >
                            <ExternalLink className="h-3 w-3" /> View datasheet
                          </a>
                        )}
                        {hasAlts ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-gray-500 mb-2">Select the correct match:</p>
                            {p.candidates!.map((c, i) => (
                              <button
                                key={c.mpn}
                                onClick={() => setIdentifiedOverrides(prev => ({ ...prev, [p.mpn]: i }))}
                                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                                  selectedIdx === i
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-mono text-xs font-semibold text-gray-900">{c.mpn}</div>
                                    {c.category && <div className="text-xs text-gray-500 mt-0.5">{c.category}</div>}
                                    {c.description && (
                                      <div className="text-xs text-gray-400 truncate">{c.description}</div>
                                    )}
                                    {c.manufacturer && (
                                      <div className="text-xs text-gray-400 mt-0.5">{c.manufacturer}</div>
                                    )}
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    {c.is_exact_match && (
                                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                                        exact
                                      </span>
                                    )}
                                    {i === 0 && (
                                      <span className="text-[10px] text-blue-600">
                                        auto-selected
                                      </span>
                                    )}
                                    {selectedIdx === i && (
                                      <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                                    )}
                                    {c.datasheet_url && (
                                      <a
                                        href={c.datasheet_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="text-[10px] text-blue-400 hover:underline"
                                      >
                                        datasheet
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            Single match — {p.candidates?.[0]?.manufacturer && (
                              <span>{p.candidates[0].manufacturer} · </span>
                            )}
                            conf: {parseFloat(p.confidence ?? '0').toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ Section 2: Multi-match — pick candidate ══════════════════════════ */}
        {multiMatch.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Multiple matches — select one ({multiMatch.length})
            </h3>
            <div className="space-y-4">
              {multiMatch.map(a => (
                <div key={a.mpn} className="bg-white border border-yellow-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono font-bold text-gray-900">{a.mpn}</span>
                    {srcBadge(a.source)}
                  </div>
                  <div className="space-y-1.5">
                    {(a.candidates ?? []).map((c, i) => (
                      <button
                        key={c.mpn}
                        onClick={() => setMultiSel(prev => ({ ...prev, [a.mpn]: i }))}
                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                          multiSel[a.mpn] === i
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-semibold text-gray-900">{c.mpn}</div>
                            {c.category && <div className="text-xs text-gray-600 mt-0.5">{c.category}</div>}
                            {c.description && (
                              <div className="text-xs text-gray-400 truncate">{c.description}</div>
                            )}
                            {c.manufacturer && (
                              <div className="text-xs text-gray-500 mt-1">{c.manufacturer}</div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {c.is_exact_match && (
                              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                                exact
                              </span>
                            )}
                            {c.datasheet_url && (
                              <a
                                href={c.datasheet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="h-3 w-3" /> datasheet
                              </a>
                            )}
                            {multiSel[a.mpn] === i && (
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
          </section>
        )}

        {/* ══ Section 3: Web-found — confirm reference ════════════════════════ */}
        {webFound.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-purple-500 font-bold text-base">⌂</span>
              Found via web — confirm or skip ({webFound.length})
            </h3>
            <div className="space-y-3">
              {webFound.map(a => (
                <div
                  key={a.mpn}
                  className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
                    webSel[a.mpn] === 'confirmed'
                      ? 'border-green-300'
                      : webSel[a.mpn] === 'skipped'
                      ? 'border-gray-200 opacity-60'
                      : 'border-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900">{a.mpn}</span>
                        {srcBadge(a.source)}
                        <span className="text-xs text-gray-400">
                          conf: {parseFloat(a.confidence ?? '0').toFixed(2)}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {a.datasheet_url && (
                          <a
                            href={a.datasheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded"
                          >
                            <ExternalLink className="h-3 w-3" /> Datasheet
                          </a>
                        )}
                        {a.product_url && (
                          <a
                            href={a.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-600 hover:underline flex items-center gap-0.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded"
                          >
                            <ExternalLink className="h-3 w-3" /> Product page
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setWebSel(prev => ({ ...prev, [a.mpn]: 'confirmed' }))}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          webSel[a.mpn] === 'confirmed'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                        }`}
                      >
                        {webSel[a.mpn] === 'confirmed' ? '✓ Confirmed' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setWebSel(prev => ({ ...prev, [a.mpn]: 'skipped' }))}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          webSel[a.mpn] === 'skipped'
                            ? 'bg-gray-400 text-white'
                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ Section 4: Not found — manual entry ════════════════════════════ */}
        {notFound.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Not found — enter specs manually or skip ({notFound.length})
            </h3>
            <div className="space-y-4">
              {notFound.map(a => {
                const form = customForms[a.mpn];
                return (
                  <div key={a.mpn} className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono font-bold text-gray-900">{a.mpn}</span>
                      <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        not found
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {(['description', 'manufacturer', 'category', 'datasheet_url'] as const).map(field => (
                        <div key={field} className={field === 'description' ? 'col-span-2' : ''}>
                          <label className="text-[11px] text-gray-500 mb-0.5 block capitalize">
                            {field.replace('_', ' ')}
                          </label>
                          <input
                            type="text"
                            value={form[field]}
                            onChange={e =>
                              setCustomForms(prev => ({
                                ...prev,
                                [a.mpn]: { ...prev[a.mpn], [field]: e.target.value },
                              }))
                            }
                            placeholder={field === 'datasheet_url' ? 'https://…' : `Enter ${field}`}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      ))}
                    </div>
                    {form.suggestedFields.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {form.suggestedFields.map(f => (
                          <div key={f}>
                            <label className="text-[11px] text-gray-500 mb-0.5 block">
                              {f.replace(/_/g, ' ')}
                            </label>
                            <input
                              type="text"
                              value={form.extraFields[f] ?? ''}
                              onChange={e =>
                                setCustomForms(prev => ({
                                  ...prev,
                                  [a.mpn]: {
                                    ...prev[a.mpn],
                                    extraFields: { ...prev[a.mpn].extraFields, [f]: e.target.value },
                                  },
                                }))
                              }
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => loadSuggestedFields(a.mpn)}
                      disabled={form.loadingFields}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {form.loadingFields
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Search className="h-3 w-3" />}
                      {form.suggestedFields.length > 0 ? 'Refresh AI suggestions' : 'Ask AI for spec fields'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-8 py-4 border-t bg-white">
        {!canProceed && (
          <p className="text-xs text-yellow-600 mb-2 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Confirm or skip all {webPending} web-found part{webPending !== 1 ? 's' : ''} to continue.
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={saving || !canProceed}
          className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><CheckCircle className="h-4 w-4" /> Approve All &amp; Continue to System ID <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PartIdentificationView({ onComplete }: PartIdentificationViewProps) {
  const { sessionId, setCurrentStage } = useSession();
  const [phase, setPhase] = useState<'research' | 'review'>('research');
  const [identified, setIdentified] = useState<IdentifiedPart[]>([]);
  const [needsAction, setNeedsAction] = useState<ActionPart[]>([]);
  // No skip-on-mount: always run the stream (backend serves cached results if already
  // identified). This lets users navigate back and review parts again.

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
        onComplete={(id, action) => {
          setIdentified(id);
          setNeedsAction(action);
          setPhase('review');
        }}
      />
    );
  }

  return (
    <ReviewPhase
      identified={identified}
      needsAction={needsAction}
      onComplete={onComplete}
    />
  );
}
