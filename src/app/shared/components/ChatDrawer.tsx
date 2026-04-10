/**
 * ChatDrawer — slide-over terminal console accessible from any pipeline stage.
 *
 * Triggered by the Chat button in Layout header.
 * Expand icon (↗) navigates to /chat for full-page view.
 *
 * Sends the current page label as `page_context` with every message so
 * the agent knows which stage the user is looking at.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/app/context/SessionContext';
import { chatStream, getChatHistory, type ChatHistoryMessage } from '@/app/services/api';

// ── Page context labels ───────────────────────────────────────────────────────
// Exported so ChatConsolePage can reuse the same map.

export const PAGE_CONTEXT_LABELS: Record<string, string> = {
    '/upload':
        'Upload page — user has not yet uploaded a BOM; this is the entry point of the pipeline',
    '/part-identification':
        'Part Identification page — BOM has been uploaded; the pipeline is identifying each part via Nexar/web search. ' +
        'User is reviewing identified parts, resolving unrecognised MPNs, and confirming the part list before system analysis.',
    '/system-identification':
        'System Identification page — parts have been identified; AI has analysed the BOM and suggested candidate system types ' +
        '(e.g. "Isolated Motor Driver"). User is reviewing AI suggestions and picking the correct system type to proceed.',
    '/classification':
        'Classification page — system type confirmed; user is classifying each part as auxiliary (passives, connectors) ' +
        'or non-auxiliary (active ICs, key components that drive requirements).',
    '/validate':
        'Part Review page — classification done; user is reviewing full enriched specifications for each part ' +
        '(datasheet data from Nexar). Non-auxiliary parts will drive requirements generation.',
    '/requirements':
        'Requirements page — parts validated; AI has generated system-level requirements from the BOM. ' +
        'User is reviewing, editing, or asking questions about individual requirements.',
    '/architecture':
        'Architecture page — user is viewing the system architecture diagram showing part connections and subsystem groupings.',
    '/subsystems':
        'Subsystems page — requirements generated; AI has grouped non-auxiliary parts into functional subsystems ' +
        '(e.g. Power Management, Motor Drive). User is reviewing subsystem groupings and subsystem-level requirements.',
    '/review':
        'Review page — pipeline nearly complete; user is doing a final review of all outputs before entering the optimisation phase.',
    '/chat':
        'Full-page chat console — user opened the expanded chat view to have a longer conversation with the agent.',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Line {
    id: string;
    type: 'input' | 'output' | 'system' | 'error';
    content: string;
}

interface ChatDrawerProps {
    open: boolean;
    onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
    const { sessionId }   = useSession();
    const location        = useLocation();
    const pageContext     = PAGE_CONTEXT_LABELS[location.pathname] ?? `Page: ${location.pathname}`;

    const [lines, setLines]     = useState<Line[]>([]);
    const [input, setInput]     = useState('');
    const [loading, setLoading] = useState(false);

    const bottomRef        = useRef<HTMLDivElement>(null);
    const inputRef         = useRef<HTMLInputElement>(null);
    const historyLoadedRef = useRef(false);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines, loading]);

    const newLine = useCallback((type: Line['type'], content: string) => {
        setLines(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, type, content }]);
    }, []);

    // Load history once when drawer first opens
    useEffect(() => {
        if (!open || !sessionId || historyLoadedRef.current) return;
        historyLoadedRef.current = true;

        getChatHistory(sessionId, 30)
            .then(({ messages }) => {
                if (!messages.length) {
                    newLine('system', 'No prior conversation — type to start.');
                    return;
                }
                messages.forEach((m: ChatHistoryMessage) => {
                    newLine(m.role === 'user' ? 'input' : 'output', m.content);
                });
            })
            .catch(() => newLine('system', 'Type a message to start.'));
    }, [open, sessionId, newLine]);

    // Focus input when drawer opens
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 120);
    }, [open]);

    // Send message — passes current page as context to the backend
    const send = async () => {
        const text = input.trim();
        if (!text || loading || !sessionId) return;

        newLine('input', text);
        setInput('');
        setLoading(true);

        const lineId = `reply_${Date.now()}`;
        setLines(prev => [...prev, { id: lineId, type: 'output', content: '' }]);

        try {
            await chatStream(
                sessionId,
                text,
                evt => {
                    if (evt.type === 'token') {
                        setLines(prev =>
                            prev.map(l => l.id === lineId ? { ...l, content: l.content + evt.content } : l)
                        );
                    } else if (evt.type === 'done') {
                        window.dispatchEvent(new CustomEvent('design:updated'));
                    } else if (evt.type === 'error') {
                        setLines(prev =>
                            prev.map(l => l.id === lineId ? { ...l, type: 'error', content: evt.message } : l)
                        );
                    }
                },
                pageContext,   // ← current page label sent to backend
            );
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

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/20 z-40"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer panel */}
            <div
                className={`fixed top-0 right-0 h-screen w-[440px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-200 ease-out ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div>
                        <h2 className="font-semibold text-gray-900 text-sm">Agent Chat</h2>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {sessionId?.slice(0, 8) ?? '—'}
                            <span className="ml-1.5 text-blue-400">
                                · {location.pathname.replace('/', '') || 'home'}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            to="/chat"
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Expand to full page"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Terminal output */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 font-mono text-sm">
                    {lines.length === 0 && !loading && (
                        <span className="text-gray-300 text-xs">loading history…</span>
                    )}

                    <AnimatePresence initial={false}>
                        {lines.map(line => (
                            <motion.div
                                key={line.id}
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.08 }}
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
                <div className="shrink-0 border-t border-gray-100 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 font-mono text-sm select-none">❯</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={sessionId ? 'Ask the agent…' : 'No active session'}
                            disabled={loading || !sessionId}
                            className="flex-1 bg-transparent font-mono text-sm text-gray-800 placeholder-gray-300 outline-none caret-blue-500 disabled:opacity-40"
                        />
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-300 font-mono mt-1.5 pl-5">enter to send · ↗ full page</p>
                </div>
            </div>
        </>
    );
}
