import type { Component, Requirement, Subsystem, Alternative, BOMSession } from '@/app/types';

// ============================================================================
// POWER INPUT AND CONDITIONING SUBSYSTEM - MOCK DATA
// ============================================================================
// System: Power Input and Conditioning
// Architecture: Two-stage Buck + LDO topology
// Components: 4 core power components (with 2 instances of filter inductor)
// Subsystem ID: 6214ca75fb27b073
// ============================================================================

// Component Suggestions for Identification (Human-in-the-Loop)
export const mockComponentSuggestions = {};

// Mock Components - Power Input and Conditioning Subsystem
export const mockComponents: Component[] = [
  // ========== POWER INPUT AND CONDITIONING SUBSYSTEM ==========
  {
    id: 'MAX8553E',
    reference: 'U1',
    partNumber: 'MAX8553E',
    manufacturer: 'Maxim Integrated',
    type: 'IC',
    description: 'Synchronous Buck Controller',
    specs: {
      topology: 'Synchronous Buck',
      input_voltage_min: '2.7V',
      input_voltage_max: '5.5V',
      output_voltage_min: '0.8V',
      output_voltage_max: '3.6V',
      output_current_max: '3A',
      switching_frequency_typ: '1.2MHz',
      efficiency_typ: '90-95%',
      quiescent_current: '1.2mA',
      operating_temp_min: '-40°C',
      operating_temp_max: '125°C',
      package: 'TQFN-16',
      function: 'Synchronous Buck Controller',
      voltage: 3.3,
      current: 3
    },
    isIdentified: true,
    isGeneric: false,
    complianceStatus: 'compliant',
    complianceScore: 100,
    position: { x: 200, y: 300 },
    subsystemId: '6214ca75fb27b073',
    pinout: {
      '1': { name: 'VIN', type: 'POWER', description: 'Input voltage supply' },
      '2': { name: 'EN', type: 'INPUT', description: 'Enable input, active high' },
      '3': { name: 'SS', type: 'INPUT', description: 'Soft-start timing capacitor' },
      '4': { name: 'COMP', type: 'OUTPUT', description: 'Compensation network connection' },
      '5': { name: 'FB', type: 'INPUT', description: 'Feedback input, 0.8V reference' },
      '6': { name: 'GND', type: 'GROUND', description: 'Signal ground' },
      '7': { name: 'LX', type: 'OUTPUT', description: 'Switch node output' },
      '8': { name: 'PGND', type: 'GROUND', description: 'Power ground, thermal pad' }
    }
  },
  {
    id: 'LD39200DPUR',
    reference: 'U2',
    partNumber: 'LD39200DPUR',
    manufacturer: 'STMicroelectronics',
    type: 'IC',
    description: 'Low Dropout Linear Regulator',
    specs: {
      accuracy: '1%',
      case_package: 'DFN',
      dropout_voltage: '130mV',
      height: '1mm',
      input_voltage_min: '1.25V',
      input_voltage_max: '6V',
      max_junction_temperature: '125°C',
      max_operating_temperature: '125°C',
      max_output_current: '2A',
      min_operating_temperature: '-40°C',
      operating_supply_current: '1mA',
      output_current: '2A',
      output_type: 'Adjustable',
      output_voltage: '4.89V',
      quiescent_current: '300µA',
      psrr: '>60dB @ 1kHz',
      noise_spec: '<50µVrms',
      lifecycle_status: 'Production (Last Updated: 4 months ago)',
      package: 'DFN-8',
      function: 'Low Dropout Linear Regulator'
    },
    isIdentified: true,
    isGeneric: false,
    complianceStatus: 'compliant',
    complianceScore: 100,
    position: { x: 400, y: 300 },
    subsystemId: '6214ca75fb27b073',
    pinout: {
      '1': { name: 'VIN', type: 'POWER', description: 'Input voltage' },
      '2': { name: 'VIN', type: 'POWER', description: 'Input voltage' },
      '3': { name: 'EN', type: 'INPUT', description: 'Enable input' },
      '4': { name: 'GND', type: 'GROUND', description: 'Ground' },
      '5': { name: 'GND', type: 'GROUND', description: 'Ground, thermal pad' },
      '6': { name: 'ADJ', type: 'INPUT', description: 'Voltage adjustment, 0.8V reference' },
      '7': { name: 'VOUT', type: 'OUTPUT', description: 'Output voltage' },
      '8': { name: 'VOUT', type: 'OUTPUT', description: 'Output voltage' }
    }
  }
];

