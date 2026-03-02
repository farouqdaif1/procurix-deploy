# How Subsystems Work - Complete Data Flow Explanation

## 🎯 What Are Subsystems?

**Subsystems** are logical groupings of electronic components that work together to perform a specific function. Think of them as "functional modules" in your circuit design.

### Example:
- **Power Input and Conditioning Subsystem** → Contains components like:
  - `MAX8553E` (Buck Controller)
  - `LD39200DPUR` (LDO Regulator)
  - Filter capacitors, inductors, etc.

Each subsystem has:
- **ID**: Unique identifier (e.g., `'6214ca75fb27b073'`)
- **Name**: Human-readable name (e.g., `'Power Input and Conditioning'`)
- **Type**: Category (e.g., `'power_distribution'`, `'communication'`, `'processing'`)
- **componentIds**: Array of component IDs that belong to this subsystem (e.g., `['MAX8553E', 'LD39200DPUR']`)
- **complianceScore**: Optional percentage score (0-100)

---

## 📊 Data Structure

### Subsystem Interface (from `src/app/types.ts`):
```typescript
export interface Subsystem {
  id: string;
  name: string;
  type: string; // e.g., "Power Subsystem", "Communication Subsystem"
  componentIds: string[];  // Array of component IDs
  complianceScore?: number;
  position?: { x: number; y: number };
}
```

---

## 🔄 Complete Data Flow

### Current Implementation (Using Mock Data)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Application Flow                                          │
│    Upload → Fundamental → Analysis → Architecture →          │
│    Requirements → Subsystems → Compliance → Review          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SubsystemsPage.tsx (Entry Point)                          │
│    - Imports: mockComponents, mockSession                    │
│    - Reads: mockSession.subsystems                           │
│    - Syncs: sessionId (URL ↔ Context)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Data Source: src/app/data/mockData.ts                     │
│                                                               │
│    mockSubsystems: Subsystem[] = [                           │
│      {                                                        │
│        id: '6214ca75fb27b073',                               │
│        name: 'Power Input and Conditioning',                 │
│        type: 'power_distribution',                           │
│        componentIds: ['MAX8553E', 'LD39200DPUR'],            │
│        complianceScore: 100                                  │
│      }                                                        │
│    ];                                                         │
│                                                               │
│    mockSession: BOMSession = {                                │
│      subsystems: mockSubsystems,  ← Passed to page          │
│      components: mockComponents,                             │
│      requirements: mockRequirements                           │
│    }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SubsystemsView.tsx (Main Component)                        │
│                                                               │
│    Receives Props:                                           │
│    - subsystems: Subsystem[]                                 │
│    - components: Component[]                                 │
│    - requirements: Requirement[]                             │
│                                                               │
│    Logic:                                                    │
│    - Filters components by subsystem.componentIds            │
│    - Groups components visually                              │
│    - Manages subsystem-specific requirements                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Component Filtering (How Components Link to Subsystems)    │
│                                                               │
│    In SubsystemsView.tsx:                                    │
│                                                               │
│    getSubsystemComponents(subsystemId: string) {             │
│      const subsystem = subsystems.find(s => s.id === id);   │
│      return components.filter(c =>                            │
│        subsystem.componentIds.includes(c.id)                 │
│      );                                                       │
│    }                                                          │
│                                                               │
│    Example:                                                  │
│    - Subsystem.componentIds = ['MAX8553E', 'LD39200DPUR']   │
│    - Filters components array to find matching IDs          │
│    - Returns: [Component(MAX8553E), Component(LD39200DPUR)] │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 API Integration (Available but Not Currently Used)

The application has API endpoints ready for fetching subsystems from the backend:

### API Endpoints (from `src/app/services/api.ts`):

```typescript
// GET subsystems for a session
GET /api/sessions/{sessionId}/subsystems

Response:
{
  success: true,
  session_id: "abc123",
  subsystems: [
    {
      id: "6214ca75fb27b073",
      name: "Power Input and Conditioning",
      type: "power_distribution",
      componentIds: ["MAX8553E", "LD39200DPUR"],
      complianceScore: 100
    }
  ]
}

// GET subsystem requirements
GET /api/sessions/{sessionId}/subsystems/requirements
```

**Note**: Currently, `SubsystemsPage.tsx` uses **mock data** instead of calling these APIs. To switch to real data, you would:

1. Import the API function:
```typescript
import { getSubsystems } from '@/app/services/api';
```

