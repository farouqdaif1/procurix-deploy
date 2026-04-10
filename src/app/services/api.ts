const BASE_URL = 'http://localhost:8000/api';

export interface CreateSessionResponse {
    session_id: string;
    user_id: string;
    current_state: string;
    available_actions: string[];
    created_at: string;
}

export async function createSession(userId?: string): Promise<CreateSessionResponse> {
    const response = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId || 'user_123',
            initial_state: {},
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface UploadBOMResponse {
    success: boolean;
    bom_name: string;
    parts_count: number;
    total_quantity: number;
    parts_preview: Array<{
        part_number: string;
        manufacturer: string;
        quantity: number;
    }>;
}

export async function uploadBOM(
    sessionId: string,
    file: File,
    setCurrentStage?: (stage: number | null) => void
): Promise<UploadBOMResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/upload-bom`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload BOM: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after BOM upload:', err)
        );
    }

    return result;
}

export interface PartCandidate {
    mpn: string;
    manufacturer: string | null;
    category: string | null;
    description: string | null;
    datasheet_url: string | null;
    is_exact_match: boolean;
    confidence: number;
}

export interface PartDetail {
    part_number: string;
    manufacturer: string | null;
    quantity: number | null;
    classification: 'auxiliary' | 'non-auxiliary' | null;
    category: string | null;
    description: string | null;
    source: 'nexar' | 'web' | 'web_broad' | 'web_confirmed' | 'tavily' | 'combined' | 'unknown' | 'nexar_confirmed' | 'cache' | 'user_provided' | null;
    confidence: number;
    needs_review: boolean;
    datasheet_url: string | null;
    candidates: PartCandidate[];
}

export interface ClassifyPartsResponse {
    success: boolean;
    total_parts: number;
    auxiliary_parts: number;
    non_auxiliary_parts: number;
    classification_map: Record<string, 'auxiliary' | 'non-auxiliary' | null>;
    parts?: PartDetail[];
}

export async function classifyParts(
    sessionId: string,
    setCurrentStage?: (stage: number | null) => void
): Promise<ClassifyPartsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/classify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to classify parts: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after classification:', err)
        );
    }

    return result;
}

// SSE streaming classify — calls /classify/stream and yields parsed events
export type ClassifyStreamEvent =
  | { type: 'start'; total: number; message: string }
  | { type: 'searching'; mpn: string; message: string }
  // Legacy event types (still supported by server for cache hits)
  | { type: 'cached'; mpn: string; category: string | null; description: string | null; source: string; candidates: PartCandidate[] }
  | { type: 'found'; mpn: string; category: string | null; description: string | null; source: string; is_exact_match: boolean; candidates: PartCandidate[] }
  // New enrichment cascade event types
  | { type: 'exact_match'; mpn: string; category: string | null; description: string | null; source: string; confidence: string; datasheet_url: string | null; candidates: PartCandidate[]; params: Record<string, unknown> }
  | { type: 'multi_match'; mpn: string; description: string | null; source: string; candidates: PartCandidate[]; candidate_count: number }
  | { type: 'web_found'; mpn: string; description: string | null; datasheet_url: string | null; product_url: string | null; confidence: string; source: string }
  | { type: 'not_found'; mpn: string; message: string }
  | { type: 'classifying'; message: string }
  | { type: 'complete'; result: ClassifyPartsResponse }
  | { type: 'error'; message: string };

export async function classifyPartsStream(
    sessionId: string,
    onEvent: (event: ClassifyStreamEvent) => void,
    setCurrentStage?: (stage: number | null) => void
): Promise<ClassifyPartsResponse | null> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/classify/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Classify stream failed: ${response.status} ${text}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: ClassifyPartsResponse | null = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
                const event: ClassifyStreamEvent = JSON.parse(line.slice(6));
                onEvent(event);
                if (event.type === 'complete') {
                    finalResult = event.result;
                    if (setCurrentStage) {
                        updateCurrentStageInContext(sessionId, setCurrentStage).catch(() => {});
                    }
                }
            } catch {
                // ignore malformed events
            }
        }
    }

    return finalResult;
}

// SSE streaming for Part Identification step (runs BEFORE system analysis)
export type IdentifyPartsStreamEvent =
  | { type: 'start'; total: number; message: string }
  | { type: 'searching'; mpn: string }
  | { type: 'exact_match'; mpn: string; category: string | null; description: string | null; source: string; confidence: string; datasheet_url: string | null; candidates: PartCandidate[]; params: Record<string, unknown>; impact_level: 'low' | 'high' }
  | { type: 'multi_match'; mpn: string; description: string | null; source: string; candidates: PartCandidate[]; candidate_count: number; impact_level: 'low' | 'high' }
  | { type: 'web_found'; mpn: string; description: string | null; datasheet_url: string | null; product_url: string | null; confidence: string; source: string; impact_level: 'low' | 'high' }
  | { type: 'not_found'; mpn: string; message: string }
  | { type: 'complete'; parts_identified: number; not_found: number }
  | { type: 'error'; message: string };

export async function identifyPartsStream(
    sessionId: string,
    onEvent: (event: IdentifyPartsStreamEvent) => void,
    setCurrentStage?: (stage: number | null) => void
): Promise<void> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/identify-parts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Identify parts stream failed: ${response.status} ${text}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
                const event: IdentifyPartsStreamEvent = JSON.parse(line.slice(6));
                onEvent(event);
                if (event.type === 'complete' && setCurrentStage) {
                    updateCurrentStageInContext(sessionId, setCurrentStage).catch(() => {});
                }
            } catch {
                // ignore malformed events
            }
        }
    }
}

export async function selectPartMatch(
    sessionId: string,
    mpn: string,
    candidate: PartCandidate
): Promise<void> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/select-part-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mpn,
            selected_mpn: candidate.mpn,
            selected_manufacturer: candidate.manufacturer,
            selected_category: candidate.category,
            selected_description: candidate.description,
            selected_datasheet_url: candidate.datasheet_url,
        }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`selectPartMatch failed: ${response.status} ${text}`);
    }
}

export async function confirmWebPart(
    sessionId: string,
    mpn: string,
    confirmedUrl: string | null,
    datasheetUrl: string | null,
    description: string | null,
    manufacturer: string | null,
): Promise<{ success: boolean; enrichment_queued: boolean }> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/web-part-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpn, confirmed_url: confirmedUrl, datasheet_url: datasheetUrl, description, manufacturer }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`confirmWebPart failed: ${response.status} ${text}`);
    }
    return response.json();
}

export async function saveCustomPart(
    sessionId: string,
    mpn: string,
    fields: { manufacturer?: string; description?: string; category?: string; datasheet_url?: string; specs?: Record<string, string> }
): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/custom-part`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpn, ...fields }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`saveCustomPart failed: ${response.status} ${text}`);
    }
    return response.json();
}

