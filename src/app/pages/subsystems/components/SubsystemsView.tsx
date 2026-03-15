import { useState, useEffect } from 'react';
import type { Subsystem, Component, Requirement } from '@/app/types';
import { getSubsystemDetails, getSubsystemRequirementsBySubsystemId, generateSubsystemRequirements, createSubsystemRequirement, updateSubsystem, type SubsystemRequirementItem, type SubsystemDetailsResponse } from '@/app/services/api';
import { 
  Grid3x3, 
  ChevronRight, 
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
  GitBranch,
  ArrowRight
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
  sessionId: string;
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

interface ActualPart {
  part_number: string;
  quantity: number;
  specs: Record<string, any>;
}

interface ComponentBOMItem {
  component_id: string;
  quantity: number;
}

interface InternalConnection {
  source_part: string;
  target_part: string;
  connection_type: string;
  reasoning: string;
}

export function SubsystemsView({ subsystems, components, requirements, onComplete, onAddRequirements, sessionId }: SubsystemsViewProps) {
  const [selectedSubsystem, setSelectedSubsystem] = useState<Subsystem | null>(null);
  const [subsystemDetails, setSubsystemDetails] = useState<any>(null);
  const [subsystemRequirements, setSubsystemRequirements] = useState<Record<string, SubsystemRequirement[]>>({});
  const [subsystemComponents, setSubsystemComponents] = useState<Record<string, Component[]>>({});
  const [subsystemActualParts, setSubsystemActualParts] = useState<Record<string, ActualPart[]>>({});
  const [subsystemComponentBOM, setSubsystemComponentBOM] = useState<Record<string, ComponentBOMItem[]>>({});
  const [subsystemInternalConnections, setSubsystemInternalConnections] = useState<Record<string, InternalConnection[]>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [requirementsNotFound, setRequirementsNotFound] = useState<Record<string, boolean>>({});
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
  const [selectedPart, setSelectedPart] = useState<{ componentId: string; quantity: number } | null>(null);
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
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState(false);
  const [showCreateRequirementModal, setShowCreateRequirementModal] = useState(false);
  const [isCreatingRequirement, setIsCreatingRequirement] = useState(false);
  const [createRequirementForm, setCreateRequirementForm] = useState({
    description: '',
    criteria: '',
    priority: 'medium',
    mapped_components: [] as string[],
  });
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [isRemovingPart, setIsRemovingPart] = useState<string | null>(null);
  const [addPartForm, setAddPartForm] = useState({
    part_number: '',
    quantity: 1,
  });

  // Fetch subsystem details and requirements when a subsystem is selected
  useEffect(() => {
    const fetchSubsystemData = async () => {
      if (!selectedSubsystem || !sessionId) return;

      setIsLoadingDetails(true);
      setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: false }));
      
      // Clear any existing requirements for this subsystem to prevent stale data
      // They will be refetched below
      setSubsystemRequirements(prev => ({
        ...prev,
        [selectedSubsystem.id]: [],
      }));

      try {
        // 1. Fetch subsystem details
        const detailsResponse = await getSubsystemDetails(sessionId, selectedSubsystem.id);
        setSubsystemDetails(detailsResponse);

        // Store component_bom (for display and add/remove operations)
        if (detailsResponse.component_bom && Array.isArray(detailsResponse.component_bom)) {
          const componentBOM: ComponentBOMItem[] = detailsResponse.component_bom.map((item: any) => ({
            component_id: item.component_id,
            quantity: item.quantity || 1,
          }));
          
          setSubsystemComponentBOM(prev => ({
            ...prev,
            [selectedSubsystem.id]: componentBOM,
          }));
        } else {
          setSubsystemComponentBOM(prev => ({
            ...prev,
            [selectedSubsystem.id]: [],
          }));
        }

        // Store actual parts with specs (only for displaying specs)
        if (detailsResponse.actual_parts_bom && Array.isArray(detailsResponse.actual_parts_bom)) {
          const actualParts: ActualPart[] = detailsResponse.actual_parts_bom.map((part: any) => ({
            part_number: part.part_number,
            quantity: part.quantity || 1,
            specs: part.specs || {},
          }));
          
          setSubsystemActualParts(prev => ({
            ...prev,
            [selectedSubsystem.id]: actualParts,
          }));
        } else {
          setSubsystemActualParts(prev => ({
            ...prev,
            [selectedSubsystem.id]: [],
          }));
        }

        // Store internal connections (using type assertion since it's not in the type definition yet)
        const detailsWithConnections = detailsResponse as SubsystemDetailsResponse & { internal_connections?: InternalConnection[] };
        if (detailsWithConnections.internal_connections && Array.isArray(detailsWithConnections.internal_connections)) {
          const connections: InternalConnection[] = detailsWithConnections.internal_connections.map((conn: any) => ({
            source_part: conn.source_part,
            target_part: conn.target_part,
            connection_type: conn.connection_type || 'unknown',
            reasoning: conn.reasoning || '',
          }));
          
          setSubsystemInternalConnections(prev => ({
            ...prev,
            [selectedSubsystem.id]: connections,
          }));
        } else {
          // Clear connections if not present
          setSubsystemInternalConnections(prev => ({
            ...prev,
            [selectedSubsystem.id]: [],
          }));
        }

        // Update components list with detailed BOM data (for backward compatibility)
        const detailedComponents: Component[] = detailsResponse.actual_parts_bom
          .map((part: any) => {
            // Only use existing component if found, otherwise skip
            const existingComponent = classifiedComponents.find(
              c => c.id === part.part_number || c.partNumber === part.part_number
            );
            return existingComponent;
          })
          .filter((component: Component | undefined): component is Component => component !== undefined);

        setSubsystemComponents(prev => ({
          ...prev,
          [selectedSubsystem.id]: detailedComponents,
        }));

        // 2. Fetch subsystem requirements
        try {
          const requirementsResponse = await getSubsystemRequirementsBySubsystemId(sessionId, selectedSubsystem.id);
          
          // Check if requirements not found
          if ('detail' in requirementsResponse && requirementsResponse.detail === 'Subsystem requirements not found') {
            setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
            setSubsystemRequirements(prev => ({
              ...prev,
              [selectedSubsystem.id]: [],
            }));
          } else if ('requirements' in requirementsResponse && Array.isArray(requirementsResponse.requirements)) {
            // New format: direct requirements array
            // Filter to ensure requirements belong to this specific subsystem
            const subsystemReqs = requirementsResponse.requirements.filter(
              (req: any) => req.subsystem_id === selectedSubsystem.id
            );
            
            // Check if requirements array is empty
            if (subsystemReqs.length === 0) {
              setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
              setSubsystemRequirements(prev => ({
                ...prev,
                [selectedSubsystem.id]: [],
              }));
            } else {
              // Map API requirements to SubsystemRequirement format
              // Always use selectedSubsystem.id to ensure correct association
              const mappedRequirements: SubsystemRequirement[] = subsystemReqs.map((req: any) => ({
                id: req.req_id,
                subsystemId: selectedSubsystem.id, // Use selected subsystem ID, not API's subsystem_id
                title: req.description,
                description: req.criteria,
                priority: (req.priority || 'medium') as SubsystemRequirementPriority,
                category: 'Functional',
              }));

              setSubsystemRequirements(prev => ({
                ...prev,
                [selectedSubsystem.id]: mappedRequirements,
              }));
              setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: false }));
            }
          } else if ('subsystem_requirements' in requirementsResponse) {
            // Old format: subsystem_requirements array
            const subsystemReqs = requirementsResponse.subsystem_requirements.find(
              (sr: any) => sr.subsystem_id === selectedSubsystem.id
            );
            
            if (subsystemReqs && subsystemReqs.requirements) {
              // Filter to ensure requirements belong to this specific subsystem
              const filteredReqs = subsystemReqs.requirements.filter(
                (req: any) => (req.subsystem_id || subsystemReqs.subsystem_id) === selectedSubsystem.id
              );
              
              // Check if requirements array is empty after filtering
              if (filteredReqs.length === 0) {
                setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
                setSubsystemRequirements(prev => ({
                  ...prev,
                  [selectedSubsystem.id]: [],
                }));
              } else {
                // Map API requirements to SubsystemRequirement format
                // Always use selectedSubsystem.id to ensure correct association
                const mappedRequirements: SubsystemRequirement[] = filteredReqs.map((req: any) => ({
                  id: req.req_id || req.id,
                  subsystemId: selectedSubsystem.id, // Use selected subsystem ID
                  title: req.description || req.title,
                  description: req.criteria || req.description,
                  priority: (req.priority || 'medium') as SubsystemRequirementPriority,
                  category: req.category || 'Functional',
                }));

                setSubsystemRequirements(prev => ({
                  ...prev,
                  [selectedSubsystem.id]: mappedRequirements,
                }));
                setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: false }));
              }
            } else {
              // No requirements found in old format
              setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
              setSubsystemRequirements(prev => ({
                ...prev,
                [selectedSubsystem.id]: [],
              }));
            }
          } else {
            // No requirements found - unknown format or empty
            setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
            setSubsystemRequirements(prev => ({
              ...prev,
              [selectedSubsystem.id]: [],
            }));
          }
        } catch (reqError: any) {
          console.warn('Failed to fetch subsystem requirements:', reqError);
          // Check if it's a "not found" error
          if (reqError.message?.includes('not found') || reqError.message?.includes('404')) {
            setRequirementsNotFound(prev => ({ ...prev, [selectedSubsystem.id]: true }));
          }
          setSubsystemRequirements(prev => ({
            ...prev,
            [selectedSubsystem.id]: [],
          }));
        }
      } catch (error) {
        console.error('Failed to fetch subsystem details:', error);
        toast.error('Failed to load subsystem details');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchSubsystemData();
  }, [selectedSubsystem, sessionId, classifiedComponents]);

  const getSubsystemComponents = (subsystemId: string) => {
    // Use detailed components if available, otherwise fall back to filtering
    if (subsystemComponents[subsystemId]) {
      return subsystemComponents[subsystemId];
    }
    const subsystem = subsystems.find(s => s.id === subsystemId);
    if (!subsystem) return [];
    return classifiedComponents.filter(c => subsystem.componentIds.includes(c.id));
  };

  const getSubsystemActualParts = (subsystemId: string): ActualPart[] => {
    return subsystemActualParts[subsystemId] || [];
  };

  const getSubsystemComponentBOM = (subsystemId: string): ComponentBOMItem[] => {
    return subsystemComponentBOM[subsystemId] || [];
  };

  const getSubsystemInternalConnections = (subsystemId: string): InternalConnection[] => {
    return subsystemInternalConnections[subsystemId] || [];
  };

  // Get specs for a component_id from actual_parts_bom
  const getPartSpecs = (subsystemId: string, componentId: string): ActualPart | null => {
    const actualParts = getSubsystemActualParts(subsystemId);
    return actualParts.find(p => p.part_number === componentId) || null;
  };

  const getConnectionTypeColor = (connectionType: string) => {
    switch (connectionType.toLowerCase()) {
      case 'power':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'signal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'data':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ground':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const handleAddPart = async () => {
    if (!selectedSubsystem || !sessionId || !subsystemDetails) return;
    
    if (!addPartForm.part_number.trim()) {
      toast.error('Please enter a part number');
      return;
    }

    setIsAddingPart(true);
    try {
      // Get current component_bom list
      const currentBOM = getSubsystemComponentBOM(selectedSubsystem.id);
      
      // Check if component already exists
      const existingPartIndex = currentBOM.findIndex(
        item => item.component_id === addPartForm.part_number.trim()
      );

      let updatedBOM: ComponentBOMItem[];
      if (existingPartIndex >= 0) {
        // Update quantity if component already exists
        updatedBOM = currentBOM.map((item, index) =>
          index === existingPartIndex
            ? { ...item, quantity: item.quantity + (addPartForm.quantity || 1) }
            : item
        );
      } else {
        // Add new component
        updatedBOM = [
          ...currentBOM,
          {
            component_id: addPartForm.part_number.trim(),
            quantity: addPartForm.quantity || 1,
          },
        ];
      }

      // Update subsystem using PUT - only update component_bom, keep actual_parts_bom as is
      const response = await updateSubsystem(sessionId, selectedSubsystem.id, {
        name: subsystemDetails.name,
        description: subsystemDetails.description,
        component_bom: updatedBOM,
        actual_parts_bom: subsystemDetails.actual_parts_bom || [],
        requirements: subsystemDetails.requirements || {},
      });

      if (response.success || response.subsystem) {
        // Update local state with new component_bom
        setSubsystemComponentBOM(prev => ({
          ...prev,
          [selectedSubsystem.id]: updatedBOM,
        }));

        // Update subsystem details if returned
        if (response.subsystem) {
          setSubsystemDetails(response.subsystem);
          // Also update component_bom from response
          if (response.subsystem.component_bom) {
            setSubsystemComponentBOM(prev => ({
              ...prev,
              [selectedSubsystem.id]: response.subsystem!.component_bom,
            }));
          }
        }

        toast.success('Part added successfully!');
        setShowAddPartModal(false);
        setAddPartForm({ part_number: '', quantity: 1 });
      } else {
        toast.error(response.message || 'Failed to add part');
      }
    } catch (error: any) {
      console.error('Failed to add part:', error);
      toast.error(error.message || 'Failed to add part to subsystem');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleRemovePart = async (componentId: string) => {
    if (!selectedSubsystem || !sessionId || !subsystemDetails) return;

    // Confirm removal
    if (!confirm(`Are you sure you want to remove part "${componentId}" from this subsystem?`)) {
      return;
    }

    setIsRemovingPart(componentId);
    try {
      // Get current component_bom list and remove the component
      const currentBOM = getSubsystemComponentBOM(selectedSubsystem.id);
      const updatedBOM = currentBOM.filter(item => item.component_id !== componentId);

      // Update subsystem using PUT - only update component_bom, keep actual_parts_bom as is
      const response = await updateSubsystem(sessionId, selectedSubsystem.id, {
        name: subsystemDetails.name,
        description: subsystemDetails.description,
        component_bom: updatedBOM,
        actual_parts_bom: subsystemDetails.actual_parts_bom || [],
        requirements: subsystemDetails.requirements || {},
      });

      if (response.success || response.subsystem) {
        // Update local state with new component_bom
        setSubsystemComponentBOM(prev => ({
          ...prev,
          [selectedSubsystem.id]: updatedBOM,
        }));

        // Update subsystem details if returned
        if (response.subsystem) {
          setSubsystemDetails(response.subsystem);
          // Also update component_bom from response
          if (response.subsystem.component_bom) {
            setSubsystemComponentBOM(prev => ({
              ...prev,
              [selectedSubsystem.id]: response.subsystem!.component_bom,
            }));
          }
        }

        // Clear selected part if it was removed
        if (selectedPart?.componentId === componentId) {
          setSelectedPart(null);
        }

        toast.success('Part removed successfully!');
      } else {
        toast.error(response.message || 'Failed to remove part');
      }
    } catch (error: any) {
      console.error('Failed to remove part:', error);
      toast.error(error.message || 'Failed to remove part from subsystem');
    } finally {
      setIsRemovingPart(null);
    }
  };

  const getSubsystemRequirements = (subsystemId: string) => {
    const reqs = subsystemRequirements[subsystemId] || [];
    // Double-check: filter to ensure all requirements belong to this subsystem
    return reqs.filter(req => req.subsystemId === subsystemId);
  };

  const handleCreateRequirement = async () => {
    if (!selectedSubsystem || !sessionId) return;
    
    if (!createRequirementForm.description.trim() || !createRequirementForm.criteria.trim()) {
      toast.error('Please fill in description and criteria');
      return;
    }

    setIsCreatingRequirement(true);
    try {
      const response = await createSubsystemRequirement(sessionId, {
        subsystem_id: selectedSubsystem.id,
        description: createRequirementForm.description,
        criteria: createRequirementForm.criteria,
        priority: createRequirementForm.priority,
        mapped_components: createRequirementForm.mapped_components,
      });

      if (response.success && response.requirement) {
        // Map API requirement to SubsystemRequirement format
        const mappedRequirement: SubsystemRequirement = {
          id: response.requirement.req_id,
          subsystemId: response.requirement.subsystem_id,
          title: response.requirement.description,
          description: response.requirement.criteria,
          priority: (response.requirement.priority || 'medium') as SubsystemRequirementPriority,
          category: 'Functional',
        };

        // Update local subsystem requirements state
        setSubsystemRequirements(prev => ({
          ...prev,
          [selectedSubsystem.id]: [
            ...(prev[selectedSubsystem.id] || []),
            mappedRequirement
          ],
        }));

        // Clear form and close modal
        setCreateRequirementForm({
          description: '',
          criteria: '',
          priority: 'medium',
          mapped_components: [],
        });
        setShowCreateRequirementModal(false);
        setRequirementsNotFound(prev => ({
          ...prev,
          [selectedSubsystem.id]: false,
        }));

        toast.success('Requirement created successfully!');
      } else {
        toast.error('Failed to create requirement');
      }
    } catch (error) {
      console.error('Failed to create requirement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create requirement';
      toast.error(errorMessage);
    } finally {
      setIsCreatingRequirement(false);
    }
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
                {subsystemDetails?.description && (
                  <p className="text-sm text-gray-500 mt-2 max-w-2xl">{subsystemDetails.description}</p>
                )}
              </div>
            </div>
            
            {isLoadingDetails && (
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-4 px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                <span className="font-medium">Loading subsystem details and requirements...</span>
              </div>
            )}

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
                  onClick={async () => {
                    if (!selectedSubsystem || !sessionId) return;
                    
                    setIsGeneratingRequirements(true);
                    try {
                      // Call API to generate requirements for this specific subsystem
                      const response = await generateSubsystemRequirements(sessionId, selectedSubsystem.id);
                      
                      // Handle different response formats
                      let subsystemReqs: SubsystemRequirementItem[] = [];
                      
                      if ('requirements' in response && Array.isArray(response.requirements)) {
                        // New format: direct requirements array
                        subsystemReqs = response.requirements;
                      } else if ('requirements_by_subsystem' in response) {
                        // Old format: requirements_by_subsystem object
                        subsystemReqs = response.requirements_by_subsystem[selectedSubsystem.id] || [];
                      } else if ('all_requirements' in response && Array.isArray(response.all_requirements)) {
                        // Alternative format: all_requirements array filtered by subsystem_id
                        subsystemReqs = response.all_requirements.filter(
                          (req: SubsystemRequirementItem) => req.subsystem_id === selectedSubsystem.id
                        );
                      }
                      
                      if (subsystemReqs && subsystemReqs.length > 0) {
                        // Filter to ensure requirements belong to this specific subsystem
                        const filteredReqs = subsystemReqs.filter(
                          (req: SubsystemRequirementItem) => req.subsystem_id === selectedSubsystem.id
                        );
                        
                        // Map API requirements to SubsystemRequirement format
                        // Always use selectedSubsystem.id to ensure correct association
                        const mappedRequirements: SubsystemRequirement[] = filteredReqs.map((req) => ({
                          id: req.req_id,
                          subsystemId: selectedSubsystem.id, // Use selected subsystem ID, not API's subsystem_id
                          title: req.description,
                          description: req.criteria,
                          priority: (req.priority || 'medium') as SubsystemRequirementPriority,
                          category: 'Functional', // Default category since not provided in API response
                        }));

                        // Update local subsystem requirements state
                        setSubsystemRequirements(prev => ({
                          ...prev,
                          [selectedSubsystem.id]: mappedRequirements,
                        }));

                        // Map to Requirement format for parent state
                        const fullRequirements: Requirement[] = subsystemReqs.map((req) => ({
                          id: req.req_id,
                          code: `REQ-${req.req_id.slice(0, 8).toUpperCase()}`,
                          title: req.description,
                          description: req.criteria,
                          priority: (req.priority || 'medium') as 'critical' | 'high' | 'mandatory' | 'medium' | 'low',
                          category: 'Functional',
                          validationType: 'threshold' as const,
                          isPassed: true,
                          affectedComponents: req.mapped_components,
                        }));

                        // Update parent state with full requirements
                        onAddRequirements(fullRequirements);

                        // Clear requirements not found flag
                        setRequirementsNotFound(prev => ({
                      ...prev,
                          [selectedSubsystem.id]: false,
                    }));
                    
                        toast.success(`Generated ${mappedRequirements.length} smart requirements for ${selectedSubsystem.name}`, {
                      description: `AI analyzed ${subsystemComps.length} components and created comprehensive specs`
                    });
                      } else {
                        toast.warning(`No requirements were generated for ${selectedSubsystem.name}`);
                      }
                    } catch (error) {
                      console.error('Failed to generate requirements:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Failed to generate requirements';
                      toast.error(errorMessage);
                    } finally {
                      setIsGeneratingRequirements(false);
                    }
                  }}
                  disabled={isGeneratingRequirements}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isGeneratingRequirements ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                  <Zap className="h-4 w-4" />
                  Generate Smart Requirements
                    </>
                  )}
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
                  <Button onClick={() => setShowCreateRequirementModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </Button>
                )}
              </div>

              {/* Loading Indicator */}
              {isLoadingDetails && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading requirements...</p>
                  </div>
                </div>
              )}

              {/* Search Bar and Priority Filters */}
              {!isLoadingDetails && subsystemReqs.length > 0 && !isAddingRequirement && !editingRequirementId && (
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
              {!isLoadingDetails && subsystemReqs.length === 0 && !isAddingRequirement ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  {requirementsNotFound[selectedSubsystem.id] ? (
                    <>
                      <p className="text-gray-600 mb-2 font-semibold">Subsystem requirements not found</p>
                      <p className="text-sm text-gray-500 mb-4">No requirements have been associated with this subsystem yet.</p>
                    </>
                  ) : (
                    <>
                  <p className="text-gray-600 mb-4">No functional requirements yet</p>
                  <Button onClick={() => setIsAddingRequirement(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Requirement
                  </Button>
                    </>
                  )}
                </div>
              ) : !isLoadingDetails && subsystemReqs.length > 0 && (
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

            {/* Internal Connections Section */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-green-600" />
                  Internal Connections ({getSubsystemInternalConnections(selectedSubsystem.id).length})
                </h2>
              </div>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading connections...</p>
                  </div>
                </div>
              ) : (
                <>
                  {getSubsystemInternalConnections(selectedSubsystem.id).length > 0 ? (
                    <div className="space-y-4">
                      {getSubsystemInternalConnections(selectedSubsystem.id).map((connection, index) => {
                        const sourcePart = getSubsystemActualParts(selectedSubsystem.id).find(
                          p => p.part_number === connection.source_part
                        );
                        const targetPart = getSubsystemActualParts(selectedSubsystem.id).find(
                          p => p.part_number === connection.target_part
                        );
                        
                        return (
                          <motion.div
                            key={`${connection.source_part}-${connection.target_part}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="rounded-lg border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 hover:border-green-300 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              {/* Source Part */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="rounded-lg bg-blue-100 p-2">
                                    <Package className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                      {connection.source_part}
                                    </div>
                                    {sourcePart && sourcePart.quantity > 1 && (
                                      <div className="text-xs text-gray-500">Quantity: {sourcePart.quantity}</div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Arrow */}
                              <div className="flex flex-col items-center gap-1">
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                                <Badge className={`${getConnectionTypeColor(connection.connection_type)} text-xs font-medium`}>
                                  {connection.connection_type}
                                </Badge>
                              </div>

                              {/* Target Part */}
                              <div className="flex-1 text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                  <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                      {connection.target_part}
                                    </div>
                                    {targetPart && targetPart.quantity > 1 && (
                                      <div className="text-xs text-gray-500">Quantity: {targetPart.quantity}</div>
                                    )}
                                  </div>
                                  <div className="rounded-lg bg-green-100 p-2">
                                    <Package className="h-4 w-4 text-green-600" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Reasoning */}
                            {connection.reasoning && connection.reasoning.trim() && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs font-medium text-gray-500 mb-1">Reasoning:</div>
                                <div className="text-sm text-gray-700 italic">{connection.reasoning}</div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No internal connections defined</p>
                      <p className="text-sm text-gray-500">Connections between parts in this subsystem will appear here</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Parts Section */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Parts ({getSubsystemComponentBOM(selectedSubsystem.id).length})
                </h2>
                <Button
                  onClick={() => setShowAddPartModal(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Part
                </Button>
              </div>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading parts...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getSubsystemComponentBOM(selectedSubsystem.id).map((item) => {
                    const partSpecs = getPartSpecs(selectedSubsystem.id, item.component_id);
                    const hasSpecs = partSpecs && Object.keys(partSpecs.specs).length > 0;
                    
                    return (
                      <div
                        key={item.component_id}
                        className={`rounded-lg border p-3 transition-all ${
                          selectedPart?.componentId === item.component_id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <button
                            onClick={() => setSelectedPart({ componentId: item.component_id, quantity: item.quantity })}
                            className="flex-1 text-left"
                          >
                            <div className="font-semibold text-sm text-gray-900">{item.component_id}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            {item.quantity > 1 && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">x{item.quantity}</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePart(item.component_id);
                              }}
                              disabled={isRemovingPart === item.component_id}
                            >
                              {isRemovingPart === item.component_id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedPart({ componentId: item.component_id, quantity: item.quantity })}
                          className="text-xs text-gray-500 w-full text-left"
                        >
                          {hasSpecs 
                            ? `${Object.keys(partSpecs!.specs).length} specs available`
                            : 'No specs available'}
                        </button>
                      </div>
                    );
                  })}
                  {getSubsystemComponentBOM(selectedSubsystem.id).length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No parts in this subsystem</p>
                      <Button
                        onClick={() => setShowAddPartModal(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Part
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Part Specs Section */}
            {selectedPart && (() => {
              const partSpecs = getPartSpecs(selectedSubsystem.id, selectedPart.componentId);
              return (
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
                        <h2 className="text-xl font-bold text-gray-900">Part Specifications</h2>
                        <p className="text-sm text-gray-600">{selectedPart.componentId}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPart(null);
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Current Part Header */}
                  <div className="rounded-lg border-2 border-blue-300 bg-white p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-lg">{selectedPart.componentId}</h3>
                        {selectedPart.quantity > 1 && (
                          <Badge className="bg-blue-100 text-blue-700">Quantity: {selectedPart.quantity}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* View Mode - Display Actual Part Specs from actual_parts_bom */}
                  <div className="space-y-4">
                    {/* Quantity Info */}
                    {selectedPart.quantity > 1 && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                          Quantity
                        </div>
                        <div className="text-lg font-bold text-blue-900">
                          {selectedPart.quantity} units
                        </div>
                      </div>
                    )}

                    {/* Specifications Grid - Dynamic from actual_parts_bom */}
                    {partSpecs && Object.keys(partSpecs.specs).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(partSpecs.specs).map(([key, value]) => (
                          <div key={key} className="rounded-lg bg-white border border-gray-200 p-4">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div className="text-sm font-bold text-gray-900 break-words">
                              {String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No specifications available for this part</p>
                        <p className="text-xs text-gray-500 mt-1">Specs are loaded from actual_parts_bom</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </div>

        {/* Add Part Modal */}
        {showAddPartModal && selectedSubsystem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setShowAddPartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Add Part to Subsystem</h2>
                      <p className="text-sm text-gray-600">{selectedSubsystem.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddPartModal(false);
                      setAddPartForm({ part_number: '', quantity: 1 });
                    }}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Part Number *
                    </label>
                    <Input
                      placeholder="e.g., LD39200DPUR"
                      value={addPartForm.part_number}
                      onChange={(e) => setAddPartForm(prev => ({ ...prev, part_number: e.target.value }))}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the part number to add to this subsystem</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={addPartForm.quantity}
                      onChange={(e) => setAddPartForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of units of this part</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t mt-6">
                  <Button
                    onClick={handleAddPart}
                    disabled={isAddingPart || !addPartForm.part_number.trim()}
                    className="gap-2"
                  >
                    {isAddingPart ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Add Part
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddPartModal(false);
                      setAddPartForm({ part_number: '', quantity: 1 });
                    }}
                    disabled={isAddingPart}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create Requirement Modal */}
        {showCreateRequirementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setShowCreateRequirementModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border-2 border-gray-200 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="h-6 w-6 text-purple-600" />
                  Create Subsystem Requirement
                </h3>
                <button
                  onClick={() => {
                    setShowCreateRequirementModal(false);
                    setCreateRequirementForm({
                      description: '',
                      criteria: '',
                      priority: 'medium',
                      mapped_components: [],
                    });
                  }}
                  className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Description *
                  </label>
                  <Input
                    placeholder="e.g., Input voltage range"
                    value={createRequirementForm.description}
                    onChange={(e) => setCreateRequirementForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Criteria *
                  </label>
                  <Textarea
                    placeholder="e.g., The power input subsystem must accept an input voltage between 4.5V and 5.5V without damage or performance degradation."
                    value={createRequirementForm.criteria}
                    onChange={(e) => setCreateRequirementForm(prev => ({ ...prev, criteria: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Priority
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={createRequirementForm.priority}
                    onChange={(e) => setCreateRequirementForm(prev => ({ ...prev, priority: e.target.value }))}
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
                    Mapped Components
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {getSubsystemComponentBOM(selectedSubsystem.id).map((item) => (
                      <label key={item.component_id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={createRequirementForm.mapped_components.includes(item.component_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateRequirementForm(prev => ({
                                ...prev,
                                mapped_components: [...prev.mapped_components, item.component_id]
                              }));
                            } else {
                              setCreateRequirementForm(prev => ({
                                ...prev,
                                mapped_components: prev.mapped_components.filter(id => id !== item.component_id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          {item.component_id}
                          {item.quantity > 1 && <span className="text-gray-500 ml-1">(x{item.quantity})</span>}
                        </span>
                      </label>
                    ))}
                    {getSubsystemComponentBOM(selectedSubsystem.id).length === 0 && (
                      <p className="text-sm text-gray-500">No parts available</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleCreateRequirement}
                    disabled={isCreatingRequirement}
                    className="gap-2"
                  >
                    {isCreatingRequirement ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Create Requirement
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateRequirementModal(false);
                      setCreateRequirementForm({
                        description: '',
                        criteria: '',
                        priority: 'medium',
                        mapped_components: [],
                      });
                    }}
                    disabled={isCreatingRequirement}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
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
                Continue to Finalize
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
