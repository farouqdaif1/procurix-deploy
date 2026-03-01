const BASE_URL = 'https://designevolution-production.up.railway.app/api';

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

export async function uploadBOM(sessionId: string, file: File): Promise<UploadBOMResponse> {
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

    return response.json();
}

export interface ClassifyPartsResponse {
    success: boolean;
    total_parts: number;
    auxiliary_parts: number;
    non_auxiliary_parts: number;
    classification_map: Record<string, 'auxiliary' | 'non-auxiliary' | null>;
}

export async function classifyParts(sessionId: string): Promise<ClassifyPartsResponse> {
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
    newClassification: 'auxiliary' | 'non-auxiliary'
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

    return response.json();
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

export async function analyzeSystem(sessionId: string, additionalContext?: string): Promise<AnalyzeResponse> {
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

    return response.json();
}

export interface SelectSystemTypeResponse {
    success: boolean;
    session_id: string;
    selected_system_type: string;
}

export async function selectSystemType(sessionId: string, selectedIndex: number): Promise<SelectSystemTypeResponse> {
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

    return response.json();
}

export interface ValidationResult {
    mpn: string;
    manufacturer: string | null;
    status: 'valid' | 'invalid';
    confidence: number;
    source: string | null;
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

export async function validateParts(sessionId: string): Promise<ValidateResponse> {
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

    return response.json();
}

export interface Requirement {
    req_id: string;
    original_req_id: string;
    description: string;
    category: string;
    bom_reference: string[];
}

export interface RequirementsResponse {
    success: boolean;
    session_id: string;
    requirements_count: number;
    requirements: Requirement[];
}

export async function getRequirements(sessionId: string): Promise<RequirementsResponse> {
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

    return response.json();
}

export interface UpdateRequirementResponse {
    success: boolean;
    message: string;
    requirement: {
        req_id: string;
        description: string;
        category: string;
        bom_reference: string[];
    };
}

export async function updateRequirement(
    sessionId: string,
    reqId: string,
    description: string,
    category: string,
    bomReference: string[]
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

    return response.json();
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

export async function analyzeConnections(sessionId: string): Promise<AnalyzeConnectionsResponse> {
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

    return response.json();
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get system analysis: ${response.status} ${errorText}`);
    }

    const data: GetSystemAnalysisResponse = await response.json();

    // Transform GET response to match POST response format
    return {
        success: data.success,
        session_id: sessionId,
        suggestions: [{
            systemType: data.system_analysis.system_type,
            primaryFunction: data.system_analysis.primary_function,
            keyArchitecturalClues: data.system_analysis.architectural_clues,
            likelyApplicationDomains: data.system_analysis.application_domains,
            confidence: 'high' as const, // Default to high since it's the selected analysis
            reasoning: `System identified as ${data.system_analysis.system_type} based on architectural clues: ${data.system_analysis.architectural_clues.join(', ')}`,
        }],
    };
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

export interface Subsystem {
    id: string;
    name: string;
    type: string;
    componentIds: string[];
    complianceScore?: number;
}

export interface SubsystemsResponse {
    success: boolean;
    session_id: string;
    subsystems: Subsystem[];
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

export interface SubsystemRequirementsResponse {
    success: boolean;
    session_id: string;
    subsystem_requirements: Array<{
        subsystem_id: string;
        requirements: Requirement[];
    }>;
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