// Mock Requirements
export const mockRequirements: Requirement[] = [
  {
    id: '8d4ae261fc004800',
    code: 'REQ-PWR-001',
    title: 'Input voltage range',
    description: 'The power input must accept a voltage range of 3.0V to 5.5V without damage or performance degradation.',
    priority: 'critical',
    category: 'Power',
    validationType: 'range',
    expectedValue: { min: 3.0, max: 5.5 },
    isPassed: true,
    affectedComponents: ['MAX8553E']
  },
  {
    id: '49710dd554a084d4',
    code: 'REQ-PWR-002',
    title: 'Output current capability',
    description: 'The power conditioning circuit must be able to supply a minimum of 2.0A at 3.3V.',
    priority: 'critical',
    category: 'Power',
    validationType: 'threshold',
    threshold: 2.0,
    operator: '>=',
    isPassed: true,
    affectedComponents: ['LD39200DPUR']
  }
];

// Mock Subsystems
export const mockSubsystems: Subsystem[] = [
  {
    id: '6214ca75fb27b073',
    name: 'Power Input and Conditioning',
    type: 'power_distribution',
    componentIds: ['MAX8553E', 'LD39200DPUR'],
    complianceScore: 100,
    position: { x: 300, y: 300 }
  }
];

// Mock Alternatives
export const mockAlternatives: Alternative[] = [];

// Mock Session
export const mockSession: BOMSession = {
  id: 'session-power-input',
  name: 'Power Input and Conditioning',
  systemType: 'Power Supply',
  version: 1,
  stage: 'architecture',
  components: mockComponents,
  requirements: mockRequirements,
  subsystems: mockSubsystems,
  complianceScore: 100,
  totalComponents: mockComponents.length,
  compliantComponents: mockComponents.filter(c => c.complianceStatus === 'compliant').length,
  createdAt: new Date('2026-02-01T09:00:00'),
  updatedAt: new Date('2026-02-02T14:30:00'),
  selectedComponentId: undefined,
  exploringAlternatives: false
};

// Mock BOM Library Sessions
export const mockBOMSessions: BOMSession[] = [
  mockSession
];

