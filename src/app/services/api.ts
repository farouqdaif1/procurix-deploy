const BASE_URL = 'http://localhost:8090/api';

// ── Verbose fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? 'GET';
    const t0 = performance.now();

    let bodyPreview = '';
    if (init?.body) {
        if (typeof init.body === 'string') bodyPreview = init.body.slice(0, 300);
        else if (init.body instanceof FormData) bodyPreview = '[FormData]';
        else bodyPreview = '[binary]';
    }
    console.log(`%c>> ${method} ${url}`, 'color:#4ade80;font-weight:bold', bodyPreview || '');

    const response = await fetch(url, init);
    const elapsed = (performance.now() - t0).toFixed(0);
    const color = response.ok ? '#4ade80' : '#f87171';

    response.clone().json().then(data => {
        console.log(`%c<< ${response.status} ${method} ${url}  (${elapsed}ms)`, `color:${color};font-weight:bold`, data);
    }).catch(() => {
        console.log(`%c<< ${response.status} ${method} ${url}  (${elapsed}ms)`, `color:${color};font-weight:bold`);
    });

    return response;
}

async function apiJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await apiFetch(url, init);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
    }
    return res.json();
}

// ── Core types ────────────────────────────────────────────────────────────────

export interface Design {
    id: string;
    project_name: string | null;
    user_id: string | null;
    fsm_state: string;
    workflow_status: string;
    created_at: string;
}

export interface DesignPart {
    id: string;
    mpn: string | null;
    selected_mpn: string | null;
    manufacturer: string | null;
    quantity: number;
    designator: string | null;
    component_id: string | null;
    instance_index: number;
    identification_status: string | null;
    classification: string | null;
    category: string | null;
    suggestions_json: Record<string, unknown> | null;
}

export interface UploadResponse {
    design_id: string;
    fsm_state: string;
    part_count: number;
    message: string;
}

// Alias so older components that import UploadBOMResponse still compile
export type UploadBOMResponse = UploadResponse;

export interface WebCandidate {
    mpn: string;
    manufacturer?: string | null;
    description?: string | null;
    datasheet_url?: string | null;
    product_url?: string | null;
    category?: string | null;
    source: string;
    confidence: number;
}

export type IdentifyStreamEvent =
    | { type: 'start'; total: number }
    | { type: 'searching'; mpn: string }
    | { type: 'found'; mpn: string; source: string; category: string | null; description: string | null; datasheet_url?: string | null; product_url?: string | null; params?: Record<string, string> | null }
    | { type: 'web_found'; mpn: string; source: string; candidates: WebCandidate[] }
    | { type: 'not_found'; mpn: string; status: string }
    | { type: 'complete'; identified: number; total: number }
    | { type: 'error'; message: string };

// ── Phase 4+ types (stubs — filled in as phases complete) ─────────────────────

export interface PartCandidate {
    mpn: string;
    manufacturer?: string | null;
    category?: string | null;
    description?: string | null;
    datasheet_url?: string | null;
    product_url?: string | null;
    is_exact_match?: boolean;
}

export interface PartDetail {
    part_number: string;
    manufacturer?: string | null;
    category?: string | null;
    description?: string | null;
    datasheet_url?: string | null;
    source: string;
    confidence: number;
    needs_review: boolean;
    candidates: PartCandidate[];
    classification?: string | null;
    instance_function?: string | null;
}

export interface SystemSuggestion {
    systemType: string;
    primaryFunction: string;
    confidence: 'high' | 'medium' | 'low';
    keyArchitecturalClues: string[];
    reasoning: string;
    suggestedStandards: string[];
}

export interface ValidationResult {
    mpn: string;
    status: string;
    issues?: string[];
    category?: string | null;
    description?: string | null;
    datasheet_url?: string | null;
}

export interface Connection {
    id?: string;
    source_part_number: string;
    target_part_number: string;
    connection_type?: string | null;
    signal_name?: string | null;
    notes?: string | null;
}

export interface SubsystemConnection {
    source_subsystem: string;
    target_subsystem: string;
    interface_type?: string | null;
}

export interface SubsystemRequirementItem {
    id: string;
    subsystem_id: string;
    requirement_text: string;
    priority?: string | null;
}

export interface Requirement {
    id: string;
    requirement_text: string;
    category?: string | null;
    priority?: string | null;
    source?: string | null;
}

export interface ChatHistoryMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

// ── Designs (v2 native) ───────────────────────────────────────────────────────

export async function createDesign(projectName: string, userId?: string): Promise<Design> {
    const body = new FormData();
    body.append('project_name', projectName);
    if (userId) body.append('user_id', userId);
    return apiJSON(`${BASE_URL}/designs`, { method: 'POST', body });
}

export async function listDesigns(): Promise<Design[]> {
    return apiJSON(`${BASE_URL}/designs`);
}

