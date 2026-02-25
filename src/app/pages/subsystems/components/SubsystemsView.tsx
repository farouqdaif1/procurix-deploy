import { useState } from 'react';
import type { Subsystem, Component, Requirement } from '@/app/types';
import { 
  Grid3x3, 
  ChevronRight, 
  CheckCircle2, 
  Package, 
  Cpu,
  ArrowLeft,
  Plus,
  FileText,
  AlertCircle,
  Zap,
  Shield,
  LayoutGrid,
  List,
  Layers,
  Search,
  X,
  Edit2,
  Check,
  Filter,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { Badge } from '@/app/shared/components/ui/badge';
import { Input } from '@/app/shared/components/ui/input';
import { Textarea } from '@/app/shared/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { FundamentalClassificationView } from '../../fundamental/components/FundamentalClassificationView';
import { SubsystemsFlowView } from './SubsystemsFlowView';

interface SubsystemsViewProps {
  subsystems: Subsystem[];
  components: Component[];
  requirements: Requirement[];
  onComplete: () => void;
  onAddRequirements: (newRequirements: Requirement[]) => void;
}

type SubsystemRequirementPriority = 'critical' | 'high' | 'mandatory' | 'medium' | 'low';

interface SubsystemRequirement {
  id: string;
  subsystemId: string;
  title: string;
  description: string;
  priority: SubsystemRequirementPriority;
  category: string;
}

export function SubsystemsView({ subsystems, components, requirements, onComplete, onAddRequirements }: SubsystemsViewProps) {
  const [selectedSubsystem, setSelectedSubsystem] = useState<Subsystem | null>(null);
  const [subsystemRequirements, setSubsystemRequirements] = useState<Record<string, SubsystemRequirement[]>>({});
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [viewMode, setViewMode] = useState<'structured' | 'grid' | 'classification'>('structured');
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: '',
  });
  const [classifiedComponents, setClassifiedComponents] = useState<Component[]>(components);
  const [isRequirementsExpanded, setIsRequirementsExpanded] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [requirementSearchQuery, setRequirementSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [editRequirement, setEditRequirement] = useState<{
    title: string;
    description: string;
    priority: SubsystemRequirementPriority;
    category: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
  });
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [editedSpecs, setEditedSpecs] = useState<Record<string, any>>({});

  const getSubsystemComponents = (subsystemId: string) => {
    const subsystem = subsystems.find(s => s.id === subsystemId);
    if (!subsystem) return [];
    return classifiedComponents.filter(c => subsystem.componentIds.includes(c.id));
  };

  const getSubsystemRequirements = (subsystemId: string) => {
    return subsystemRequirements[subsystemId] || [];
  };

  const handleAddRequirement = () => {
    if (!selectedSubsystem) return;
    
    if (!newRequirement.title.trim() || !newRequirement.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const requirement: SubsystemRequirement = {
      id: `req-${Date.now()}`,
      subsystemId: selectedSubsystem.id,
      title: newRequirement.title,
      description: newRequirement.description,
      priority: newRequirement.priority,
      category: newRequirement.category || 'Functional',
    };

    setSubsystemRequirements(prev => ({
      ...prev,
      [selectedSubsystem.id]: [...(prev[selectedSubsystem.id] || []), requirement],
    }));

    setNewRequirement({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
    });

    setIsAddingRequirement(false);
    toast.success('Requirement added!');
  };

  const handleDeleteRequirement = (reqId: string) => {
    if (!selectedSubsystem) return;

    setSubsystemRequirements(prev => ({
      ...prev,
      [selectedSubsystem.id]: prev[selectedSubsystem.id].filter(r => r.id !== reqId),
    }));

    toast.success('Requirement removed');
  };

  const handleEditRequirement = (req: SubsystemRequirement) => {
    setEditingRequirementId(req.id);
    setEditRequirement({
      title: req.title,
      description: req.description,
      priority: (req.priority === 'critical' || req.priority === 'mandatory' || req.priority === 'high' || req.priority === 'low' ? req.priority : 'medium') as SubsystemRequirementPriority,
      category: req.category,
    });
  };

  const handleSaveEditRequirement = () => {
    if (!selectedSubsystem || !editingRequirementId) return;
    
    if (!editRequirement.title.trim() || !editRequirement.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubsystemRequirements(prev => ({
      ...prev,
      [selectedSubsystem.id]: prev[selectedSubsystem.id].map(r =>
        r.id === editingRequirementId
          ? { ...r, ...editRequirement }
          : r
      ),
    }));

    setEditingRequirementId(null);
    setEditRequirement({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
    });
    toast.success('Requirement updated!');
  };

  const handleCancelEditRequirement = () => {
    setEditingRequirementId(null);
    setEditRequirement({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
    });
  };

  const handleEditSpecs = (component: Component) => {
    setIsEditingSpecs(true);
    setEditedSpecs({
      ...component.specs,
      manufacturer: component.manufacturer,
      partNumber: component.partNumber,
      description: component.description,
    });
  };

  const handleSaveSpecs = () => {
    if (!selectedComponent) return;
    
    setClassifiedComponents(prev =>
      prev.map(c =>
        c.id === selectedComponent.id
          ? {
              ...c,
              specs: {
                tolerance: editedSpecs.tolerance,
                tempRange: editedSpecs.tempRange,
                package: editedSpecs.package,
                voltage: editedSpecs.voltage,
                current: editedSpecs.current,
                power: editedSpecs.power,
              },
              manufacturer: editedSpecs.manufacturer,
              partNumber: editedSpecs.partNumber,
              description: editedSpecs.description,
            }
          : c
      )
    );
    
    setIsEditingSpecs(false);
    toast.success('Component specs updated!');
  };

  const handleCancelEditSpecs = () => {
    setIsEditingSpecs(false);
    setEditedSpecs({});
  };

  const handleViewDatasheet = (component: Component) => {
    // In a real app, this would open the actual datasheet URL
    const mockDatasheetUrl = `https://www.${component.manufacturer?.toLowerCase().replace(/\s+/g, '')}.com/datasheets/${component.partNumber}.pdf`;
    window.open(mockDatasheetUrl, '_blank');
    toast.success(`Opening datasheet for ${component.partNumber}`, {
      description: 'Datasheet link opened in new tab'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'mandatory':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Generate mock alternative components (unused but kept for future use)
  // @ts-expect-error - unused but kept for future use
  const generateAlternatives = (component: Component): Component[] => {
    return [
      {
        ...component,
        id: `${component.id}-alt-1`,
        partNumber: `${component.partNumber}-LC`, // Lower Cost variant
        manufacturer: component.manufacturer,
        description: `Cost-optimized alternative - ${component.description || 'Similar specs with economy package'}`,
        complianceStatus: Math.random() > 0.3 ? 'compliant' : 'unknown',
        specs: {
          ...component.specs,
          tolerance: '±5%', // Slightly worse tolerance
          tempRange: '-40°C to +85°C',
          package: 'SOT-23' // Smaller/cheaper package
        }
      },
      {
        ...component,
        id: `${component.id}-alt-2`,
        partNumber: `${component.partNumber}-HP`, // High Performance variant
        manufacturer: component.manufacturer,
        description: `High-performance alternative - ${component.description || 'Enhanced specs and reliability'}`,
        complianceStatus: 'compliant',
        specs: {
          ...component.specs,
          tolerance: '±1%', // Better tolerance
          tempRange: '-55°C to +125°C',
          package: 'DFN-8' // Better thermal package
        }
      },
      {
        ...component,
        id: `${component.id}-alt-3`,
        partNumber: `${component.partNumber?.replace(/\d+$/, (match) => String(Number(match) + 1))}`, // Different model number
        manufacturer: ['Texas Instruments', 'Analog Devices', 'STMicroelectronics', 'Infineon'][Math.floor(Math.random() * 4)], // Different manufacturer
        description: `Cross-manufacturer alternative - ${component.description || 'Compatible drop-in replacement'}`,
        complianceStatus: Math.random() > 0.5 ? 'compliant' : 'unknown',
        specs: {
          ...component.specs,
          tolerance: '±2%',
          tempRange: '-40°C to +105°C',
          package: 'SOIC-8'
        }
      }
    ];
  };

  const totalRequirementsCount = Object.values(subsystemRequirements).reduce(
    (sum, reqs) => sum + reqs.length,
    0
  );

  if (selectedSubsystem) {
    // Detail View
    const subsystemComps = getSubsystemComponents(selectedSubsystem.id);
    const subsystemReqs = getSubsystemRequirements(selectedSubsystem.id);
    
    // Filter requirements based on search query and priority
    const filterRequirements = (reqs: SubsystemRequirement[]) => {
      let filtered = reqs;
      
      // Apply search filter
      if (requirementSearchQuery.trim()) {
        const query = requirementSearchQuery.toLowerCase();
        filtered = filtered.filter((req) => {
          const title = (req.title || '').toLowerCase();
          const description = (req.description || '').toLowerCase();
          const category = (req.category || '').toLowerCase();
          
          return (
            title.includes(query) ||
            description.includes(query) ||
            category.includes(query)
          );
        });
      }
      
      // Apply priority filter
      if (priorityFilter !== 'all') {
        filtered = filtered.filter((req) => {
          if (priorityFilter === 'high') {
            return req.priority === 'critical' || req.priority === 'high' || req.priority === 'mandatory';
          } else if (priorityFilter === 'medium') {
            return req.priority === 'medium';
          } else if (priorityFilter === 'low') {
            return req.priority === 'low';
          }
          return true;
        });
      }
      
      return filtered;
    };
    
    const filteredSubsystemReqs = filterRequirements(subsystemReqs);

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <div className="border-b bg-white/80 backdrop-blur-sm px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedSubsystem(null);
                  setIsAddingRequirement(false);
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-3">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedSubsystem.name}</h1>
                <p className="text-sm text-gray-600">{selectedSubsystem.type}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  <span className="font-semibold">{subsystemComps.length}</span> components
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  <span className="font-semibold">{subsystemReqs.length}</span> functional requirements
                </span>
              </div>
              {selectedSubsystem.complianceScore !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    <span className="font-semibold">{selectedSubsystem.complianceScore}%</span> compliance
                  </span>
                </div>
              )}
              
              {/* Quick Action: Generate Smart Requirements */}
              <div className="ml-auto">
                <Button
                  onClick={() => {
                    // Generate comprehensive AI-powered requirements
                    const newRequirements: Requirement[] = [];
                    const newSubsystemRequirements: SubsystemRequirement[] = [];
                    let reqCounter = 1;
                    
                    // Helper function to add both requirement types simultaneously
                    const addReq = (title: string, desc: string, validationType: string, priority: 'high' | 'medium' | 'critical' | 'mandatory' | 'low', category: string) => {
                      const id = `req-${Date.now()}-${reqCounter++}`;
                      const code = `REQ-${category.toUpperCase().substring(0, 3)}-${String(newRequirements.length + 1).padStart(3, '0')}`;
                      newRequirements.push({
                        id,
                        code,
                        title,
                        description: desc,
                        validationType: validationType as 'threshold' | 'boolean' | 'range' | 'enum',
                        isPassed: true,
                        priority: priority as 'critical' | 'high' | 'mandatory' | 'medium' | 'low',
                        category,
                        affectedComponents: subsystemComps.map(c => c.id)
                      });
                      newSubsystemRequirements.push({
                        id,
                        subsystemId: selectedSubsystem.id,
                        title,
                        description: desc,
                        priority,
                        category
                      });
                    };
                    
                    // Deep component analysis with expanded detection patterns
                    const hasPowerComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('power') || 
                      c.type?.toLowerCase().includes('regulator') ||
                      c.type?.toLowerCase().includes('converter') ||
                      c.reference?.toLowerCase().includes('power') ||
                      c.partNumber?.toLowerCase().includes('ldo')
                    );
                    
                    const hasProcessingComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('processor') || 
                      c.type?.toLowerCase().includes('mcu') ||
                      c.reference?.toLowerCase().includes('cpu') ||
                      c.partNumber?.toLowerCase().includes('stm32')
                    );
                    
                    const hasCommunicationComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('communication') || 
                      c.reference?.toLowerCase().includes('uart') ||
                      c.reference?.toLowerCase().includes('usb') ||
                      c.reference?.toLowerCase().includes('can')
                    );
                    
                    const hasSensorComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('sensor') || 
                      c.reference?.toLowerCase().includes('sensor')
                    );
                    
                    const hasMemoryComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('memory') || 
                      c.type?.toLowerCase().includes('flash')
                    );
                    
                    const hasDisplayComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('display') || 
                      c.type?.toLowerCase().includes('lcd')
                    );
                    
                    const hasConnectorComponents = subsystemComps.some(c => 
                      c.type?.toLowerCase().includes('connector')
                    );
                    
                    // Power requirements
                    if (hasPowerComponents) {
                      addReq('Power Supply Stability', 'Maintain voltage regulation within ±5% under all load conditions (0-100%)', 'performance', 'high', 'Power');
                      addReq('Power Efficiency', 'Achieve minimum 85% power conversion efficiency at nominal load', 'performance', 'medium', 'Power');
                      addReq('Ripple & Noise', 'Output ripple shall not exceed 50mV p-p under full load', 'performance', 'medium', 'Power');
                    }
                    
                    // Processing requirements
                    if (hasProcessingComponents) {
                      addReq('Processing Performance', 'Complete critical tasks within 100ms response time', 'performance', 'high', 'Processing');
                      addReq('Memory Management', 'Operate within allocated memory with no stack overflow', 'functional', 'high', 'Processing');
                      addReq('Watchdog Protection', 'Implement watchdog to recover from hangs within 500ms', 'reliability', 'high', 'Reliability');
                    }
                    
                    // Communication requirements
                    if (hasCommunicationComponents) {
                      addReq('Data Integrity', 'Maintain bit error rate (BER) < 1×10⁻⁶', 'reliability', 'high', 'Communication');
                      addReq('Protocol Compliance', 'Comply with industry standard protocols (USB 2.0, CAN 2.0B)', 'functional', 'high', 'Communication');
                      addReq('Error Recovery', 'Implement CRC validation and auto-retry for failed transmissions', 'reliability', 'medium', 'Communication');
                    }
                    
                    // Sensor requirements
                    if (hasSensorComponents) {
                      addReq('Sensor Accuracy', 'Maintain accuracy within ±2% of full-scale range', 'performance', 'high', 'Sensor');
                      addReq('Calibration Support', 'Support field calibration with non-volatile coefficient storage', 'functional', 'medium', 'Sensor');
                    }
                    
                    // Memory requirements
                    if (hasMemoryComponents) {
                      addReq('Data Persistence', 'Store critical data in NVM with wear-leveling', 'reliability', 'high', 'Memory');
                    }
                    
                    // Display requirements
                    if (hasDisplayComponents) {
                      addReq('Display Readability', 'Maintain readability under 0-100,000 lux ambient light', 'performance', 'medium', 'Display');
                    }
                    
                    // Connector requirements
                    if (hasConnectorComponents) {
                      addReq('ESD Protection', 'Protect external pins against ±8kV contact discharge', 'safety', 'high', 'Safety');
                    }
                    
                    // Universal requirements (always added)
                    addReq('Operating Temperature', 'Operate within -40°C to +85°C ambient temperature', 'environmental', 'high', 'Environmental');
                    addReq('Component Integration', `All ${subsystemComps.length} components interface with verified compatibility`, 'functional', 'high', 'Integration');
                    addReq('Thermal Management', 'Junction temps shall not exceed manufacturer specs under max load', 'thermal', 'high', 'Thermal');
                    addReq('EMC Compliance', 'Meet EMI/EMC per IEC 61000-6-3 emissions and 6-2 immunity', 'compliance', 'high', 'Compliance');
                    addReq('Reliability MTBF', 'Achieve Mean Time Between Failures (MTBF) > 50,000 hours', 'reliability', 'medium', 'Reliability');
                    
                    // Update local subsystem requirements state so they show immediately
                    setSubsystemRequirements(prev => ({
                      ...prev,
                      [selectedSubsystem.id]: [
                        ...(prev[selectedSubsystem.id] || []),
                        ...newSubsystemRequirements
                      ]
                    }));
                    
                    // Also update parent state
                    onAddRequirements(newRequirements);
                    
                    toast.success(`Generated ${newRequirements.length} smart requirements for ${selectedSubsystem.name}`, {
                      description: `AI analyzed ${subsystemComps.length} components and created comprehensive specs`
                    });
                  }}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Zap className="h-4 w-4" />
                  Generate Smart Requirements
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Functional Requirements Section */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Functional Subsystem Requirements ({subsystemReqs.length})
                </h2>
                {!isAddingRequirement && !editingRequirementId && (
                  <Button onClick={() => setIsAddingRequirement(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </Button>
                )}
              </div>

              {/* Search Bar and Priority Filters */}
              {subsystemReqs.length > 0 && !isAddingRequirement && !editingRequirementId && (
                <div className="mb-6 space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      value={requirementSearchQuery}
                      onChange={(e) => setRequirementSearchQuery(e.target.value)}
                      placeholder="Search requirements by title, description, or category..."
                      className="pl-12 pr-12"
                    />
                    {requirementSearchQuery && (
                      <button
                        onClick={() => setRequirementSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Priority Filter Buttons */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Priority:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={priorityFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriorityFilter('all')}
                        className="text-xs"
                      >
                        All ({subsystemReqs.length})
                      </Button>
                      <Button
                        variant={priorityFilter === 'high' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriorityFilter('high')}
                        className="text-xs"
                      >
                        High ({subsystemReqs.filter(r => r.priority === 'critical' || r.priority === 'high' || r.priority === 'mandatory').length})
                      </Button>
                      <Button
                        variant={priorityFilter === 'medium' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriorityFilter('medium')}
                        className="text-xs"
                      >
                        Medium ({subsystemReqs.filter(r => r.priority === 'medium').length})
                      </Button>
                      <Button
                        variant={priorityFilter === 'low' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriorityFilter('low')}
                        className="text-xs"
                      >
                        Low ({subsystemReqs.filter(r => r.priority === 'low').length})
                      </Button>
                    </div>
                  </div>

                  {/* Results Counter */}
                  {(requirementSearchQuery || priorityFilter !== 'all') && (
                    <div className="text-xs text-gray-600">
                      Showing {filteredSubsystemReqs.length} of {subsystemReqs.length} requirements
                    </div>
                  )}
                </div>
              )}

              {/* Add Requirement Form */}
              {isAddingRequirement && (
                <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">New Functional Requirement</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Title *
                      </label>
                      <Input
                        placeholder="e.g., Output voltage regulation accuracy"
                        value={newRequirement.title}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Description *
                      </label>
                      <Textarea
                        placeholder="Detailed requirement description..."
                        value={newRequirement.description}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Priority
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={newRequirement.priority}
                          onChange={(e) => setNewRequirement(prev => ({ 
                            ...prev, 
                            priority: e.target.value as any 
                          }))}
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="mandatory">Mandatory</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Category
                        </label>
                        <Input
                          placeholder="e.g., Power, Safety"
                          value={newRequirement.category}
                          onChange={(e) => setNewRequirement(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddRequirement}>
                        Save Requirement
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingRequirement(false);
                          setNewRequirement({
                            title: '',
                            description: '',
                            priority: 'medium',
                            category: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements List */}
              {subsystemReqs.length === 0 && !isAddingRequirement ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-4">No functional requirements yet</p>
                  <Button onClick={() => setIsAddingRequirement(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Requirement
                  </Button>
                </div>
              ) : subsystemReqs.length > 0 && (
                <>
                  <div className="space-y-3">
                    {(isRequirementsExpanded ? filteredSubsystemReqs : filteredSubsystemReqs.slice(0, 5)).map((req) => {
                      const isEditing = editingRequirementId === req.id;
                      
                      return (
                        <div
                          key={req.id}
                          className={`rounded-lg border p-4 transition-all ${
                            isEditing 
                              ? 'border-blue-400 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          {isEditing ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <h3 className="font-semibold text-gray-900 mb-3">Edit Requirement</h3>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Title *
                                </label>
                                <Input
                                  placeholder="e.g., Output voltage regulation accuracy"
                                  value={editRequirement.title}
                                  onChange={(e) => setEditRequirement(prev => ({ ...prev, title: e.target.value }))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Description *
                                </label>
                                <Textarea
                                  placeholder="Detailed requirement description..."
                                  value={editRequirement.description}
                                  onChange={(e) => setEditRequirement(prev => ({ ...prev, description: e.target.value }))}
                                  rows={3}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Priority
                                  </label>
                                  <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={editRequirement.priority}
                                    onChange={(e) => setEditRequirement(prev => ({ 
                                      ...prev, 
                                      priority: e.target.value as any 
                                    }))}
                                  >
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="mandatory">Mandatory</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Category
                                  </label>
                                  <Input
                                    placeholder="e.g., Power, Safety"
                                    value={editRequirement.category}
                                    onChange={(e) => setEditRequirement(prev => ({ ...prev, category: e.target.value }))}
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button onClick={handleSaveEditRequirement} className="gap-2">
                                  <Check className="h-4 w-4" />
                                  Save Changes
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={handleCancelEditRequirement}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{req.title}</h4>
                                  <Badge className={getPriorityColor(req.priority)}>
                                    {req.priority}
                                  </Badge>
                                  {req.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {req.category}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{req.description}</p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRequirement(req)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRequirement(req.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show More/Less Button */}
                  {filteredSubsystemReqs.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
                        className="gap-2"
                      >
                        {isRequirementsExpanded ? (
                          <>
                            Show Less
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </>
                        ) : (
                          <>
                            Show {filteredSubsystemReqs.length - 5} More
                            <ChevronRight className="h-4 w-4 -rotate-90" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* No Results Message */}
                  {filteredSubsystemReqs.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No requirements found</p>
                      <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Components Section */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Components ({subsystemComps.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subsystemComps.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedComponent(comp)}
                    className={`rounded-lg border p-3 transition-all text-left ${
                      selectedComponent?.id === comp.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm text-gray-900">{comp.reference}</div>
                      {comp.complianceStatus === 'compliant' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {comp.complianceStatus === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{comp.partNumber || 'Generic'}</div>
                    <div className="text-xs text-gray-500">{comp.manufacturer || 'N/A'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Component Specs Section */}
            {selectedComponent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Component Specifications</h2>
                      <p className="text-sm text-gray-600">{selectedComponent.reference}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedComponent(null);
                      setIsEditingSpecs(false);
                      setEditedSpecs({});
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Current Component Header */}
                <div className="rounded-lg border-2 border-blue-300 bg-white p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-lg">{selectedComponent.partNumber}</h3>
                      {selectedComponent.complianceStatus === 'compliant' && (
                        <Badge className="bg-green-100 text-green-700">Compliant</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isEditingSpecs && (
                        <>
                          <Button
                            onClick={() => handleEditSpecs(selectedComponent)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Specs
                          </Button>
                          <Button
                            onClick={() => handleViewDatasheet(selectedComponent)}
                            variant="default"
                            size="sm"
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Datasheet
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedComponent.manufacturer || 'N/A'} • {selectedComponent.type || 'N/A'}
                  </p>
                </div>

                {isEditingSpecs ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 mb-4">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-semibold">Editing Component Specifications</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Part Number
                        </label>
                        <Input
                          value={editedSpecs.partNumber || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, partNumber: e.target.value }))}
                          placeholder="e.g., TPS54331DR"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Manufacturer
                        </label>
                        <Input
                          value={editedSpecs.manufacturer || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, manufacturer: e.target.value }))}
                          placeholder="e.g., Texas Instruments"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Value
                        </label>
                        <Input
                          value={editedSpecs.value || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, value: e.target.value }))}
                          placeholder="e.g., 10uF, 100kΩ"
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Price ($)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editedSpecs.price || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g., 2.50"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Tolerance
                        </label>
                        <Input
                          value={editedSpecs.tolerance || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, tolerance: e.target.value }))}
                          placeholder="e.g., ±5%, ±1%"
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Temperature Range
                        </label>
                        <Input
                          value={editedSpecs.tempRange || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, tempRange: e.target.value }))}
                          placeholder="e.g., -40°C to +85°C"
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Package
                        </label>
                        <Input
                          value={editedSpecs.package || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, package: e.target.value }))}
                          placeholder="e.g., SOIC-8, 0603"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Voltage
                        </label>
                        <Input
                          value={editedSpecs.voltage || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, voltage: e.target.value }))}
                          placeholder="e.g., 3.3V, 12V"
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Current
                        </label>
                        <Input
                          value={editedSpecs.current || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, current: e.target.value }))}
                          placeholder="e.g., 500mA, 2A"
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Power
                        </label>
                        <Input
                          value={editedSpecs.power || ''}
                          onChange={(e) => setEditedSpecs(prev => ({ ...prev, power: e.target.value }))}
                          placeholder="e.g., 250mW, 1/4W"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Description
                      </label>
                      <Textarea
                        value={editedSpecs.description || ''}
                        onChange={(e) => setEditedSpecs(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Component description..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={handleSaveSpecs} className="gap-2">
                        <Check className="h-4 w-4" />
                        Save Specifications
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEditSpecs}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-4">
                    {/* Description */}
                    {selectedComponent.description && (
                      <div className="rounded-lg bg-white border border-gray-200 p-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Description
                        </div>
                        <p className="text-sm text-gray-700">{selectedComponent.description}</p>
                      </div>
                    )}

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                      {selectedComponent.specs?.tolerance && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Tolerance
                          </div>
                          <div className="text-lg font-bold text-gray-900 font-mono">
                            {selectedComponent.specs.tolerance}
                          </div>
                        </div>
                      )}

                      {selectedComponent.specs?.tempRange && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Temperature Range
                          </div>
                          <div className="text-sm font-bold text-gray-900 font-mono">
                            {selectedComponent.specs.tempRange}
                          </div>
                        </div>
                      )}

                      {selectedComponent.specs?.package && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Package
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {selectedComponent.specs.package}
                          </div>
                        </div>
                      )}

                      {selectedComponent.specs?.voltage && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Voltage
                          </div>
                          <div className="text-lg font-bold text-gray-900 font-mono">
                            {selectedComponent.specs.voltage}
                          </div>
                        </div>
                      )}

                      {selectedComponent.specs?.current && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Current
                          </div>
                          <div className="text-lg font-bold text-gray-900 font-mono">
                            {selectedComponent.specs.current}
                          </div>
                        </div>
                      )}

                      {selectedComponent.specs?.power && (
                        <div className="rounded-lg bg-white border border-gray-200 p-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Power
                          </div>
                          <div className="text-lg font-bold text-gray-900 font-mono">
                            {selectedComponent.specs.power}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-1">Need more information?</h4>
                          <p className="text-sm text-blue-800 mb-3">
                            View the complete datasheet for detailed specifications, performance graphs, and application notes.
                          </p>
                          <Button
                            onClick={() => handleViewDatasheet(selectedComponent)}
                            variant="default"
                            size="sm"
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open Datasheet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Overview - List of Subsystems
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Subsystems Analysis</h1>
              <p className="text-gray-600">
                Components grouped into {subsystems.length} functional subsystems
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('structured')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'structured'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Structured
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('classification')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'classification'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Classification
                </button>
              </div>
              <Button onClick={onComplete} size="lg" className="gap-2">
                Continue to Compliance
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b bg-white/60 backdrop-blur-sm px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Grid3x3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{subsystems.length}</div>
              <div className="text-xs text-gray-600">Subsystems</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{components.length}</div>
              <div className="text-xs text-gray-600">Components</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalRequirementsCount}</div>
              <div className="text-xs text-gray-600">Functional Requirements</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystems Grid */}
      <div className={`flex-1 ${viewMode === 'grid' ? 'overflow-hidden relative' : 'overflow-auto px-8 py-6'}`}>
        {viewMode === 'grid' ? (
          /* React Flow View - Interactive Subsystems and Components */
          <div className="absolute inset-0">
            <SubsystemsFlowView
              subsystems={subsystems}
              components={classifiedComponents}
              requirements={requirements}
              onComplete={onComplete}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {viewMode === 'structured' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subsystems.map((subsystem) => {
                const subsystemComps = getSubsystemComponents(subsystem.id);
                const subsystemReqs = getSubsystemRequirements(subsystem.id);

                return (
                  <button
                    key={subsystem.id}
                    onClick={() => setSelectedSubsystem(subsystem)}
                    className="group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-purple-400 hover:shadow-lg"
                  >
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="relative">
                      {/* Icon and Title */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="rounded-lg bg-purple-100 p-3 group-hover:bg-purple-200 transition-colors">
                          <Cpu className="h-6 w-6 text-purple-600" />
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-purple-600" />
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 mb-1 transition-colors">
                        {subsystem.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">{subsystem.type}</p>

                      {/* Stats */}
                      <div className="space-y-2 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Components</span>
                          <span className="font-semibold text-gray-900">{subsystemComps.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Requirements</span>
                          <span className="font-semibold text-gray-900">{subsystemReqs.length}</span>
                        </div>
                        {subsystem.complianceScore !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Compliance</span>
                            <span className={`font-semibold ${
                              subsystem.complianceScore >= 70 ? 'text-green-600' :
                              subsystem.complianceScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {subsystem.complianceScore}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : viewMode === 'classification' ? (
            /* Classification View - Fundamental vs Auxiliary */
            <FundamentalClassificationView
              components={classifiedComponents}
              onClassificationComplete={(newComponents) => {
                setClassifiedComponents(newComponents);
                toast.success('Classification updated!');
                setViewMode('structured');
              }}
            />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
