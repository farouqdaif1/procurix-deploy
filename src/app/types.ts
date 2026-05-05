// Core Types for BOM Evolution Platform
// Updated: Force rebuild

export type SessionStage = 'overview' | 'upload' | 'discovery' | 'validate' | 'part-identification' | 'system-identification' | 'classification' | 'enrichment' | 'architecture' | 'requirements' | 'subsystems' | 'compliance' | 'review';

export type ComplianceStatus = 'compliant' | 'failed' | 'partial' | 'unknown';

export type FailureType = 'UNDERSPEC' | 'GAP' | 'OVERSPEC' | 'INCOMPATIBLE';

export interface Component {
  id: string;
  reference: string; // e.g., "LDO_3V3_DIGITAL"
  partNumber?: string; // e.g., "TPS7A4700"
  manufacturer?: string;
  type: string; // e.g., "secondary_regulator"
  description: string;

  // Specifications
  specs: {
    voltage?: number;
    current?: number;
    efficiency?: number;
    temperature_min?: number;
    temperature_max?: number;
    noise?: number;
    features?: string[];
    [key: string]: any;
  };

  // Identification status
  isIdentified: boolean;
  isGeneric: boolean;

  // Classification
  isFundamental?: boolean; // true = essential, false = auxiliary, undefined = not classified

  // Compliance
  complianceStatus: ComplianceStatus;
  complianceScore?: number;
  failedRequirements?: string[];

  // Visual positioning for canvas
  position?: { x: number; y: number };
  subsystemId?: string;

  // Pinout information (for ICs and components with defined pins)
  pinout?: Record<string, { name: string; type: string; description: string }>;
}

export interface Requirement {
  id: string;
  code: string; // e.g., "REQ-PWR-003"
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'mandatory' | 'medium' | 'low';
  category: string; // e.g., "Power", "Safety", "Environmental"

  // Validation
  validationType: 'threshold' | 'boolean' | 'range' | 'enum';
  expectedValue?: any;
  threshold?: number;
  operator?: '>=' | '<=' | '=' | '!=' | '>' | '<';

  // Status
  isPassed: boolean;
  affectedComponents: string[]; // Component IDs
}

export interface RequirementFailure {
  requirementId: string;
  requirementCode: string;
  componentId: string;
  failureType: FailureType;
  actualValue?: any;
  expectedValue?: any;
  description: string;
}

export interface Subsystem {
  id: string;
  name: string;
  type: string; // e.g., "Power Subsystem", "Communication Subsystem"
  componentIds: string[];
  complianceScore?: number;
  position?: { x: number; y: number };
}

export interface Alternative {
  id: string;
  partNumber: string;
  manufacturer: string;
  description: string;
  complianceScore: number;
  complianceStatus: ComplianceStatus;

  specs: {
    [key: string]: any;
  };

  // Comparison metrics
  efficiency?: number;
  cost?: number;
  noise?: number;
  improvements: string[];
  failedRequirements: RequirementFailure[];

  // Impact analysis
  impact: {
    complianceChange: number;
    costChange: number;
    isDropInReplacement: boolean;
  };

  isRecommended?: boolean;
  confidence?: number;
  datasheetUrl?: string;
}

export interface BOMSession {
  id: string;
  name: string;
  systemType?: string; // e.g., "Power Supply", "IoT Device"
  version: number;
  stage: SessionStage;

  // Data
  components: Component[];
  requirements: Requirement[];
  subsystems: Subsystem[];

  // Overall metrics
  complianceScore?: number;
  totalComponents: number;
  compliantComponents: number;

  // Timeline
  createdAt: Date;
  updatedAt: Date;

  // State
  selectedComponentId?: string;
  exploringAlternatives?: boolean;
}

export interface BOMUploadData {
  fileName: string;
  rowCount: number;
  columns: string[];
  preview: any[];
}

export interface IdentificationResult {
  componentId: string;
  success: boolean;
  partNumber?: string;
  manufacturer?: string;
  specs?: any;
  datasheetUrl?: string;
  error?: string;
}

// ── Part Model types ──────────────────────────────────────────────────────────
// Field names mirror the backend Pydantic classes in model_extraction_service.py exactly.

export type PinDirection = 'input' | 'output' | 'bidirectional' | 'power' | 'ground' | 'analog' | 'nc';
export type LogicFamily = 'push_pull' | 'open_drain' | 'ttl' | 'cmos' | 'analog' | 'power';
export type InterfaceRole = 'master' | 'slave' | 'either';

export interface PartPin {
  number: string;
  name: string;
  direction: PinDirection;      // matches Pin.direction (not "type")
  function: string;              // matches Pin.function (not "description")
  voltage_domain: string | null;
  logic_family: LogicFamily | null;
  voltage_level: string | null;
  protocols: string[];
  pull: string | null;
  notes: string | null;
}

export interface PartInterface {
  type: string;
  instance: string;              // matches Interface.instance (not "name")
  role: InterfaceRole | null;
  pins: string[];
  voltage_domain: string | null;
  max_speed: string | null;
  address: string | null;
  channels: number | null;
  notes: string | null;
}

export interface PowerDomain {
  name: string;
  voltage_min: number | null;
  voltage_typ: number | null;
  voltage_max: number | null;
  supply_pins: string[];
  required_decoupling: string[];  // List[str] in backend, not string | null
  quiescent_current_typ: string | null;
  notes: string | null;
}

export interface PartPowerProfile {
  power_domains: PowerDomain[];
  active_current_typ: string | null;   // matches PowerProfile.active_current_typ
  sleep_current_typ: string | null;    // matches PowerProfile.sleep_current_typ
}

export interface PartSpec {
  name: string;
  value: string;
  units: string | null;          // matches Spec.units (not "unit")
  conditions: string | null;
}

export interface ConnectivityConstraint {
  applies_to: string;            // matches ConnectivityConstraint.applies_to
  requirement: string;
  reason: string | null;
  schematic_note: string | null;
}

export interface CompatibleDevice {
  category: string;
  interface: string | null;      // Optional in backend
  note: string | null;
}

export interface PartModelData {
  interfaces: PartInterface[];
  power: PartPowerProfile;
  key_specs: PartSpec[];
  absolute_max: PartSpec[];             // List[Spec] in backend
  constraints: ConnectivityConstraint[]; // List[ConnectivityConstraint] in backend
  typical_application_notes: string[];
  compatible_with: CompatibleDevice[];
}