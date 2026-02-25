# BOM Preprocessing API - Frontend Integration Guide

## Overview

The BOM Preprocessing API provides a **10-step pipeline** to analyze and prepare Bill of Materials (BOM) data before design evolution. This guide provides complete request/response structures for frontend integration.

**Base URL**: `https://your-app.railway.app`

**All endpoints require a `session_id`** - create one first using the Sessions API.

---

## Quick Start

### 1. Create Session

```http
POST /api/sessions
Content-Type: application/json

{
  "user_id": "frontend_user_123"
}
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "frontend_user_123",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Preprocessing Pipeline

### Step 1: Upload & Parse BOM

Upload an Excel file with columns: `Mfr Part` and `Mfr Name`

```http
POST /api/sessions/{session_id}/upload-bom
Content-Type: multipart/form-data

file: <Excel file>
```

**Response:**
```json
{
  "success": true,
  "bom_name": "Power_Supply_BOM_v1.xlsx",
  "parts_count": 45,
  "total_quantity": 127,
  "parts_preview": [
    {
      "part_number": "TPS54560DDAR",
      "manufacturer": "Texas Instruments",
      "quantity": 2,
      "description": "DC-DC Converter"
    }
  ]
}
```

---

### Step 2: Classify Parts (AI)

Classify parts as auxiliary (resistors, capacitors) or non-auxiliary (ICs, modules)

```http
POST /api/sessions/{session_id}/classify
```

**Response:**
```json
{
  "success": true,
  "total_parts": 45,
  "auxiliary_parts": 28,
  "non_auxiliary_parts": 17,
  "classification_map": {
    "TPS54560DDAR": "non-auxiliary",
    "RC0603FR-071KL": "auxiliary",
    "GRM188R71C104KA01D": "auxiliary"
  }
}
```

---

### Step 2.1: Update Classification (Optional)

Manually override AI classification

```http
PUT /api/sessions/{session_id}/update-classification
Content-Type: application/json

{
  "mpn": "RC0603FR-071KL",
  "new_classification": "non-auxiliary"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated RC0603FR-071KL from auxiliary to non-auxiliary",
  "mpn": "RC0603FR-071KL",
  "old_classification": "auxiliary",
  "new_classification": "non-auxiliary",
  "statistics": {
    "total_parts": 45,
    "exempt_count": 27,
    "candidates_count": 18
  }
}
```

---

### Step 3: Analyze System Type (AI)

Get 3 AI-suggested system types

```http
POST /api/sessions/{session_id}/analyze
Content-Type: application/json

{
  "additional_context": "This is for an automotive power management system"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "suggestions": [
    {
      "systemType": "Automotive Power Management System",
      "primaryFunction": "Regulate and distribute power to vehicle subsystems",
      "keyArchitecturalClues": [
        "Multiple DC-DC converters for different voltage rails",
        "CAN bus communication interface",
        "Automotive-grade temperature range components"
      ],
      "applicationDomains": ["Automotive", "Power Electronics", "Embedded Systems"],
      "confidence": 0.92
    },
    {
      "systemType": "Industrial Power Supply Unit",
      "primaryFunction": "Convert AC mains to regulated DC outputs",
      "keyArchitecturalClues": [
        "AC-DC conversion stage",
        "Multiple isolated outputs",
        "EMI filtering components"
      ],
      "applicationDomains": ["Industrial Automation", "Power Electronics"],
      "confidence": 0.78
    },
    {
      "systemType": "Battery Management System",
      "primaryFunction": "Monitor and control battery charging/discharging",
      "keyArchitecturalClues": [
        "Battery monitoring ICs",
        "Current sensing circuits",
        "Protection circuitry"
      ],
      "applicationDomains": ["Energy Storage", "Automotive", "Consumer Electronics"],
      "confidence": 0.65
    }
  ]
}
```

---

### Step 3.1: Select System Type

Choose one of the 3 suggestions (index 0-2)

```http
POST /api/sessions/{session_id}/select-system-type
Content-Type: application/json

