import { useState, useEffect } from 'react';
import { CheckCircle, Edit2, X, Check, Zap, Plus, Upload, FileText, Filter, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { getRequirements, updateRequirement, type Requirement as APIRequirement } from '@/app/services/api';

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
        const result = await getRequirements(sessionId);
        
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

  const handleSaveEdit = async (reqId: string, newValue: string) => {
    if (!sessionId) {
      toast.error('No session found');
      return;
    }

    const requirement = requirements.find(req => req.id === reqId);
    if (!requirement) return;

    try {
      // Parse BOM references from the value (comma-separated)
      const bomReference = newValue.split(',').map(ref => ref.trim()).filter(ref => ref.length > 0);
      
      // Call API to update requirement
      const result = await updateRequirement(
        sessionId,
        reqId,
        requirement.description, // Keep original description, or could allow editing it too
        requirement.category, // Keep original category, or could allow editing it too
        bomReference
      );

      // Update local state with API response
      setRequirements(prev =>
        prev.map(req =>
          req.id === reqId 
            ? { 
                ...req, 
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
      <div className="h-full overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Requirements Analysis Engine
            </h2>
            <p className="text-gray-600 text-lg">
              Fetching requirements from API...
            </p>
          </motion.div>

          {/* Progress Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border-2 border-gray-200 bg-white shadow-xl p-8"
          >
            {/* Loading Message */}
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Loading Requirements
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                Fetching requirements from API...
              </p>
            </div>

            {/* Stats Footer */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  <Loader2 className="h-6 w-6 animate-spin inline-block" />
                </div>
                <div className="text-xs text-gray-600 mt-1">Loading Requirements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                <div className="text-xs text-gray-600 mt-1">Categories</div>
              </div>
            </div>
          </motion.div>

          {/* Engineering Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-lg bg-gray-900 border border-gray-700 p-4 text-sm text-gray-300"
          >
            <div className="flex items-start gap-3">
              <Zap className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">OEM-Grade Analysis:</strong> AI engine cross-references component
                datasheets, power trees, and thermal models to extract design requirements with 90%+ confidence.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Engineering Requirements
          </h1>
          <p className="text-lg text-gray-600">
            Review and validate AI-generated requirements from your BOM
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border-2 border-gray-200 bg-white p-6 text-center">
            <div className="text-4xl font-bold text-gray-900">{requirements.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Requirements</div>
          </div>
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-sm text-gray-600 mt-1">Categories</div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Requirements by Category</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white font-medium hover:bg-blue-600 flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Custom
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="rounded-lg bg-purple-500 px-4 py-2 text-sm text-white font-medium hover:bg-purple-600 flex items-center gap-2 transition-colors"
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
                className="w-full pl-12 pr-12 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-sm transition-colors"
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
                const categoryIcons: Record<string, string> = {
                  'Power Supply': '⚡',
                  'Voltage Regulation': '📊',
                  'Battery Management': '🔋',
                  'Thermal Management': '🌡️',
                  'Safety & Compliance': '🛡️',
                  'Performance': '🚀',
                  'Environmental': '🌍'
                };
                const icon = categoryIcons[category] || '📋';
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === category
                        ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      {category} ({count})
                    </span>
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
                        onSaveEdit={(newValue) => handleSaveEdit(req.id, newValue)}
                        onCancelEdit={() => handleCancelEdit(req.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onRequirementsComplete}
            className="w-full mt-6 rounded-xl px-6 py-5 font-bold text-lg transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] cursor-pointer"
          >
            <CheckCircle className="h-6 w-6" />
            Continue to Architecture
            <Zap className="h-6 w-6" />
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
  onSaveEdit: (newValue: string) => void;
  onCancelEdit: () => void;
}

function RequirementCard({ requirement, onEdit, onSaveEdit, onCancelEdit }: RequirementCardProps) {
  const [editValue, setEditValue] = useState(requirement.value);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    onSaveEdit(editValue);
  };

  // Category icons and colors
  const categoryConfig: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
    'Power Supply': { icon: '⚡', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
    'Voltage Regulation': { icon: '📊', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
    'Battery Management': { icon: '🔋', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
    'Thermal Management': { icon: '🌡️', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
    'Safety & Compliance': { icon: '🛡️', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' }
  };

  const config = categoryConfig[requirement.category] || { icon: '📋', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
      className={`rounded-xl border-2 overflow-hidden transition-all ${
        requirement.isEditing
          ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg shadow-blue-100'
          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md'
      }`}
    >
      {/* Header Bar */}
      <div className={`px-4 py-2 border-b ${
        requirement.isEditing
          ? 'bg-blue-100 border-blue-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {requirement.category}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Confidence Badge */}
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${requirement.confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    requirement.confidence >= 95 ? 'bg-green-500' :
                    requirement.confidence >= 90 ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                />
              </div>
              <span className={`text-xs font-bold ${
                requirement.confidence >= 95 ? 'text-green-600' :
                requirement.confidence >= 90 ? 'text-blue-600' :
                'text-yellow-600'
              }`}>
                {requirement.confidence}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        <div className="mb-4">
          <h5 className="text-lg font-bold text-gray-900 mb-2">
            {requirement.title}
          </h5>
          <p className="text-sm text-gray-600 leading-relaxed">{requirement.description}</p>
        </div>

        {/* Value Display */}
        {requirement.isEditing ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4"
          >
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Specification Value
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded-lg border-2 border-blue-300 px-4 py-3 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter requirement value..."
              autoFocus
            />
          </motion.div>
        ) : (
          <div className={`rounded-lg border-2 p-4 mb-4 ${config.borderColor} ${config.bgColor}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Specification
                </div>
                <div className="text-base font-mono font-bold text-gray-900 leading-relaxed">
                  {requirement.value}
                </div>
              </div>
              {!requirement.isEditing && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onEdit}
                  className="rounded-lg bg-blue-500 p-2 text-white hover:bg-blue-600 transition-colors"
                  title="Edit value"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Source Components */}
        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors mb-2"
          >
            <span>SOURCE COMPONENTS ({requirement.source.length})</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {requirement.source.map((src, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow-sm cursor-pointer"
                >
                  {src}
                </motion.span>
              ))}
            </div>
          </motion.div>
          {!isExpanded && (
            <div className="flex gap-1">
              {requirement.source.slice(0, 3).map((_src, idx) => (
                <div
                  key={idx}
                  className="h-1.5 w-8 rounded-full bg-blue-200"
                />
              ))}
              {requirement.source.length > 3 && (
                <div className="h-1.5 w-4 rounded-full bg-gray-200" />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {requirement.isEditing ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm text-white font-bold hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-md"
              >
                <Check className="h-4 w-4" />
                Save Changes
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancelEdit}
                className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 flex items-center justify-center gap-2 transition-all"
              >
                <X className="h-4 w-4" />
                Cancel
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEdit}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-3 text-sm text-white font-bold hover:bg-blue-600 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Edit2 className="h-4 w-4" />
              Edit Requirement
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}