export async function suggestPartFields(
    sessionId: string,
    mpn: string,
    description: string | null,
    category: string | null,
): Promise<string[]> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/suggest-part-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpn, description, category }),
    });
    if (!response.ok) return ['description', 'voltage', 'current', 'package'];
    const data = await response.json();
    return data.suggested_fields ?? [];
}

export async function startEnrichFundamentals(
    sessionId: string,
): Promise<{ success: boolean; queued: string[]; count: number }> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/enrich-fundamentals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`enrich-fundamentals failed: ${response.status} ${text}`);
    }
    return response.json();
}

export interface EnrichmentStatusResponse {
    success: boolean;
    statuses: Record<string, 'pending' | 'enriching' | 'done' | 'failed' | 'user_provided'>;
    all_done: boolean;
    total: number;
    done_count: number;
}

export async function getEnrichmentStatus(sessionId: string): Promise<EnrichmentStatusResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/enrichment-status`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`enrichment-status failed: ${response.status} ${text}`);
    }
    return response.json();
}

export interface UpdateClassificationResponse {
    success: boolean;
    message: string;
    mpn: string;
    old_classification: 'auxiliary' | 'non-auxiliary';
    new_classification: 'auxiliary' | 'non-auxiliary';
    statistics: {
        total_parts: number;
        exempt_count: number;
        candidates_count: number;
    };
}

export async function updateClassification(
    sessionId: string,
    mpn: string,
    newClassification: 'auxiliary' | 'non-auxiliary',
    setCurrentStage?: (stage: number | null) => void
): Promise<UpdateClassificationResponse> {
    // Validate inputs
    if (!mpn || mpn.trim() === '') {
        throw new Error('MPN (Manufacturer Part Number) is required');
    }

    if (newClassification !== 'auxiliary' && newClassification !== 'non-auxiliary') {
        throw new Error(`Invalid classification: ${newClassification}. Must be 'auxiliary' or 'non-auxiliary'`);
    }

    const requestBody = {
        mpn: mpn.trim(),
        new_classification: newClassification,
    };

    console.log('Update classification request:', { sessionId, ...requestBody });

    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/update-classification`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Update classification error:', { status: response.status, errorText, requestBody });
        throw new Error(`Failed to update classification: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful PUT
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after classification update:', err)
        );
    }

    return result;
}

export interface BulkUpdateClassificationRequest {
    parts: Array<{
        mpn: string;
        new_classification: 'auxiliary' | 'non-auxiliary';
    }>;
}

export interface BulkUpdateClassificationResponse {
    success: boolean;
    message: string;
    updated_count: number;
    statistics: {
        total_parts: number;
        exempt_count: number;
        candidates_count: number;
    };
}

export async function bulkUpdateClassification(
    sessionId: string,
    parts: Array<{ mpn: string; new_classification: 'auxiliary' | 'non-auxiliary' }>,
    setCurrentStage?: (stage: number | null) => void
): Promise<BulkUpdateClassificationResponse> {
    // Validate inputs
    if (!parts || parts.length === 0) {
        throw new Error('At least one part is required for bulk update');
    }

    // Validate each part
    for (const part of parts) {
        if (!part.mpn || part.mpn.trim() === '') {
            throw new Error('MPN (Manufacturer Part Number) is required for all parts');
        }
        if (part.new_classification !== 'auxiliary' && part.new_classification !== 'non-auxiliary') {
            throw new Error(`Invalid classification: ${part.new_classification}. Must be 'auxiliary' or 'non-auxiliary'`);
        }
    }

    const requestBody: BulkUpdateClassificationRequest = {
        parts: parts.map(part => ({
            mpn: part.mpn.trim(),
            new_classification: part.new_classification,
        })),
    };

    console.log('Bulk update classification request:', { sessionId, partsCount: parts.length });

    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/update-classification`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Bulk update classification error:', { status: response.status, errorText, requestBody });
        throw new Error(`Failed to bulk update classification: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful PUT
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after bulk classification update:', err)
        );
    }

    return result;
}

export interface SystemSuggestion {
    systemType: string;
    primaryFunction: string;
    keyArchitecturalClues: string[];
    likelyApplicationDomains: string[];
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
}

export interface AnalyzeResponse {
    success: boolean;
    session_id: string;
    suggestions: SystemSuggestion[];
}

export async function analyzeSystem(
    sessionId: string,
    additionalContext?: string,
    setCurrentStage?: (stage: number | null) => void
): Promise<AnalyzeResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...(additionalContext && additionalContext.trim() ? { additional_context: additionalContext.trim() } : {}),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze system: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after system analysis:', err)
        );
    }

    return result;
}

export interface SelectSystemTypeResponse {
    success: boolean;
    session_id: string;
    selected_system_type: string;
}

export async function selectSystemType(
    sessionId: string,
    selectedIndex: number,
    setCurrentStage?: (stage: number | null) => void
): Promise<SelectSystemTypeResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/select-system-type`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            selected_index: selectedIndex,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to select system type: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after system type selection:', err)
        );
    }

    return result;
}