{
  "selected_index": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Selected system type: Automotive Power Management System",
  "selected_analysis": {
    "systemType": "Automotive Power Management System",
    "primaryFunction": "Regulate and distribute power to vehicle subsystems",
    "keyArchitecturalClues": [...],
    "applicationDomains": [...]
  },
  "bom_saved": true
}
```

---

### Step 3.2: Update System Analysis (Optional)

```http
PUT /api/sessions/{session_id}/system-analysis
Content-Type: application/json

{
  "system_type": "Custom Automotive Power System",
  "primary_function": "Updated function description",
  "architectural_clues": ["Updated clue 1", "Updated clue 2"],
  "application_domains": ["Automotive", "IoT"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "System analysis updated",
  "system_analysis": {
    "system_type": "Custom Automotive Power System",
    "primary_function": "Updated function description",
    "architectural_clues": ["Updated clue 1", "Updated clue 2"],
    "application_domains": ["Automotive", "IoT"]
  }
}
```

---

### Step 4: Validate Parts

Check if non-auxiliary parts exist using Nexar/Tavily APIs

```http
POST /api/sessions/{session_id}/validate
```

**Response:**
```json
{
  "success": true,
  "total_parts": 17,
  "valid_parts": 14,
  "invalid_parts": 3,
  "validation_results": [
    {
      "mpn": "TPS54560DDAR",
      "manufacturer": "Texas Instruments",
      "status": "valid",
      "message": "Part found and verified",
      "enrichment": {
        "specs": {
          "input_voltage_min": {"value": 4.5, "unit": "V", "display_value": "4.5V"},
          "input_voltage_max": {"value": 60, "unit": "V", "display_value": "60V"},
          "output_current": {"value": 5, "unit": "A", "display_value": "5A"}
        },
        "datasheet_url": "https://www.ti.com/lit/ds/symlink/tps54560.pdf"
      }
    },
    {
      "mpn": "OBSOLETE_PART_123",
      "manufacturer": "Unknown Mfr",
      "status": "invalid",
      "message": "Part not found or obsolete",
      "suggestions": [
        {
          "mpn": "TPS54561DDAR",
          "manufacturer": "Texas Instruments",
          "reason": "Direct replacement with similar specs",
          "specs": {...}
        },
        {
          "mpn": "LM2596S-5.0",
          "manufacturer": "Texas Instruments",
          "reason": "Alternative with compatible footprint",
          "specs": {...}
        }
      ]
    }
  ],
  "auxiliary_parts_skipped": 28
}
```

---

### Step 4.1: Get Parts with Suggestions

Get only invalid parts that have alternatives

```http
GET /api/sessions/{session_id}/parts-with-suggestions
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "parts": [
    {
      "mpn": "OBSOLETE_PART_123",
      "manufacturer": "Unknown Mfr",
      "message": "Part not found or obsolete",
      "suggestions": [
        {
          "mpn": "TPS54561DDAR",
          "manufacturer": "Texas Instruments",
          "reason": "Direct replacement",
          "specs": {...}
        }
      ]
    }
  ]
}
```

---

### Step 4.2: Select Suggestion

Replace invalid part with suggested alternative

```http
POST /api/sessions/{session_id}/select-suggestion
Content-Type: application/json

{
  "original_mpn": "OBSOLETE_PART_123",
  "selected_mpn": "TPS54561DDAR",
  "selected_manufacturer": "Texas Instruments"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Replaced OBSOLETE_PART_123 with TPS54561DDAR",
  "original_mpn": "OBSOLETE_PART_123",
  "selected_mpn": "TPS54561DDAR",
  "enrichment": {
    "specs": {
      "input_voltage_min": {"value": 4.5, "unit": "V", "display_value": "4.5V"},
      "input_voltage_max": {"value": 60, "unit": "V", "display_value": "60V"}
    },
    "datasheet_url": "https://..."
  },
  "specs": {...}
}
```

---

### Step 5: Generate Requirements (AI)

Generate project-level requirements from validated parts

```http
POST /api/sessions/{session_id}/requirements
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "requirements_count": 8,
  "requirements": [
    {
      "req_id": "REQ-001",
      "description": "System shall provide 5V regulated output with ±2% tolerance",
      "category": "Power Regulation",
      "bom_reference": ["TPS54560DDAR", "LM2596S-5.0"]
    },
    {
      "req_id": "REQ-002",
      "description": "System shall support input voltage range of 9V to 36V",
      "category": "Input Specifications",
      "bom_reference": ["TPS54560DDAR"]
    }
  ]
}
```

---

### Step 5.1: Update Requirement (Optional)

```http
PUT /api/sessions/{session_id}/requirements/{req_id}
Content-Type: application/json

