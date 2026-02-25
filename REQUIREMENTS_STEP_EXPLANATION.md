# Requirements Step Explanation

## Overview

The Requirements step (Step 5) is where AI-generated project-level requirements are displayed, reviewed, and approved by the user. These requirements are automatically extracted from the validated BOM components.

## What Happens in This Step

### Step 5: Generate Requirements (AI) ✅ IMPLEMENTED

1. **Automatic Generation**: When the user reaches the Requirements page, the system automatically calls the API to generate requirements from the validated parts.

2. **API Endpoint**: `POST /api/sessions/{session_id}/requirements`

3. **What Gets Generated**:
   - Project-level requirements extracted from component specifications
   - Each requirement includes:
     - **req_id**: Unique requirement identifier (e.g., "REQ-001")
     - **description**: The requirement text (e.g., "System shall provide 5V regulated output with ±2% tolerance")
     - **category**: Requirement category (e.g., "Power Regulation", "Input Specifications")
     - **bom_reference**: List of BOM parts that relate to this requirement

4. **Display**: Requirements are shown grouped by category with:
   - Search functionality
   - Filter by category tabs
   - Approval workflow (each requirement must be approved)
   - Edit capability (can modify requirement values)

### Current Implementation Status

✅ **What's Working**:
- Requirements are fetched from API automatically
- Requirements are displayed by category
- Search and filter functionality
- Approval workflow (approve individual or all)
- Edit functionality (UI exists)

❌ **What's Missing**:
- Step 5.1: Update Requirement API integration
  - Currently, edits are only saved locally
  - Need to call API to persist changes to backend

### User Workflow

1. **Page Loads** → Automatically fetches requirements from API
2. **Review Requirements** → User sees all AI-generated requirements
3. **Edit (Optional)** → User can edit requirement values
4. **Approve** → User must approve each requirement (or approve all)
5. **Proceed** → Can only proceed when all requirements are approved

### Data Flow

```
User navigates to /requirements
    ↓
useEffect triggers
    ↓
getRequirements(sessionId) API call
    ↓
API returns requirements array
    ↓
Transform API data to UI format
    ↓
Display requirements by category
    ↓
User reviews/edits/approves
    ↓
(Currently: edits only saved locally)
    ↓
User clicks "Continue to Subsystem Analysis"
    ↓
Navigate to /architecture
```

## Step 5.1: Update Requirement (Optional) - NEEDS IMPLEMENTATION

This step allows users to update requirement details and save them to the backend.

**API Endpoint**: `PUT /api/sessions/{session_id}/requirements/{req_id}`

**What it does**:
- Updates requirement description
- Updates requirement category
- Updates BOM references

**Current State**: 
- UI exists for editing
- Changes are only saved locally (not persisted to API)
- Need to add API call when user saves edits

## Mock Data Status

✅ **No Mock Data Used** - All requirements are fetched from the API using `getRequirements(sessionId)`

The `components={[]}` prop passed to RequirementsView is unused (prefixed with `_components`) and can be removed.