export interface ValidationResult {
    mpn: string;
    manufacturer: string | null;
    quantity: number | null;
    status: 'valid' | 'unresolved';
    confidence: number;
    source: string | null;
    category: string | null;
    description: string | null;
    datasheet_url: string | null;
    params: Record<string, { display_value?: string | null; value?: string | null; si_value?: string | null; units?: string | null }>;
    pricing: { per_1000?: number | null };
    availability: { total_avail?: number | null; lead_time_days?: number | null };
    candidates: PartCandidate[];
    suggestions: any[];
    message: string;
}

export interface ValidateResponse {
    success: boolean;
    total_parts: number;
    valid_parts: number;
    invalid_parts: number;
    validation_results: ValidationResult[];
    auxiliary_parts_skipped: number;
}

export async function validateParts(
    sessionId: string,
    setCurrentStage?: (stage: number | null) => void
): Promise<ValidateResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to validate parts: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after validation:', err)
        );
    }

    return result;
}

export interface Requirement {
    req_id: string;
    original_req_id: string;
    description: string;
    category: string;
    bom_reference: string[];
    specification?: string;
}

export interface RequirementsResponse {
    success: boolean;
    session_id: string;
    requirements_count: number;
    requirements: Requirement[];
}

export async function getRequirements(
    sessionId: string,
    setCurrentStage?: (stage: number | null) => void
): Promise<RequirementsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/requirements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get requirements: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after requirements generation:', err)
        );
    }

    return result;
}

export interface UpdateRequirementResponse {
    success: boolean;
    message: string;
    requirement: {
        req_id: string;
        description: string;
        category: string;
        bom_reference: string[];
        specification?: string;
    };
}