{
  "description": "Updated requirement description",
  "category": "Updated Category",
  "bom_reference": ["PART1", "PART2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Requirement REQ-001 updated",
  "requirement": {
    "req_id": "REQ-001",
    "description": "Updated requirement description",
    "category": "Updated Category",
    "bom_reference": ["PART1", "PART2"]
  }
}
```

---

### Step 5.5: Analyze Part Connections (AI)

Analyze how parts connect to each other

```http
POST /api/sessions/{session_id}/analyze-connections
```

**Response:**
```json
{
  "success": true,
  "bom_id": "bom_abc123",
  "connections_analyzed": 12,
  "connections_saved": 12,
  "connections": [
    {
      "source_part": "TPS54560DDAR",
      "target_part": "LM2596S-5.0",
      "connection_type": "power_supply"
    },
    {
      "source_part": "STM32F407VGT6",
      "target_part": "TPS54560DDAR",
      "connection_type": "power_consumer"
    }
  ]
}
```

---

### Step 5.5.1: Get Connections

```http
GET /api/sessions/{session_id}/connections/{bom_id}?source_part=TPS54560DDAR
```

**Response:**
```json
{
  "success": true,
  "bom_id": "bom_abc123",
  "connections_count": 3,
  "connections": [
    {
      "source_part": "TPS54560DDAR",
      "target_part": "LM2596S-5.0",
      "connection_type": "power_supply",
      "created_at": "2024-01-15T10:45:00Z"
    }
  ]
}
```

---

### Step 5.5.2: Update Connections (Optional)

```http
PUT /api/sessions/{session_id}/connections/{bom_id}
Content-Type: application/json

{
  "connections": [
    {
      "source_part": "PART_A",
      "target_part": "PART_B",
      "connection_type": "direct"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "bom_id": "bom_abc123",
  "connections_updated": 1
}
```

---

### Step 6: Generate Subsystems (AI)

Break down system into functional subsystems

```http
POST /api/sessions/{session_id}/subsystems
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "subsystems_count": 4,
  "subsystems": [
    {
      "subsystem_id": "SS-001",
      "name": "Primary Power Conversion",
      "description": "Converts input voltage to regulated 5V output",
      "associated_requirements": ["REQ-001", "REQ-002"],
      "bom_reference": ["TPS54560DDAR", "LM2596S-5.0"]
    },
    {
      "subsystem_id": "SS-002",
      "name": "Microcontroller Unit",
      "description": "Main processing and control logic",
      "associated_requirements": ["REQ-003", "REQ-004"],
      "bom_reference": ["STM32F407VGT6", "AT24C256C"]
    }
  ]
}
```

---

### Step 6.1: Get Subsystem Details

Get detailed info including BOM parts with specs

```http
GET /api/sessions/{session_id}/subsystems/{subsystem_id}
```

**Response:**
```json
{
  "subsystem_id": "SS-001",
  "name": "Primary Power Conversion",
  "description": "Converts input voltage to regulated 5V output",
  "component_bom": [
    {
      "component_id": "TPS54560DDAR",
      "quantity": 2
    }
  ],
  "actual_parts_bom": [
    {
      "part_number": "TPS54560DDAR",
      "quantity": 2,
      "specs": {
        "input_voltage_min": "4.5V",
        "input_voltage_max": "60V",
        "output_current": "5A"
      }
    }
  ],
  "requirements": {
    "REQ-001": {
      "description": "System shall provide 5V regulated output",
      "criteria": "Output voltage within ±2%",
      "priority": "high",
      "mapped_components": ["TPS54560DDAR"]
    }
  }
}
```

---

### Step 6.2: Update Subsystem (Optional)

```http
PUT /api/sessions/{session_id}/subsystems/{subsystem_id}
Content-Type: application/json

{
  "name": "Updated Subsystem Name",
  "description": "Updated description",
  "associated_requirements": ["REQ-001"],
  "bom_reference": ["PART1", "PART2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subsystem SS-001 updated",
  "subsystem": {
    "subsystem_id": "SS-001",
    "name": "Updated Subsystem Name",
    "description": "Updated description",
    "associated_requirements": ["REQ-001"],
    "bom_reference": ["PART1", "PART2"]
  }
}
```

---

### Step 7: Generate Subsystem Requirements (AI)

Generate detailed technical requirements for each subsystem

```http
POST /api/sessions/{session_id}/subsystems/requirements
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "requirements_count": 15,
  "requirements_by_subsystem": {
    "SS-001": [
      {
        "req_id": "SS-001-REQ-001",
        "subsystem_id": "SS-001",
        "description": "Input voltage range: 9V to 36V DC",
        "criteria": "Measured input voltage within specified range under all load conditions",
        "priority": "critical",
        "mapped_components": ["TPS54560DDAR"]
      },
      {
        "req_id": "SS-001-REQ-002",
        "subsystem_id": "SS-001",
        "description": "Output voltage: 5V ±2%",
        "criteria": "Output voltage measured at 4.9V to 5.1V under 0-5A load",
        "priority": "critical",
        "mapped_components": ["TPS54560DDAR"]
      }
    ],
    "SS-002": [...]
  },
  "all_requirements": [...]
}
```

---

### Step 7.1: Get Subsystem Requirements

Query requirements from database

```http
GET /api/sessions/{session_id}/subsystems/requirements?subsystem_id=SS-001
```

**Response:**
```json
{
  "success": true,
  "requirements_count": 3,
  "requirements_by_subsystem": {
    "SS-001": [
      {
        "req_id": "SS-001-REQ-001",
        "subsystem_id": "SS-001",
        "description": "Input voltage range: 9V to 36V DC",
        "criteria": "Measured input voltage within specified range",
        "priority": "critical",
        "mapped_components": ["TPS54560DDAR"]
      }
    ]
  },
  "all_requirements": [...]
}
```

---

### Step 7.2: Update Subsystem Requirement (Optional)

```http
PUT /api/sessions/{session_id}/subsystems/requirements/{req_id}
Content-Type: application/json

{
  "description": "Updated requirement description",
  "criteria": "Updated validation criteria",
  "priority": "high",
  "mapped_components": ["PART1", "PART2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subsystem requirement SS-001-REQ-001 updated",
  "requirement": {
    "req_id": "SS-001-REQ-001",
    "subsystem_id": "SS-001",
    "description": "Updated requirement description",
    "criteria": "Updated validation criteria",
    "priority": "high",
    "mapped_components": ["PART1", "PART2"]
  }
}
```

**Note**: Priority must be one of: `critical`, `high`, `medium`, `low`

---

### Step 8: Finalize Preprocessing

Convert data to format ready for design evolution agents

```http
POST /api/sessions/{session_id}/finalize
```

**Response:**
```json
{
  "success": true,
  "message": "Preprocessing finalized and ready for design evolution",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "components_count": 17,
  "subsystems_count": 4,
  "version_created": 1
}
```

---

### Step 8.1: Get Components (Orchestrator Format)

```http
GET /api/sessions/{session_id}/components
```

**Response:**
```json
{
  "success": true,
  "components_count": 17,
  "components": [
    {
      "component_id": "TPS54560DDAR",
      "category": "power_regulator",
      "manufacturer": "Texas Instruments",
      "part_number": "TPS54560DDAR",
      "specs": {
        "input_voltage_min": 4.5,
        "input_voltage_max": 60,
        "output_current": 5
      },
      "quantity": 2
    }
  ]
}
```

---

### Step 8.2: Get Requirements Data

```http
GET /api/sessions/{session_id}/requirements-data
```

**Response:**
```json
{
  "success": true,
  "oem": "Automotive",
  "standard": "ISO26262",
  "requirements": {
    "REQ-001": {
      "description": "System shall provide 5V regulated output",
      "category": "Power Regulation",
      "priority": "critical"
    }
  },
  "subsystem_requirements": {
    "SS-001": {
      "SS-001-REQ-001": {
        "description": "Input voltage range: 9V to 36V DC",
        "criteria": "Measured input voltage within specified range",
        "priority": "critical"
      }
    }
  }
}
```

---

### Step 9: Check Status

Get current preprocessing progress

```http
GET /api/sessions/{session_id}/preprocessing-state
```

**Response:**
```json
{
  "bom_loaded": true,
  "validated": true,
  "parts_checked": true,
  "filtered": true,
  "analyzed": true,
  "requirements_generated": true,
  "subsystems_generated": true,
  "subsystem_requirements_generated": true
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing data, invalid input)
- `404` - Resource not found (session, part, etc.)
- `500` - Server error (AI service failure, database error)

---

## Workflow Summary

```
1. Create Session
   ↓
2. Upload BOM → Classify Parts → (Optional: Update Classifications)
   ↓
3. Analyze System → Select System Type → (Optional: Update Analysis)
   ↓
4. Validate Parts → (If invalid: Select Suggestions)
   ↓
5. Generate Requirements → (Optional: Update Requirements)
   ↓
5.5. Analyze Connections → (Optional: Update Connections)
   ↓
6. Generate Subsystems → (Optional: Update Subsystems)
   ↓
7. Generate Subsystem Requirements → (Optional: Update Requirements)
   ↓
8. Finalize → Ready for Design Evolution!
```

---

## Frontend Implementation Tips

### 1. Progress Tracking

Use `/preprocessing-state` to show progress:

```javascript
const checkProgress = async (sessionId) => {
  const response = await fetch(`/api/sessions/${sessionId}/preprocessing-state`);
  const state = await response.json();
  
  const steps = [
    { key: 'bom_loaded', label: 'BOM Uploaded' },
    { key: 'filtered', label: 'Parts Classified' },
    { key: 'analyzed', label: 'System Analyzed' },
    { key: 'parts_checked', label: 'Parts Validated' },
    { key: 'requirements_generated', label: 'Requirements Generated' },
    { key: 'subsystems_generated', label: 'Subsystems Created' },
    { key: 'subsystem_requirements_generated', label: 'Detailed Requirements' }
  ];
  
  return steps.map(step => ({
    ...step,
    completed: state[step.key]
  }));
};
```

### 2. Handle Invalid Parts

```javascript
const handleValidation = async (sessionId) => {
  // Run validation
  const validation = await fetch(`/api/sessions/${sessionId}/validate`, {
    method: 'POST'
  }).then(r => r.json());
  
  if (validation.invalid_parts > 0) {
    // Get parts with suggestions
    const partsWithSuggestions = await fetch(
      `/api/sessions/${sessionId}/parts-with-suggestions`
    ).then(r => r.json());
    
    // Show UI for user to select alternatives
    for (const part of partsWithSuggestions.parts) {
      const selectedMpn = await showSuggestionDialog(part);
      
      // Apply selection
      await fetch(`/api/sessions/${sessionId}/select-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_mpn: part.mpn,
          selected_mpn: selectedMpn
        })
      });
    }
  }
};
```

### 3. System Type Selection

```javascript
const selectSystemType = async (sessionId, suggestions) => {
  // Show 3 suggestions to user
  const selectedIndex = await showSystemTypeDialog(suggestions);
  
  // Submit selection
  const response = await fetch(
    `/api/sessions/${sessionId}/select-system-type`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_index: selectedIndex })
    }
  );
  
  return response.json();
};
```

---

## Testing

Use the built-in test UI:

```
https://your-app.railway.app/test-preprocessing
```

Or test with cURL:

```bash
# Create session
SESSION_ID=$(curl -X POST https://your-app.railway.app/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test"}' | jq -r '.session_id')

# Upload BOM
curl -X POST https://your-app.railway.app/api/sessions/$SESSION_ID/upload-bom \
  -F "file=@bom.xlsx"

# Classify
curl -X POST https://your-app.railway.app/api/sessions/$SESSION_ID/classify

# Continue with other steps...
```

---

## Support

- **API Documentation**: `https://your-app.railway.app/api/docs`
- **Interactive Testing**: `https://your-app.railway.app/test-preprocessing`
- **Health Check**: `https://your-app.railway.app/api/health`