export async function getDesign(designId: string): Promise<Design> {
    return apiJSON(`${BASE_URL}/designs/${designId}`);
}

export async function uploadBOM(designId: string, file: File): Promise<UploadResponse> {
    const body = new FormData();
    body.append('file', file);
    return apiJSON(`${BASE_URL}/designs/${designId}/bom`, { method: 'POST', body });
}

export async function getParts(designId: string): Promise<DesignPart[]> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts`);
}

export async function identifyPartsStream(
    designId: string,
    onEvent: (event: IdentifyStreamEvent) => void,
    _setStage?: (stage: number | null) => void,
): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/designs/${designId}/pipeline/identify/stream`, { method: 'POST' });
    if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`Identify stream failed: ${res.status} ${text}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
                const event = JSON.parse(line.slice(6)) as IdentifyStreamEvent;
                console.log('%c  [SSE]', 'color:#a78bfa', event);
                onEvent(event);
            } catch { /* skip malformed */ }
        }
    }
}

export async function getEvents(designId: string, limit = 50) {
    return apiJSON<unknown[]>(`${BASE_URL}/designs/${designId}/events?limit=${limit}`);
}

// ── createSession: wraps createDesign for older call sites ───────────────────
export async function createSession(): Promise<{ session_id: string }> {
    const design = await createDesign(`Design ${new Date().toISOString().slice(0, 10)}`);
    return { session_id: design.id };
}

// ── getBOMBySessionId ─────────────────────────────────────────────────────────
export async function getBOMBySessionId(sessionId: string): Promise<Design> {
    return getDesign(sessionId);
}

// ── getAllBOMs: wraps listDesigns ─────────────────────────────────────────────
function _fsmToStage(fsm: string): number {
    const map: Record<string, number> = {
        empty: 1, bom_uploaded: 1, parts_identified: 2,
        classified: 3, system_analyzed: 4, validated: 5,
        connections_built: 6, requirements_generated: 7,
        subsystems_generated: 8, complete: 10,
    };
    return map[fsm] ?? 1;
}

export async function getAllBOMs(): Promise<{
    boms: Array<{
        bom_id: string;
        system_type: string | null;
        current_stage: number;
        total_parts: number;
        created_at: string;
    }>;
}> {
    const designs = await listDesigns();
    return {
        boms: designs.map(d => ({
            bom_id: d.id,
            system_type: d.project_name,
            current_stage: _fsmToStage(d.fsm_state),
            total_parts: 0,
            created_at: d.created_at,
        })),
    };
}

// ── getCurrentStage ───────────────────────────────────────────────────────────
export async function getCurrentStage(sessionId: string): Promise<{ current_stage: number }> {
    const design = await getDesign(sessionId);
    return { current_stage: _fsmToStage(design.fsm_state) };
}

export function updateCurrentStageInContext(_sessionId: string): void {
    console.warn('[api] updateCurrentStageInContext: no-op in v2');
}

// ── Phase 4 — Classify ────────────────────────────────────────────────────────

export async function classifyParts(designId: string): Promise<{ classification_map: Record<string, string | null> }> {
    await apiJSON(`${BASE_URL}/designs/${designId}/pipeline/classify`, { method: 'POST' });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2000));
        const result = await getClassification(designId);
        if (Object.values(result.classification_map).some(v => v !== null)) {
            return { classification_map: result.classification_map };
        }
    }
    return { classification_map: (await getClassification(designId)).classification_map };
}

export async function classifyPartsStream(
    designId: string,
    onEvent: (event: Record<string, unknown>) => void,
    options?: { contextHint?: string },
): Promise<void> {
    const url = new URL(`${BASE_URL}/designs/${designId}/classification/stream`);
    if (options?.contextHint?.trim()) url.searchParams.set('context_hint', options.contextHint.trim());
    const res = await apiFetch(url.toString());
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try { onEvent(JSON.parse(line.slice(6))); } catch { /* skip */ }
            }
        }
    }
}

export async function getClassification(designId: string): Promise<{
    parts: PartDetail[];
    classification_map: Record<string, string | null>;
}> {
    return apiJSON(`${BASE_URL}/designs/${designId}/classification`);
}

export async function bulkUpdateClassification(
    designId: string,
    updates: { mpn: string; new_classification: string }[],
    _setStage?: (stage: number | null) => void,
): Promise<void> {
    await apiJSON(`${BASE_URL}/designs/${designId}/classification/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
    });
}

export async function selectPartMatch(
    designId: string,
    mpn: string,
    candidate: PartCandidate,
): Promise<void> {
    await apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/select-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
    });
}

export async function confirmWebPart(
    designId: string,
    mpn: string,
    product_url: string | null,
    datasheet_url: string | null,
    description: string | null,
    _extra?: unknown,
): Promise<void> {
    await apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/web-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            selected_mpn: mpn,
            product_url,
            datasheet_url,
            description,
        }),
    });
}