export async function updateRequirement(
    sessionId: string,
    reqId: string,
    description: string,
    category: string,
    bomReference: string[],
    setCurrentStage?: (stage: number | null) => void
): Promise<UpdateRequirementResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/requirements/${reqId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description: description,
            category: category,
            bom_reference: bomReference,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update requirement: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful PUT
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after requirement update:', err)
        );
    }

    return result;
}

export interface Connection {
    source_part: string;
    target_part: string | null;
    connection_type: string;
    reasoning: string;
}

export interface AnalyzeConnectionsResponse {
    success: boolean;
    bom_id: string;
    connections_analyzed: number;
    connections_saved: number;
    connections: Connection[];
}

export async function analyzeConnections(
    sessionId: string,
    setCurrentStage?: (stage: number | null) => void
): Promise<AnalyzeConnectionsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analyze-connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze connections: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Update current stage after successful POST
    if (setCurrentStage) {
        updateCurrentStageInContext(sessionId, setCurrentStage).catch(err =>
            console.error('Error updating stage after connection analysis:', err)
        );
    }

    return result;
}

export interface BOMListItem {
    bom_id: string;
    session_id: string;
    system_type: string;
    total_parts: number;
    created_at: string;
    current_stage: number;
}

export interface GetAllBOMsResponse {
    success: boolean;
    boms_count: number;
    boms: BOMListItem[];
}

export async function getAllBOMs(): Promise<GetAllBOMsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/boms`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch BOMs: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getBOMBySessionId(sessionId: string): Promise<BOMListItem | null> {
    try {
        const response = await getAllBOMs();
        const bom = response.boms.find(b => b.session_id === sessionId);
        return bom || null;
    } catch (error) {
        console.error('Error fetching BOM by session ID:', error);
        return null;
    }
}

export interface CurrentStageResponse {
    stage: number;
    stage_name: string;
    can_proceed: boolean;
    is_complete: boolean;
}

export async function getCurrentStage(sessionId: string): Promise<CurrentStageResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/current-stage`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get current stage: ${response.status} ${errorText}`);
    }

    return response.json();
}

/**
 * Helper function to update the current stage in context after a successful update
 * Call this after any POST/PUT request that might advance the stage
 */
export async function updateCurrentStageInContext(
    sessionId: string,
    setCurrentStage: (stage: number | null) => void
): Promise<void> {
    try {
        const stageData = await getCurrentStage(sessionId);
        setCurrentStage(stageData.stage);
    } catch (error) {
        console.error('Error fetching current stage after update:', error);
        // Don't throw - this is a background update that shouldn't block the flow
    }
}

// GET endpoints for fetching existing data

export async function getClassification(sessionId: string): Promise<ClassifyPartsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/classification`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get classification: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface SystemAnalysisResponse {
    success: boolean;
    session_id: string;
    suggestions: SystemSuggestion[];
}

export interface GetSystemAnalysisResponse {
    success: boolean;
    system_analysis: {
        system_type: string;
        primary_function: string;
        architectural_clues: string[];
        application_domains: string[];
    };
}

export async function getSystemAnalysis(sessionId: string): Promise<SystemAnalysisResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/system-analysis`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // 404 means analysis hasn't run yet — return empty rather than throwing
    if (response.status === 404) {
        return { success: false, session_id: sessionId, suggestions: [] };
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get system analysis: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getValidationResults(sessionId: string): Promise<ValidateResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/validation-results`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get validation results: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getConnections(sessionId: string, bomId: string): Promise<AnalyzeConnectionsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/connections/${bomId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get connections: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface SubsystemConnection {
    source_subsystem_id: string;
    target_subsystem_id: string;
    connection_types: string[];
    primary_type: string;
    part_connection_count: number;
}

export async function getSubsystemConnections(sessionId: string): Promise<{ success: boolean; subsystem_connections: SubsystemConnection[] }> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystem-connections`);
    if (!response.ok) throw new Error(`Failed to get subsystem connections: ${response.status}`);
    return response.json();
}

export async function saveConnections(
    sessionId: string,
    connections: Array<{ source_part: string; target_part: string; connection_type: string }>
): Promise<{ success: boolean; connections_saved: number }> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/connections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save connections: ${response.status} ${errorText}`);
    }
    return response.json();
}

export interface Subsystem {
    id: string;
    name: string;
    type: string;
    componentIds: string[];
    complianceScore?: number;
}