// Backend Response Mock Data (from first.json)
export const mockBackendResponse = {
  subsystem_id: '6214ca75fb27b073',
  name: 'Power Input and Conditioning',
  description: 'This subsystem provides the primary power input, voltage regulation, and overcurrent protection for the system.',
  schematic_version: '1.0',

  component_bom: [
    { component_id: 'MAX8553E', quantity: 1 },
    { component_id: 'LD39200DPUR', quantity: 1 }
  ],

  actual_parts_bom: [
    {
      part_number: 'MAX8553E',
      quantity: 1,
      type: 'IC',
      function: 'Synchronous Buck Controller',
      package: 'TQFN-16',
      specs: {
        topology: 'Synchronous Buck',
        input_voltage_min: '2.7V',
        input_voltage_max: '5.5V',
        output_voltage_min: '0.8V',
        output_voltage_max: '3.6V',
        output_current_max: '3A',
        switching_frequency_typ: '1.2MHz',
        efficiency_typ: '90-95%',
        quiescent_current: '1.2mA',
        operating_temp_min: '-40°C',
        operating_temp_max: '125°C'
      },
      pinout: {
        '1': { name: 'VIN', type: 'POWER', description: 'Input voltage supply' },
        '2': { name: 'EN', type: 'INPUT', description: 'Enable input, active high' },
        '3': { name: 'SS', type: 'INPUT', description: 'Soft-start timing capacitor' },
        '4': { name: 'COMP', type: 'OUTPUT', description: 'Compensation network connection' },
        '5': { name: 'FB', type: 'INPUT', description: 'Feedback input, 0.8V reference' },
        '6': { name: 'GND', type: 'GROUND', description: 'Signal ground' },
        '7': { name: 'LX', type: 'OUTPUT', description: 'Switch node output' },
        '8': { name: 'PGND', type: 'GROUND', description: 'Power ground, thermal pad' }
      }
    },
    {
      part_number: 'LD39200DPUR',
      quantity: 1,
      type: 'IC',
      function: 'Low Dropout Linear Regulator',
      package: 'DFN-8',
      specs: {
        accuracy: '1%',
        case_package: 'DFN',
        dropout_voltage: '130mV',
        height: '1mm',
        input_voltage_min: '1.25V',
        input_voltage_max: '6V',
        max_junction_temperature: '125°C',
        max_operating_temperature: '125°C',
        max_output_current: '2A',
        min_operating_temperature: '-40°C',
        operating_supply_current: '1mA',
        output_current: '2A',
        output_type: 'Adjustable',
        output_voltage: '4.89V',
        quiescent_current: '300µA',
        psrr: '>60dB @ 1kHz',
        noise: '<50µVrms',
        lifecycle_status: 'Production (Last Updated: 4 months ago)'
      },
      pinout: {
        '1': { name: 'VIN', type: 'POWER', description: 'Input voltage' },
        '2': { name: 'VIN', type: 'POWER', description: 'Input voltage' },
        '3': { name: 'EN', type: 'INPUT', description: 'Enable input' },
        '4': { name: 'GND', type: 'GROUND', description: 'Ground' },
        '5': { name: 'GND', type: 'GROUND', description: 'Ground, thermal pad' },
        '6': { name: 'ADJ', type: 'INPUT', description: 'Voltage adjustment, 0.8V reference' },
        '7': { name: 'VOUT', type: 'OUTPUT', description: 'Output voltage' },
        '8': { name: 'VOUT', type: 'OUTPUT', description: 'Output voltage' }
      }
    }
  ],

  connections: [
    {
      connection_id: 'conn_001',
      from_component: 'INPUT_POWER',
      to_component: 'SPM5030VT-R68M-D',
      instance: 1,
      connection_type: 'power',
      signal_name: 'VIN_RAW',
      description: 'Raw input power to first filter inductor',
      typical_voltage: '3.0V - 5.5V',
      typical_current: '3A'
    },
    {
      connection_id: 'conn_002',
      from_component: 'SPM5030VT-R68M-D',
      from_instance: 1,
      from_pin: 'OUTPUT',
      to_component: 'MAX8553E',
      to_pin: 'VIN (Pin 1)',
      connection_type: 'power',
      signal_name: 'VIN_FILTERED',
      description: 'Filtered input to buck converter',
      typical_voltage: '3.0V - 5.5V',
      notes: 'Requires bulk and bypass capacitors at this node'
    },
    {
      connection_id: 'conn_003',
      from_component: 'MAX8553E',
      from_pin: 'LX (Pin 7)',
      to_component: 'SRP4020TA-1R5M',
      to_pin: 'INPUT',
      connection_type: 'switching',
      signal_name: 'SW_NODE',
      description: 'Switching node to buck inductor',
      typical_voltage: '0V - VIN (PWM)',
      switching_frequency: '1.2MHz',
      critical_trace: true,
      routing_notes: 'Minimize trace length and area, <10mm recommended'
    },
    {
      connection_id: 'conn_004',
      from_component: 'SRP4020TA-1R5M',
      from_pin: 'OUTPUT',
      to_component: 'MAX8553E',
      to_pin: 'FB (Pin 5)',
      connection_type: 'power_and_feedback',
      signal_name: 'VOUT_BUCK',
      description: 'Buck output voltage and feedback point',
      typical_voltage: '3.3V - 3.6V',
      notes: 'Requires resistor divider for feedback and output capacitors'
    },
    {
      connection_id: 'conn_005',
      from_component: 'SRP4020TA-1R5M',
      from_pin: 'OUTPUT',
      to_component: 'SPM5030VT-R68M-D',
      to_instance: 2,
      to_pin: 'INPUT',
      connection_type: 'power',
      signal_name: 'VOUT_BUCK',
      description: 'Buck output to second filter inductor',
      typical_voltage: '3.3V - 3.6V'
    },
    {
      connection_id: 'conn_006',
      from_component: 'SPM5030VT-R68M-D',
      from_instance: 2,
      from_pin: 'OUTPUT',
      to_component: 'LD39200DPUR',
      to_pin: 'VIN (Pin 1, 2)',
      connection_type: 'power',
      signal_name: 'VOUT_FILTERED',
      description: 'Filtered voltage to LDO input',
      typical_voltage: '3.3V - 3.6V',
      notes: 'Requires input capacitors at LDO'
    },
    {
      connection_id: 'conn_007',
      from_component: 'LD39200DPUR',
      from_pin: 'VOUT (Pin 7, 8)',
      to_component: 'OUTPUT_LOAD',
      connection_type: 'power',
      signal_name: '3V3_CLEAN',
      description: 'Clean regulated 3.3V output to load',
      typical_voltage: '3.3V ± 1%',
      max_current: '2A',
      notes: 'Requires output capacitors for stability'
    },
    {
      connection_id: 'conn_008',
      from_component: 'LD39200DPUR',
      from_pin: 'VOUT (Pin 7, 8)',
      to_component: 'LD39200DPUR',
      to_pin: 'ADJ (Pin 6)',
      connection_type: 'feedback',
      signal_name: 'VOUT_SENSE',
      description: 'Output voltage feedback for regulation',
      notes: 'Requires resistor divider: Vout = 0.8V * (R_upper + R_lower) / R_lower'
    },
    {
      connection_id: 'conn_009',
      from_component: 'MAX8553E',
      from_pin: 'PGND (Pin 8)',
      to_component: 'GROUND_PLANE',
      connection_type: 'ground',
      ground_type: 'POWER_GROUND',
      signal_name: 'PGND',
      description: 'Buck converter power ground',
      notes: 'Thermal pad, requires via array to ground plane'
    },
    {
      connection_id: 'conn_010',
      from_component: 'MAX8553E',
      from_pin: 'GND (Pin 6)',
      to_component: 'GROUND_PLANE',
      connection_type: 'ground',
      ground_type: 'SIGNAL_GROUND',
      signal_name: 'SGND',
      description: 'Buck converter signal ground'
    },
    {
      connection_id: 'conn_011',
      from_component: 'LD39200DPUR',
      from_pin: 'GND (Pin 4, 5)',
      to_component: 'GROUND_PLANE',
      connection_type: 'ground',
      ground_type: 'POWER_GROUND',
      signal_name: 'PGND',
      description: 'LDO ground reference',
      notes: 'Pin 5 is thermal pad, requires via array to ground plane'
    },
    {
      connection_id: 'conn_012',
      from_component: 'MAX8553E',
      from_pin: 'COMP (Pin 4)',
      to_component: 'COMPENSATION_NETWORK',
      connection_type: 'control',
      signal_name: 'COMP',
      description: 'Compensation network for control loop stability',
      notes: 'Requires RC network to ground, typically 100pF capacitor'
    },
    {
      connection_id: 'conn_013',
      from_component: 'MAX8553E',
      from_pin: 'SS (Pin 3)',
      to_component: 'SOFT_START_CAP',
      connection_type: 'control',
      signal_name: 'SS',
      description: 'Soft-start timing',
      notes: 'Requires capacitor to ground, typically 1µF for ~10ms startup'
    },
    {
      connection_id: 'conn_014',
      from_component: 'MAX8553E',
      from_pin: 'EN (Pin 2)',
      to_component: 'ENABLE_CONTROL',
      connection_type: 'control',
      signal_name: 'EN',
      description: 'Enable control input',
      notes: 'Pull high to VIN for always-on, or connect to control logic'
    },
    {
      connection_id: 'conn_015',
      from_component: 'LD39200DPUR',
      from_pin: 'EN (Pin 3)',
      to_component: 'ENABLE_CONTROL',
      connection_type: 'control',
      signal_name: 'EN_LDO',
      description: 'LDO enable control input',
      notes: 'Pull high to VIN for always-on, or connect to control logic'
    }
  ],

  power_flow_topology: {
    stages: [
      {
        stage: 1,
        name: 'Input EMI Filtering',
        components: [{ component: 'SPM5030VT-R68M-D', instance: 1 }],
        function: 'Reduce input ripple and EMI, attenuate high-frequency noise',
        input: 'VIN_RAW (3.0-5.5V)',
        output: 'VIN_FILTERED (3.0-5.5V)'
      },
      {
        stage: 2,
        name: 'Buck DC-DC Conversion',
        components: [
          { component: 'MAX8553E', role: 'Controller' },
          { component: 'SRP4020TA-1R5M', role: 'Power inductor' }
        ],
        function: 'Step-down DC-DC conversion with high efficiency',
        input: 'VIN_FILTERED (3.0-5.5V)',
        output: 'VBUCK (3.3-3.6V)',
        typical_efficiency: '90-95%',
        switching_frequency: '1.2MHz'
      },
      {
        stage: 3,
        name: 'Inter-Stage Filtering',
        components: [{ component: 'SPM5030VT-R68M-D', instance: 2 }],
        function: 'Reduce buck switching ripple before LDO, isolation between stages',
        input: 'VBUCK (3.3-3.6V)',
        output: 'VBUCK_FILTERED (3.3-3.6V)'
      },
      {
        stage: 4,
        name: 'Linear Regulation',
        components: [{ component: 'LD39200DPUR' }],
        function: 'Final regulation to precise 3.3V with ultra-low noise',
        input: 'VBUCK_FILTERED (3.3-3.6V)',
        output: '3V3_CLEAN (3.3V ± 1%)',
        psrr: '>60dB @ 1kHz',
        noise: '<50µVrms',
        dropout: '130mV @ 2A'
      }
    ],
    topology_type: 'Two-stage: Buck + LDO',
    advantages: [
      'Ultra-low output noise suitable for analog/RF loads',
      'Excellent PSRR from LDO stage',
      'High efficiency buck converter reduces LDO power dissipation'
    ],
    tradeoffs: [
      'Lower overall efficiency than single-stage buck',
      'Additional component cost',
      'LDO thermal management required at high currents'
    ]
  },

  ground_architecture: {
    topology: 'Star ground with separated planes',
    ground_types: [
      {
        name: 'PGND',
        type: 'POWER_GROUND',
        connected_components: [
          'MAX8553E (Pin 8)',
          'LD39200DPUR (Pin 4, 5)',
          'Input connector',
          'Output connector',
          'Power capacitors'
        ],
        description: 'Primary power ground for high current return paths'
      },
      {
        name: 'AGND',
        type: 'ANALOG_GROUND',
        connected_components: [
          'Feedback resistor networks',
          'Compensation network',
          'Sensitive bypass capacitors'
        ],
        star_point: 'LD39200DPUR Pin 4/5',
        description: 'Analog ground for feedback signals, connects to PGND at LDO'
      },
      {
        name: 'SGND',
        type: 'SIGNAL_GROUND',
        connected_components: [
          'MAX8553E (Pin 6)',
          'Control signal components'
        ],
        description: 'Signal ground for control pins, connects to AGND at star point'
      }
    ],
    connection_hierarchy: 'SGND -> AGND -> PGND (single star point)'
  },

  required_support_components: {
    input_stage: {
      description: 'Components needed at input for protection and filtering',
      components: [
        { type: 'TVS_DIODE', function: 'Overvoltage protection', specs: '5.5V breakdown' },
        { type: 'CAPACITOR', function: 'Input bulk capacitance', value: '47µF', voltage: '10V', location: 'After protection diode' },
        { type: 'CAPACITOR', function: 'High frequency bypass', value: '0.1µF', voltage: '10V', location: 'Parallel to bulk cap' }
      ]
    },
    buck_input: {
      description: 'Components needed at MAX8553E VIN pin',
      components: [
        { type: 'CAPACITOR', function: 'Buck input decoupling', value: '10µF', voltage: '10V', placement: 'Within 5mm of Pin 1' }
      ]
    },
    buck_output: {
      description: 'Components needed at buck output for filtering and stability',
      components: [
        { type: 'CAPACITOR', function: 'Primary output capacitor', value: '47µF', voltage: '6.3V', esr: '<20mΩ', placement: 'Close to L2 output' },
        { type: 'CAPACITOR', function: 'Secondary output capacitor', value: '22µF', voltage: '6.3V', placement: 'Parallel to primary' },
        { type: 'CAPACITOR', function: 'High frequency bypass', value: '0.1µF', voltage: '10V', placement: 'Parallel to output caps' }
      ]
    },
    buck_feedback: {
      description: 'Components for output voltage setting',
      components: [
        { type: 'RESISTOR', function: 'Feedback divider upper', value: '100kΩ', tolerance: '1%', connection: 'VOUT_BUCK to FB' },
        { type: 'RESISTOR', function: 'Feedback divider lower', value: '24.9kΩ', tolerance: '1%', connection: 'FB to GND' }
      ],
      output_voltage: '3.2V',
      calculation: 'Vout = 0.8V * (R1 + R2) / R2 = 0.8V * (100k + 24.9k) / 24.9k = 3.2V'
    },
    buck_compensation: {
      description: 'Components for control loop stability',
      components: [
        { type: 'CAPACITOR', function: 'Compensation network', value: '100pF', voltage: '50V', connection: 'COMP pin to GND' }
      ]
    },
    buck_soft_start: {
      description: 'Components for soft-start timing',
      components: [
        { type: 'CAPACITOR', function: 'Soft-start timing', value: '1µF', voltage: '10V', connection: 'SS pin to GND', startup_time: '~10ms' }
      ]
    },
    inter_stage: {
      description: 'Components between buck and LDO',
      components: [
        { type: 'CAPACITOR', function: 'Filter capacitor', value: '10µF', voltage: '6.3V', placement: 'After L3' },
        { type: 'CAPACITOR', function: 'HF bypass', value: '1µF', voltage: '6.3V', placement: 'Parallel to filter cap' }
      ]
    },
    ldo_input: {
      description: 'Components needed at LD39200DPUR VIN pins',
      components: [
        { type: 'CAPACITOR', function: 'Input decoupling', value: '10µF', voltage: '6.3V', placement: 'Within 5mm of Pin 1, 2' },
        { type: 'CAPACITOR', function: 'HF bypass', value: '0.1µF', voltage: '10V', placement: 'Parallel to input cap' }
      ]
    },
    ldo_output: {
      description: 'Components needed at LDO output for stability',
      components: [
        { type: 'CAPACITOR', function: 'Primary output capacitor', value: '22µF', voltage: '6.3V', esr: '<20mΩ', placement: 'Within 10mm of Pin 7, 8', note: 'Required for LDO stability' },
        { type: 'CAPACITOR', function: 'Secondary output capacitor', value: '10µF', voltage: '6.3V', placement: 'Parallel to primary' },
        { type: 'CAPACITOR', function: 'HF bypass', value: '0.1µF', voltage: '10V', placement: 'Parallel to output caps' }
      ]
    },
    ldo_adjust: {
      description: 'Components for output voltage setting',
      components: [
        { type: 'RESISTOR', function: 'Adjust divider upper', value: '130kΩ', tolerance: '1%', connection: 'VOUT to ADJ' },
        { type: 'RESISTOR', function: 'Adjust divider lower', value: '51.1kΩ', tolerance: '1%', connection: 'ADJ to GND' }
      ],
      output_voltage: '3.3V',
      calculation: 'Vout = 0.8V * (R3 + R4) / R4 = 0.8V * (130k + 51.1k) / 51.1k = 3.3V'
    }
  },

  requirements: {
    '8d4ae261fc004800': {
      description: 'Input voltage range',
      criteria: 'The power input must accept a voltage range of 3.0V to 5.5V without damage or performance degradation.',
      priority: 'critical',
      mapped_components: ['MAX8553E', 'SPM5030VT-R68M-D (instance 1)'],
      verification: 'MAX8553E operates from 2.7-5.5V, exceeding requirement'
    },
    '49710dd554a084d4': {
      description: 'Output current capability',
      criteria: 'The power conditioning circuit must be able to supply a minimum of 2.0A at 3.3V.',
      priority: 'critical',
      mapped_components: ['LD39200DPUR', 'SRP4020TA-1R5M', 'SPM5030VT-R68M-D (both instances)'],
      verification: 'LD39200DPUR rated for 2A, SRP4020TA-1R5M rated for 4.5A RMS, both exceed requirement'
    }
  },

  design_notes: {
    topology_rationale: 'Two-stage Buck + LDO topology selected for ultra-low noise output suitable for analog/RF applications. Buck stage provides efficient voltage step-down, LDO provides final regulation with excellent PSRR and low noise.',
    inductor_usage: '680nH inductors used for filtering rather than power conversion due to low inductance and high saturation current. 1.5µH inductor sized for buck converter at 1.2MHz switching frequency.',
    thermal_considerations: 'LDO will dissipate significant heat (0.4-1.2W depending on input voltage). Thermal vias and copper pour required under LD39200DPUR thermal pad.',
    missing_components_note: 'This JSON describes the core power components only. Actual implementation requires all support components listed in \'required_support_components\' section.'
  }
};