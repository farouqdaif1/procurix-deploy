/**
 * ChatConsolePage — full-page agent chat console.
 *
 * Left:  monospace terminal — streaming token output, scrollable history, input row.
 * Right: design context panel — FSM state, system type, part counts, subsystems.
 *
 * Layout mirrors AnalysisView so the UX language is consistent.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, Cpu, Database, Layers, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/app/context/SessionContext';
import {
    chatStream,
    getChatHistory,
    getSystemAnalysis,
    getClassification,
    getCurrentStage,
    type ChatHistoryMessage,
} from '@/app/services/api';
import { PAGE_CONTEXT_LABELS } from '@/app/shared/components/ChatDrawer';

// ── Types ────────────────────────────────────────────────────────────────────

interface Line {
    id: string;
    type: 'input' | 'output' | 'system' | 'error';
    content: string;
}

interface DesignContext {
    fsmState: string | null;
    stageName: string | null;
    systemType: string | null;
    totalParts: number;
    nonAuxCount: number;
    auxCount: number;
    subsystems: string[];
}

// ── FSM state → human label ──────────────────────────────────────────────────

const FSM_LABELS: Record<string, string> = {
    empty: 'No BOM uploaded',
    bom_uploaded: 'BOM uploaded',
    parts_identified: 'Parts identified',
    analyzed: 'System analyzed',
    system_type_confirmed: 'System type confirmed',
    classified: 'Parts classified',
    validated: 'Parts validated',
    connections_built: 'Connections mapped',
    requirements_generated: 'Requirements generated',
    subsystems_generated: 'Subsystems grouped',
    subsystem_requirements_generated: 'Ready for optimisation',
    ready_for_optimisation: 'Ready for optimisation',
    optimising: 'Optimising',
    optimised: 'Optimised',
};

// ── Component ────────────────────────────────────────────────────────────────

export function ChatConsolePage() {
    const { sessionId, refreshTrigger } = useSession();

    const [lines, setLines] = useState<Line[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ctx, setCtx] = useState<DesignContext>({
        fsmState: null,
        stageName: null,
        systemType: null,
        totalParts: 0,
        nonAuxCount: 0,
        auxCount: 0,
        subsystems: [],
    });
    const [ctxLoading, setCtxLoading] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyLoadedRef = useRef(false);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const newLine = useCallback((type: Line['type'], content: string) => {
        setLines(prev => [
            ...prev,
            { id: `${Date.now()}_${Math.random()}`, type, content },
        ]);
    }, []);

    // ── Auto-scroll ──────────────────────────────────────────────────────────

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines, loading]);

    // ── Load history on mount ────────────────────────────────────────────────

    useEffect(() => {
        if (!sessionId || historyLoadedRef.current) return;
        historyLoadedRef.current = true;

        getChatHistory(sessionId, 50)
            .then(({ messages }) => {
                if (!messages.length) {
                    newLine('system', 'No prior conversation — type a message to start.');
                    return;
                }
                newLine('system', `Loaded ${messages.length} previous messages.`);
                messages.forEach((m: ChatHistoryMessage) => {
                    newLine(m.role === 'user' ? 'input' : 'output', m.content);
                });
            })
            .catch(() => {
                newLine('system', 'Start a conversation below.');
            });
    }, [sessionId, newLine]);

    // ── Load design context ──────────────────────────────────────────────────

    const loadContext = useCallback(async () => {
        if (!sessionId) return;
        setCtxLoading(true);
        try {
            const [stageRes, analysisRes, classRes] = await Promise.allSettled([
                getCurrentStage(sessionId),
                getSystemAnalysis(sessionId),
                getClassification(sessionId),
            ]);

            const stageData = stageRes.status === 'fulfilled' ? stageRes.value : null;
            const stageNum = stageData?.stage ?? null;
            const stageLabelFromAPI = stageData?.stage_name ?? null;

            let fsmState: string | null = null;
            let systemType: string | null = null;
            if (analysisRes.status === 'fulfilled' && analysisRes.value?.success) {
                systemType = analysisRes.value.suggestions?.[0]?.systemType ?? null;
            }

            let totalParts = 0, nonAuxCount = 0, auxCount = 0;
            let subsystems: string[] = [];
            if (classRes.status === 'fulfilled' && classRes.value) {
                const c = classRes.value;
                totalParts = c.total_parts ?? 0;
                nonAuxCount = c.non_auxiliary_parts ?? 0;
                auxCount = c.auxiliary_parts ?? 0;
                // Extract unique subsystem ids from parts array if present
                const parts = c.parts ?? [];
                const subSet = new Set<string>();
                parts.forEach((p: any) => { if (p.subsystem_id) subSet.add(p.subsystem_id); });
                subsystems = Array.from(subSet);
            }

            // FSM state from stage number as fallback
            const stageFsmMap: Record<number, string> = {
                1: 'empty', 2: 'bom_uploaded', 3: 'parts_identified',
                4: 'analyzed', 5: 'system_type_confirmed', 6: 'classified',
                7: 'validated', 8: 'connections_built', 9: 'requirements_generated',
                10: 'subsystem_requirements_generated',
            };
            if (!fsmState && stageNum) fsmState = stageFsmMap[stageNum] ?? null;

            setCtx({
                fsmState,
                stageName: stageLabelFromAPI ?? (fsmState ? (FSM_LABELS[fsmState] ?? fsmState) : null),
                systemType,
                totalParts,
                nonAuxCount,
                auxCount,
                subsystems,
            });
        } catch { /* ignore */ } finally {
            setCtxLoading(false);
        }
    }, [sessionId]);

    useEffect(() => { loadContext(); }, [loadContext, refreshTrigger]);

    // ── Send message ─────────────────────────────────────────────────────────

    const send = async () => {
        const text = input.trim();
        if (!text || loading || !sessionId) return;

        newLine('input', text);
        setInput('');
        setLoading(true);

        let replyBuf = '';

        try {
            // Append tokens to a single "output" line as they arrive
            const lineId = `reply_${Date.now()}`;
            setLines(prev => [...prev, { id: lineId, type: 'output', content: '' }]);

            const pageContext = PAGE_CONTEXT_LABELS['/chat'];
            await chatStream(sessionId, text, (evt) => {
                if (evt.type === 'token') {
                    replyBuf += evt.content;
                    setLines(prev =>
                        prev.map(l => l.id === lineId ? { ...l, content: replyBuf } : l)
                    );
                } else if (evt.type === 'error') {
                    setLines(prev =>
                        prev.map(l => l.id === lineId ? { ...l, type: 'error', content: evt.message } : l)
                    );
                }
                // 'done' — nothing extra needed, reply already streamed
            }, pageContext);

            // Refresh context after agent may have advanced state
            loadContext();
        } catch (err: any) {
            newLine('error', `Error: ${err.message}`);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); send(); }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex overflow-hidden bg-gray-50">

            {/* ── Left: console ───────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 bg-white">

                {/* Header */}
                <div className="shrink-0 px-6 py-3 border-b border-gray-100 bg-white">
                    <h2 className="font-semibold text-gray-900 text-sm">Agent Console</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                        session · {sessionId?.slice(0, 8) ?? '—'}
                        {ctx.fsmState && (
                            <span className="ml-2 text-blue-400">· {ctx.fsmState}</span>
                        )}
                    </p>
                </div>

                {/* Output stream */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2 font-mono text-sm">
                    {lines.length === 0 && !loading && (
                        <span className="text-gray-300 text-xs">loading history…</span>
                    )}

                    <AnimatePresence initial={false}>
                        {lines.map(line => (
                            <motion.div
                                key={line.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.1 }}
                                className="leading-relaxed"
                            >
                                {line.type === 'input' && (
                                    <div className="flex gap-2">
                                        <span className="text-blue-500 select-none shrink-0">❯</span>
                                        <span className="text-gray-800">{line.content}</span>
                                    </div>
                                )}
                                {line.type === 'output' && (
                                    <div className="text-gray-600 whitespace-pre-wrap pl-5">
                                        {line.content}
                                        {loading && line.id.startsWith('reply_') && (
                                            <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 animate-pulse align-middle" />
                                        )}
                                    </div>
                                )}
                                {line.type === 'system' && (
                                    <div className="text-blue-500 pl-5 text-xs">{line.content}</div>
                                )}
                                {line.type === 'error' && (
                                    <div className="text-red-500 pl-5">{line.content}</div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && lines[lines.length - 1]?.type !== 'output' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="pl-5 flex items-center gap-2 text-gray-400"
                        >
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">thinking…</span>
                        </motion.div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input row */}
                <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 font-mono text-sm select-none">❯</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={sessionId ? 'Ask the agent anything about this design…' : 'No active session'}
                            disabled={loading || !sessionId}
                            className="flex-1 bg-transparent font-mono text-sm text-gray-800 placeholder-gray-300 outline-none caret-blue-500 disabled:opacity-40"
                        />
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-300 font-mono mt-1.5 pl-5">enter to send</p>
                </div>
            </div>

            {/* ── Right: context panel ─────────────────────────────────────── */}
            <div className="w-[380px] shrink-0 flex flex-col overflow-hidden bg-gray-50">

                {/* Panel header */}
                <div className="shrink-0 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Design Context</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Live snapshot of current design state</p>
                    </div>
                    <button
                        onClick={loadContext}
                        disabled={ctxLoading}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                        title="Refresh context"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${ctxLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Context cards */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

                    {/* Pipeline state */}
                    <ContextCard icon={<CheckCircle className="h-4 w-4 text-blue-500" />} title="Pipeline State">
                        {ctx.stageName ? (
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-800">{ctx.stageName}</p>
                                {ctx.fsmState && (
                                    <p className="text-xs font-mono text-gray-400">{ctx.fsmState}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Unknown</p>
                        )}
                    </ContextCard>

                    {/* System type */}
                    <ContextCard icon={<Cpu className="h-4 w-4 text-purple-500" />} title="System Type">
                        {ctx.systemType ? (
                            <p className="text-sm font-medium text-gray-800">{ctx.systemType}</p>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Not yet identified</p>
                        )}
                    </ContextCard>

                    {/* Parts */}
                    <ContextCard icon={<Database className="h-4 w-4 text-green-500" />} title="Bill of Materials">
                        {ctx.totalParts > 0 ? (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total parts</span>
                                    <span className="font-mono font-medium text-gray-800">{ctx.totalParts}</span>
                                </div>
                                {ctx.nonAuxCount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Non-auxiliary</span>
                                        <span className="font-mono font-medium text-gray-800">{ctx.nonAuxCount}</span>
                                    </div>
                                )}
                                {ctx.auxCount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Auxiliary</span>
                                        <span className="font-mono text-gray-500">{ctx.auxCount}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No BOM loaded</p>
                        )}
                    </ContextCard>

                    {/* Subsystems */}
                    {ctx.subsystems.length > 0 && (
                        <ContextCard icon={<Layers className="h-4 w-4 text-orange-500" />} title="Subsystems">
                            <div className="flex flex-wrap gap-1.5">
                                {ctx.subsystems.map(s => (
                                    <span
                                        key={s}
                                        className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-xs font-mono"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </ContextCard>
                    )}

                    {/* Tip */}
                    <div className="px-3 py-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-600 leading-relaxed">
                            The agent is aware of the current pipeline state. Ask it to explain requirements, compare components, or walk through compliance issues.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── ContextCard helper ────────────────────────────────────────────────────────

function ContextCard({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
            </div>
            {children}
        </div>
    );
}