// Backend API response format
export interface BackendSubsystem {
    subsystem_id: string;
    original_subsystem_id: string;
    name: string;
    description: string;
    associated_requirements: string[];
    bom_reference: string[];
}

export interface SubsystemsResponse {
    success: boolean;
    session_id: string;
    subsystems_count: number;
    subsystems: BackendSubsystem[];
}

export async function getSubsystems(sessionId: string): Promise<SubsystemsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get subsystems: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function generateSubsystems(sessionId: string): Promise<SubsystemsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate subsystems: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface SubsystemDetailsResponse {
    subsystem_id: string;
    name: string;
    description: string;
    component_bom: Array<{
        component_id: string;
        quantity: number;
    }>;
    actual_parts_bom: Array<{
        part_number: string;
        quantity: number;
    }>;
    requirements: Record<string, any>;
}

export async function getSubsystemDetails(sessionId: string, subsystemId: string): Promise<SubsystemDetailsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems/${subsystemId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get subsystem details: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface SubsystemRequirementItem {
    req_id: string;
    subsystem_id: string;
    description: string;
    criteria: string;
    priority: string;
    mapped_components: string[];
}

export interface SubsystemRequirementsResponse {
    success: boolean;
    session_id: string;
    subsystem_requirements: Array<{
        subsystem_id: string;
        requirements: Requirement[];
    }>;
}

export interface SubsystemRequirementsDirectResponse {
    success: boolean;
    subsystem_id: string;
    requirements_count: number;
    requirements: SubsystemRequirementItem[];
}

export interface GenerateSubsystemRequirementsResponse {
    success: boolean;
    session_id: string;
    requirements_count: number;
    requirements_by_subsystem: Record<string, SubsystemRequirementItem[]>;
    all_requirements: SubsystemRequirementItem[];
}

export interface SubsystemRequirementsNotFoundResponse {
    detail: string;
}

export async function getSubsystemRequirementsBySubsystemId(
    sessionId: string,
    subsystemId: string
): Promise<SubsystemRequirementsResponse | SubsystemRequirementsDirectResponse | SubsystemRequirementsNotFoundResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems/${subsystemId}/requirements`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get subsystem requirements: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getSubsystemRequirements(sessionId: string): Promise<SubsystemRequirementsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems/requirements`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get subsystem requirements: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function generateSubsystemRequirements(
    sessionId: string,
    subsystemId: string
): Promise<GenerateSubsystemRequirementsResponse | SubsystemRequirementsDirectResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems/${subsystemId}/requirements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate subsystem requirements: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface CreateSubsystemRequirementRequest {
    subsystem_id: string;
    description: string;
    criteria: string;
    priority: string;
    mapped_components: string[];
}

export interface CreateSubsystemRequirementResponse {
    success: boolean;
    message?: string;
    requirement?: SubsystemRequirementItem;
}

export async function createSubsystemRequirement(
    sessionId: string,
    requirement: CreateSubsystemRequirementRequest
): Promise<CreateSubsystemRequirementResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/subsystems/requirements/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirement),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create subsystem requirement: ${response.status} ${errorText}`);
    }

    return response.json();
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatResponse {
    agent: string;
    mode: string;
    data: string;
    state: string;
    session_id: string;
    timestamp: string;
    elapsed_ms: number;
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat failed: ${response.status} ${errorText}`);
    }
    return response.json();
}

export interface ChatHistoryMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    agent_name?: string;
    fsm_state?: string;
    created_at: string;
}

export interface ChatHistoryResponse {
    session_id: string;
    messages: ChatHistoryMessage[];
    count: number;
}

export async function getChatHistory(sessionId: string, limit = 50): Promise<ChatHistoryResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/chat/history?limit=${limit}`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get chat history: ${response.status} ${errorText}`);
    }
    return response.json();
}

export type ChatStreamEvent =
    | { type: 'token'; content: string }
    | { type: 'done'; agent: string; state: string }
    | { type: 'error'; message: string };

export async function chatStream(
    sessionId: string,
    message: string,
    onEvent: (event: ChatStreamEvent) => void,
    pageContext?: string,
): Promise<void> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page_context: pageContext }),
    });
    if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Chat stream failed: ${response.status} ${errorText}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            try {
                const evt = JSON.parse(line.slice(5).trim()) as ChatStreamEvent;
                onEvent(evt);
            } catch { /* skip malformed */ }
        }
    }
}

// GET version of getRequirements (currently only POST exists)
export async function getRequirementsGET(sessionId: string): Promise<RequirementsResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/requirements`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get requirements: ${response.status} ${errorText}`);
    }

    return response.json();
}