2. Fetch subsystems in `useEffect`:
```typescript
useEffect(() => {
  const fetchSubsystems = async () => {
    const response = await getSubsystems(sessionId);
    setSubsystems(response.subsystems);
  };
  fetchSubsystems();
}, [sessionId]);
```

---

## 🔗 How Components Link to Subsystems

### Relationship:
- **One-to-Many**: One subsystem contains many components
- **Many-to-One**: One component can belong to only one subsystem (in current implementation)

### Linking Mechanism:
1. **Subsystem** has `componentIds: string[]` array
2. **Component** has `id: string` 
3. Matching happens via: `subsystem.componentIds.includes(component.id)`

### Example:
```typescript
// Subsystem definition
const subsystem = {
  id: 'power-subsystem',
  name: 'Power Input',
  componentIds: ['MAX8553E', 'LD39200DPUR']  // Links to components
};

// Component definitions
const components = [
  { id: 'MAX8553E', partNumber: 'MAX8553E', ... },
  { id: 'LD39200DPUR', partNumber: 'LD39200DPUR', ... },
  { id: 'OTHER_COMPONENT', ... }  // Not in this subsystem
];

// Filtering logic
const subsystemComponents = components.filter(c => 
  subsystem.componentIds.includes(c.id)
);
// Result: [Component(MAX8553E), Component(LD39200DPUR)]
```

---

## 📍 Where Subsystems Are Created

### Current State:
**Subsystems are currently hardcoded in `mockData.ts`** - they're not automatically generated from components.

### Future/Backend Generation:
Based on the API structure, subsystems are likely created on the backend by:
1. **Analyzing component connections** (from Architecture page)
2. **Grouping components** by functional relationships
3. **Detecting subsystem types** (power, communication, processing, etc.)

### Potential Creation Flow:
```
Architecture Page (components + connections)
         │
         ▼
Backend Analysis:
  - Groups connected components
  - Identifies functional groups
  - Assigns subsystem types
         │
         ▼
Subsystems Created:
  - Power Subsystem (power-related components)
  - Communication Subsystem (UART, USB, CAN components)
  - Processing Subsystem (MCU, CPU components)
         │
         ▼
Subsystems Page (displays grouped subsystems)
```

---

## 🎨 How Subsystems Are Displayed

### Three View Modes:

1. **Structured View** (Default):
   - Grid of subsystem cards
   - Shows: name, type, component count, requirement count, compliance score
   - Click card → Opens detail view

2. **Grid View** (React Flow):
   - Visual canvas with:
     - **Group nodes**: Colored containers (one per subsystem)
     - **Component nodes**: Inside their parent group
     - **Edges**: Connections between components
   - Supports drag-and-drop, zoom, minimap

3. **Classification View**:
   - Shows `FundamentalClassificationView`
   - Allows reclassifying components

### Detail View (When Subsystem Selected):
- **Functional Requirements Panel**: Add/edit/delete/search requirements
- **"Generate Smart Requirements" Button**: AI-style auto-generation based on component types
- **Components Panel**: Grid of subsystem's components
- **Component Specs Panel**: Detailed specs when component clicked

---

## 🔍 Key Code Locations

| File | Purpose |
|------|---------|
| `src/app/pages/subsystems/SubsystemsPage.tsx` | Entry point, session sync, navigation |
| `src/app/pages/subsystems/components/SubsystemsView.tsx` | Main view component (overview + detail) |
| `src/app/pages/subsystems/components/SubsystemsFlowView.tsx` | React Flow canvas visualization |
| `src/app/data/mockData.ts` | **Current data source** (mock subsystems) |
| `src/app/services/api.ts` | API functions (`getSubsystems()`) |
| `src/app/types.ts` | `Subsystem` interface definition |

---

## 🚀 Summary

**How subsystems work:**
1. Subsystems are **logical groupings** of components that work together
2. Each subsystem has a `componentIds` array that **links to component IDs**
3. Components are **filtered** by matching their `id` against `subsystem.componentIds`
4. Currently using **mock data** from `mockData.ts`
5. **API endpoints exist** but are not yet integrated
6. Subsystems are **displayed** in three view modes (structured, grid, classification)

**Where data comes from:**
- **Currently**: Hardcoded in `src/app/data/mockData.ts` → `mockSubsystems` → `mockSession.subsystems`
- **Future**: Backend API `/api/sessions/{sessionId}/subsystems` (not yet integrated)

**How to switch to real data:**
- Replace `mockSession.subsystems` with API call to `getSubsystems(sessionId)` in `SubsystemsPage.tsx`