export async function saveCustomPart(
    designId: string,
    mpn: string,
    fields: {
        manufacturer?: string;
        description?: string;
        category?: string;
        datasheet_url?: string;
        specs?: Record<string, string>;
        datasheetFile?: File;
    },
): Promise<void> {
    const body = new FormData();
    if (fields.description) body.append('description', fields.description);
    if (fields.manufacturer) body.append('manufacturer', fields.manufacturer);
    if (fields.category) body.append('category', fields.category);
    if (fields.datasheet_url) body.append('datasheet_url', fields.datasheet_url);
    if (fields.specs) body.append('params', JSON.stringify(fields.specs));
    if (fields.datasheetFile) body.append('datasheet_file', fields.datasheetFile);
    await apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/custom`, {
        method: 'POST',
        body,
    });
}

export async function renamePart(designId: string, mpn: string, newMpn: string): Promise<void> {
    await apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_mpn: newMpn }),
    });
}

export async function suggestPartFields(
    designId: string,
    mpn: string,
    description: string | null,
    category: string | null,
): Promise<string[]> {
    const result = await apiJSON<{ fields: string[] }>(
        `${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/suggest-fields`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, category }),
        },
    );
    return result.fields;
}

// ── Phase 5 — System Analysis ─────────────────────────────────────────────────

export async function analyzeSystem(designId: string, additionalContext?: string): Promise<{ suggestions: SystemSuggestion[] }> {
    await apiJSON(`${BASE_URL}/designs/${designId}/pipeline/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_context: additionalContext ?? null }),
    });
    return { suggestions: [] };
}

export async function getSystemAnalysis(designId: string): Promise<{
    success: boolean;
    suggestions: SystemSuggestion[];
    system_type: string | null;
    standards: string[];
    confirmed: boolean;
    error?: string | null;
}> {
    return apiJSON(`${BASE_URL}/designs/${designId}/system-profile`);
}


export async function selectSystemType(designId: string, index: number): Promise<void> {
    await apiJSON(`${BASE_URL}/designs/${designId}/system-profile/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
    });
}

export async function confirmSystemType(designId: string, index: number): Promise<void> {
    return selectSystemType(designId, index);
}

// ── Stubs: Phase 6 — Validation + Connections ─────────────────────────────────

export async function validateParts(_designId: string) {
    console.warn('[api] validateParts: Phase 6 not yet implemented');
    return { validation_results: [] as ValidationResult[] };
}

export async function getValidationResults(_designId: string) {
    console.warn('[api] getValidationResults: Phase 6 not yet implemented');
    return { results: [] as ValidationResult[] };
}

export async function startEnrichFundamentals(_designId: string) {
    console.warn('[api] startEnrichFundamentals: Phase 6 not yet implemented');
    return {};
}

export async function getEnrichmentStatus(_designId: string) {
    console.warn('[api] getEnrichmentStatus: Phase 6 not yet implemented');
    return { status: 'idle' };
}

export async function buildConnections(_designId: string) {
    console.warn('[api] buildConnections: Phase 6 not yet implemented');
    return { connections: [] as Connection[] };
}

export async function analyzeConnections(_designId: string) {
    console.warn('[api] analyzeConnections: Phase 6 not yet implemented');
    return { connections: [] as Connection[] };
}

export async function getConnections(_designId: string): Promise<Connection[]> {
    console.warn('[api] getConnections: Phase 6 not yet implemented');
    return [];
}

export async function saveConnections(_designId: string, _connections: Connection[]) {
    console.warn('[api] saveConnections: Phase 6 not yet implemented');
    return {};
}

export async function getPartSpecs(_designId: string, _mpn: string) {
    console.warn('[api] getPartSpecs: Phase 6 not yet implemented');
    return { specs: {} };
}

// ── Stubs: Phase 7 — Requirements + Subsystems ───────────────────────────────

export async function generateRequirements(_designId: string) {
    console.warn('[api] generateRequirements: Phase 7 not yet implemented');
    return { requirements: [] as Requirement[] };
}

export async function getRequirements(_designId: string): Promise<Requirement[]> {
    console.warn('[api] getRequirements: Phase 7 not yet implemented');
    return [];
}

export async function getRequirementsGET(_designId: string): Promise<Requirement[]> {
    console.warn('[api] getRequirementsGET: Phase 7 not yet implemented');
    return [];
}

export async function updateRequirement(_designId: string, _reqId: string, _data: Partial<Requirement>) {
    console.warn('[api] updateRequirement: Phase 7 not yet implemented');
    return {};
}

export async function deleteRequirement(_designId: string, _reqId: string) {
    console.warn('[api] deleteRequirement: Phase 7 not yet implemented');
    return {};
}

export async function generateSubsystems(_designId: string) {
    console.warn('[api] generateSubsystems: Phase 7 not yet implemented');
    return { subsystems: [] };
}

export async function getSubsystems(_designId: string) {
    console.warn('[api] getSubsystems: Phase 7 not yet implemented');
    return [];
}

export async function getSubsystemDetails(_designId: string, _subsystemId: string) {
    console.warn('[api] getSubsystemDetails: Phase 7 not yet implemented');
    return null;
}

export async function getSubsystemRequirementsBySubsystemId(
    _designId: string,
    _subsystemId: string,
): Promise<SubsystemRequirementItem[]> {
    console.warn('[api] getSubsystemRequirementsBySubsystemId: Phase 7 not yet implemented');
    return [];
}

export async function generateSubsystemRequirements(_designId: string, _subsystemId: string) {
    console.warn('[api] generateSubsystemRequirements: Phase 7 not yet implemented');
    return { requirements: [] as SubsystemRequirementItem[] };
}

export async function createSubsystemRequirement(
    _designId: string,
    _subsystemId: string,
    _data: Partial<SubsystemRequirementItem>,
): Promise<SubsystemRequirementItem> {
    console.warn('[api] createSubsystemRequirement: Phase 7 not yet implemented');
    return { id: '', subsystem_id: _subsystemId, requirement_text: '' };
}

// ── Stubs: Chat ───────────────────────────────────────────────────────────────

export async function sendChatMessage(designId: string, message: string): Promise<{ data: string }> {
    return apiJSON(`${BASE_URL}/designs/${designId}/pipeline/analyze/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
}

export async function chatStream(
    _designId: string,
    _message: string,
    _onToken: (token: string) => void,
): Promise<void> {
    console.warn('[api] chatStream: Chat not yet implemented');
}

export async function getChatHistory(_designId: string): Promise<ChatHistoryMessage[]> {
    console.warn('[api] getChatHistory: Chat not yet implemented');
    return [];
}

// ── Part Model ────────────────────────────────────────────────────────────────

export interface PartModelResponse {
    mpn: string;
    model: import('@/app/types').PartModelData;
    extracted_at: string;
}

export interface PartPinoutResponse {
    mpn: string;
    package: string | null;
    pin_count: number;
    pins: import('@/app/types').PartPin[];
    confidence: number;
}

export interface ModelExtractionResponse {
    mpn: string;
    status: 'already_extracted' | 'extraction_started';
    model?: import('@/app/types').PartModelData;
    extracted_at?: string;
}

export async function getPartModel(designId: string, mpn: string): Promise<PartModelResponse> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/model`);
}

export async function getPartPinout(designId: string, mpn: string): Promise<PartPinoutResponse> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/pinout`);
}

