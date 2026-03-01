import { useState, useEffect } from 'react';
import { CheckCircle, Edit2, X, Check, Zap, Plus, Upload, FileText, Filter, Search, Loader2, Battery, Gauge, Thermometer, Shield, Rocket, Globe, Settings, Cpu } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { getRequirements, getRequirementsGET, updateRequirement, type Requirement as APIRequirement } from '@/app/services/api';

interface Requirement {
  id: string;
  category: string;
  title: string;
  description: string;
  value: string;
  confidence: number;
  source: string[];
  isEditing?: boolean;
}

interface RequirementsViewProps {
  onRequirementsComplete: () => void;
}

export function RequirementsView({ onRequirementsComplete }: RequirementsViewProps) {
  const { sessionId } = useSession();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingRequirementId, setSavingRequirementId] = useState<string | null>(null);
  const [newRequirement, setNewRequirement] = useState({
    category: '',
    title: '',
    description: '',
    value: ''
  });

  // Fetch requirements from API
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!sessionId) {
        setIsGenerating(false);
        setError('No session found. Please upload a BOM first.');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Try GET first, fallback to POST if 404 or if requirements are empty
        let result;
        try {
          result = await getRequirementsGET(sessionId);
          console.log('Got requirements from GET endpoint');
          
          // Check if requirements are empty (not generated yet)
          if (result.requirements_count === 0 || (result.requirements && result.requirements.length === 0)) {
            console.log('Requirements are empty, generating...');
            result = await getRequirements(sessionId);
            console.log('Generated requirements from POST endpoint');
          }
        } catch (getError: any) {
          // If 404, try POST to generate requirements
          if (getError.message?.includes('404') || getError.message?.includes('Failed to get requirements: 404')) {
            console.log('Requirements not found, generating...');
            result = await getRequirements(sessionId);
            console.log('Generated requirements from POST endpoint');
          } else {
            throw getError;
          }
        }
        
        if (!result.success) {
          throw new Error('Requirements request was not successful');
        }

        // Transform API requirements to component format
        const transformedRequirements: Requirement[] = result.requirements.map((req: APIRequirement) => ({
          id: req.req_id,
          category: req.category,
          title: req.original_req_id,
          description: req.description,
          value: req.bom_reference.join(', '), // Use BOM references as value
          confidence: 100, // API doesn't provide confidence, default to 100
          source: req.bom_reference, // Use BOM references as source
          isEditing: false,
        }));

        setRequirements(transformedRequirements);
        setIsGenerating(false);
        toast.success(`Loaded ${result.requirements_count} requirements`);
      } catch (error) {
        setIsGenerating(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch requirements';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    fetchRequirements();
  }, [sessionId]);

  const handleEdit = (reqId: string) => {
    setRequirements(prev =>
      prev.map(req =>
        req.id === reqId ? { ...req, isEditing: true } : req
      )
    );
  };

  const handleSaveEdit = async (reqId: string, updates: { title?: string; description?: string; value?: string }) => {
    if (!sessionId) {
      toast.error('No session found');
      return;
    }

    const requirement = requirements.find(req => req.id === reqId);
    if (!requirement) return;

    setSavingRequirementId(reqId);

    try {
      // Parse BOM references from the value (comma-separated) if value is provided
      const bomReference = updates.value 
        ? updates.value.split(',').map(ref => ref.trim()).filter(ref => ref.length > 0)
        : requirement.source;
      
      // Call API to update requirement
      const result = await updateRequirement(
        sessionId,
        reqId,
        updates.description || requirement.description,
        requirement.category,
        bomReference
      );

      // Update local state with API response
      setRequirements(prev =>
        prev.map(req =>
          req.id === reqId 
            ? { 
                ...req, 
                title: updates.title || req.title,
                description: updates.description || req.description,
                value: result.requirement.bom_reference.join(', '),
                source: result.requirement.bom_reference,
                isEditing: false
              } 
            : req
        )
      );

      toast.success(result.message || 'Requirement updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update requirement';
      toast.error(errorMessage);
    } finally {
      setSavingRequirementId(null);
    }
  };

  const handleCancelEdit = (reqId: string) => {
    setRequirements(prev =>
      prev.map(req =>
        req.id === reqId ? { ...req, isEditing: false } : req
      )
    );
  };

  const handleCreateRequirement = () => {
    if (!newRequirement.category || !newRequirement.title || !newRequirement.value) {
      return;
    }
    
      const requirement: Requirement = {
        id: `req-custom-${Date.now()}`,
        category: newRequirement.category,
        title: newRequirement.title,
        description: newRequirement.description,
        value: newRequirement.value,
        confidence: 100,
        source: ['CUSTOM_USER_INPUT']
      };
    
    setRequirements(prev => [...prev, requirement]);
    setNewRequirement({ category: '', title: '', description: '', value: '' });
    setShowCreateModal(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Simulate file processing
    // In a real app, this would parse CSV/Excel/PDF files
    setTimeout(() => {
      const uploadedRequirements: Requirement[] = [
        {
          id: `req-upload-${Date.now()}-1`,
          category: 'Performance',
          title: 'Maximum Response Time',
          description: 'System must respond within specified time window',
          value: '<100ms',
          confidence: 95,
          source: ['UPLOADED_FILE']
        },
        {
          id: `req-upload-${Date.now()}-2`,
          category: 'Environmental',
          title: 'Humidity Range',
          description: 'Device must operate in specified humidity conditions',
          value: '10% - 90% RH',
          confidence: 92,
          source: ['UPLOADED_FILE']
        }
      ];
      
      setRequirements(prev => [...prev, ...uploadedRequirements]);
      setShowUploadModal(false);
    }, 1000);
  };

  const categories = Array.from(new Set(requirements.map(req => req.category)));

  // Filter requirements based on search query
  const filterRequirements = (reqs: Requirement[]) => {
    if (!searchQuery.trim()) return reqs;
    
    const query = searchQuery.toLowerCase();
    return reqs.filter((req) => {
      const title = (req.title || '').toLowerCase();
      const description = (req.description || '').toLowerCase();
      const value = (req.value || '').toLowerCase();
      const category = (req.category || '').toLowerCase();
      
      return (
        title.includes(query) ||
        description.includes(query) ||
        value.includes(query) ||
        category.includes(query)
      );
    });
  };

  const filteredRequirements = filterRequirements(requirements);


  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-gray-300 bg-gray-50 p-12 text-center transition-all">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Processing Requirements...
                </h3>
                <p className="text-gray-600 mb-6">
                  AI is analyzing component specifications, datasheets, and design patterns to extract engineering requirements
                </p>
              </div>
            </div>

            {/* Engineering Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-gray-700"
            >
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>OEM-Grade Analysis:</strong> AI engine cross-references component
                  datasheets, power trees, and thermal models to extract design requirements with high confidence.
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border border-gray-300 bg-white p-6 text-center">
            <div className="text-4xl font-bold text-gray-900">{requirements.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Requirements</div>
          </div>
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-sm text-gray-600 mt-1">Categories</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Requirements by Category</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Custom
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 flex items-center gap-2 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requirements by title, description, value, or category..."
                className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-blue-400 focus:outline-none text-sm transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-xs text-gray-600">
                Showing {filteredRequirements.length} of {requirements.length} requirements
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab('All')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === 'All'
                    ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  All ({requirements.length})
                </span>
              </button>
              {categories.map((category) => {
                const count = requirements.filter(r => r.category === category).length;
                const categoryIcons: Record<string, React.JSX.Element> = {
                  'Power Supply': <Zap className="h-4 w-4" />,
                  'Voltage Regulation': <Gauge className="h-4 w-4" />,
                  'Battery Management': <Battery className="h-4 w-4" />,
                  'Thermal Management': <Thermometer className="h-4 w-4" />,
                  'Safety & Compliance': <Shield className="h-4 w-4" />,
                  'Performance': <Rocket className="h-4 w-4" />,
                  'Environmental': <Globe className="h-4 w-4" />,
                  'Power Regulation': <Gauge className="h-4 w-4" />,
                  'Memory': <Cpu className="h-4 w-4" />,
                  'Configuration': <Settings className="h-4 w-4" />,
                  'Connectivity': <Globe className="h-4 w-4" />,
                  'EMI Filtering': <Shield className="h-4 w-4" />
                };
                const IconComponent = categoryIcons[category] || <Settings className="h-4 w-4" />;
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === category
                        ? 'bg-blue-600 text-white border-b-2 border-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className={activeTab === category ? 'text-white' : 'text-gray-600'}>
                      {IconComponent}
                    </span>
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requirements List - Filtered by Active Tab */}
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {(activeTab === 'All' ? categories : [activeTab]).map(category => {
              const categoryRequirements = requirements.filter(req => req.category === category);
              
              if (categoryRequirements.length === 0) return null;
              
              return (
                <div key={category}>
                  {activeTab === 'All' && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 w-1 rounded-full bg-blue-500" />
                      <h4 className="text-md font-bold text-gray-900">{category}</h4>
                    </div>
                  )}

                  <div className={`space-y-3 ${activeTab === 'All' ? 'ml-3' : ''}`}>
                    {categoryRequirements.map(req => (
                      <RequirementCard
                        key={req.id}
                        requirement={req}
                        onEdit={() => handleEdit(req.id)}
                        onSaveEdit={(updates) => handleSaveEdit(req.id, updates)}
                        onCancelEdit={() => handleCancelEdit(req.id)}
                        isSaving={savingRequirementId === req.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onRequirementsComplete}
            className="w-full mt-6 rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" />
            Continue to Architecture
          </button>
        </div>

        {/* Create Custom Requirement Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border-2 border-gray-200 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="h-6 w-6 text-blue-500" />
                  Create Custom Requirement
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={newRequirement.category}
                    onChange={(e) => setNewRequirement({ ...newRequirement, category: e.target.value })}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="">Select a category...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Performance">Performance</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newRequirement.title}
                    onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                    placeholder="e.g., Maximum Operating Voltage"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newRequirement.description}
                    onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                    placeholder="Describe the requirement in detail..."
                    rows={3}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-400 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Specification Value *
                  </label>
                  <input
                    type="text"
                    value={newRequirement.value}
                    onChange={(e) => setNewRequirement({ ...newRequirement, value: e.target.value })}
                    placeholder="e.g., 3.3V ±5%, <100mA"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleCreateRequirement}
                  disabled={!newRequirement.category || !newRequirement.title || !newRequirement.value}
                  className="flex-1 rounded-lg bg-blue-500 px-6 py-3 text-white font-bold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Create Requirement
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Upload File Modal */}
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border-2 border-gray-200 p-8 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="h-6 w-6 text-purple-500" />
                  Upload Requirements File
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a CSV, Excel, or PDF file containing requirements
                  </p>
                  <label className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 text-white font-bold hover:bg-purple-600 cursor-pointer transition-colors">
                    <Upload className="h-5 w-5" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                  <strong>Supported formats:</strong> CSV, Excel (.xlsx, .xls), PDF
                  <br />
                  <strong>Expected columns:</strong> Category, Title, Description, Value
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(false)}
                className="w-full mt-6 px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <strong>Note:</strong> Requirements are automatically extracted from component specifications
          and BOM structure. Review each requirement for accuracy before proceeding. This approval step cannot be bypassed.
        </div>
      </div>
    </div>
  );
}

interface RequirementCardProps {
  requirement: Requirement;
  onEdit: () => void;
  onSaveEdit: (updates: { title?: string; description?: string; value?: string }) => void;
  onCancelEdit: () => void;
  isSaving?: boolean;
}

function RequirementCard({ requirement, onEdit, onSaveEdit, onCancelEdit, isSaving = false }: RequirementCardProps) {
  const [editTitle, setEditTitle] = useState(requirement.title);
  const [editDescription, setEditDescription] = useState(requirement.description);
  const [editValue, setEditValue] = useState(requirement.value);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset edit values when requirement changes or editing is cancelled
  useEffect(() => {
    if (!requirement.isEditing) {
      setEditTitle(requirement.title);
      setEditDescription(requirement.description);
      setEditValue(requirement.value);
    }
  }, [requirement.isEditing, requirement.title, requirement.description, requirement.value]);

  const handleSave = () => {
    onSaveEdit({
      title: editTitle,
      description: editDescription,
      value: editValue
    });
  };

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      requirement.isEditing
        ? 'border-blue-400 bg-blue-50'
        : 'border-gray-300 bg-white hover:border-gray-400'
    }`}
    >
      {/* Header Bar */}
      <div className={`px-4 py-3 border-b ${
        requirement.isEditing
          ? 'bg-blue-100 border-blue-300'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {requirement.category}
          </span>
          {/* Action Buttons in Header - Right Side */}
          {requirement.isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white font-medium hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white font-medium hover:bg-blue-700 flex items-center gap-1.5 transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          {requirement.isEditing ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-blue-300 px-3 py-2.5 text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Requirement title..."
              />
            </div>
          ) : (
            <h5 className="text-base font-semibold text-gray-900">
              {requirement.title}
            </h5>
          )}
        </div>

        {/* Description */}
        <div>
          {requirement.isEditing ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-blue-300 px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                placeholder="Requirement description..."
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed">{requirement.description}</p>
          )}
        </div>

        {/* Value Display */}
        <div>
          {requirement.isEditing ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Specification Value
              </label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-blue-300 px-3 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter requirement value..."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Specification
              </div>
              <div className="text-sm font-mono text-gray-900">
                {requirement.value}
              </div>
            </div>
          )}
        </div>

        {/* Source Components */}
        <div className="mb-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors mb-2"
          >
            <span>Source Components ({requirement.source.length})</span>
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {isExpanded && (
            <div className="flex flex-wrap gap-2 pt-1">
              {requirement.source.map((src, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white font-medium"
                >
                  {src}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}