export async function triggerModelExtraction(designId: string, mpn: string): Promise<ModelExtractionResponse> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/model/extract`, { method: 'POST' });
}

// ── Model enrichment stage ────────────────────────────────────────────────────

export interface ModelEnrichmentTriggerResponse {
    status: 'enrichment_started' | 'nothing_to_enrich';
    total: number;
}

export type PartEnrichmentState = 'done' | 'extracting' | 'no_datasheet' | 'failed';

export interface PartEnrichmentDetail {
    mpn: string;
    status: PartEnrichmentState;
    has_model: boolean;
    source: string | null;
    failure_reason: string | null;
}

export interface ModelEnrichmentStatus {
    total: number;
    done: number;
    extracting: number;
    failed: number;
    no_datasheet: number;
    complete: boolean;
    parts: PartEnrichmentDetail[];
}

export async function triggerModelEnrichment(designId: string): Promise<ModelEnrichmentTriggerResponse> {
    return apiJSON(`${BASE_URL}/designs/${designId}/pipeline/enrich`, { method: 'POST' });
}

export async function getModelEnrichmentStatus(designId: string): Promise<ModelEnrichmentStatus> {
    return apiJSON(`${BASE_URL}/designs/${designId}/enrichment/status`);
}

export async function updatePartDatasheetUrl(
    designId: string,
    mpn: string,
    url: string,
): Promise<{ status: string; mpn: string }> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/datasheet-url`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
}

export async function reIdentifyPart(
    designId: string,
    mpn: string,
): Promise<{ status: string; mpn: string }> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/re-identify`, {
        method: 'POST',
    });
}

export interface NexarRefreshResult {
    mpn: string;
    manufacturer: string | null;
    category: string | null;
    description: string | null;
    datasheet_url: string | null;
    source: string;
    params: Record<string, string> | null;
}

export async function nexarRefreshPart(
    designId: string,
    mpn: string,
): Promise<NexarRefreshResult> {
    return apiJSON(`${BASE_URL}/designs/${designId}/parts/${encodeURIComponent(mpn)}/nexar-refresh`, {
        method: 'POST',
    });
}
