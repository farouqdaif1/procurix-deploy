import { useState, useRef } from 'react';
import type { BOMSession, Component, Subsystem, Alternative } from '@/app/types';
import { mockAlternatives } from '@/app/data/mockData';
import { 
  Home,
  Layers,
  Shield,
  Box,
  MessageSquare,
  Send,
  Sparkles,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  Info,
  ArrowLeft,
  FileText,
  MoreHorizontal,
  ExternalLink,
  Zap,
  Star
} from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { Badge } from '@/app/shared/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';

interface CompletedBOMViewProps {
  session: BOMSession;
  onBack: () => void;
}

type SidebarSection = 'home' | 'subsystems' | 'architecture' | 'compliance';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function CompletedBOMView({ session, onBack }: CompletedBOMViewProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>('home');
  const [selectedSubsystem, setSelectedSubsystem] = useState<Subsystem | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [requirementsExpanded, setRequirementsExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your BOM Analysis Assistant for **${session.name}**.\n\nI can help you understand:\n• Component classifications and distributions\n• System architecture insights\n• Compliance status and recommendations\n• Subsystem breakdowns\n\nWhat would you like to know about your BOM?`,
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [filterClassification, setFilterClassification] = useState<'all' | 'fundamental' | 'auxiliary'>('all');
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  const fundamentalComponents = session.components.filter(c => c.isFundamental);
  const auxiliaryComponents = session.components.filter(c => !c.isFundamental);
  const compliantComponents = session.components.filter(c => c.complianceStatus === 'compliant');
  const failedComponents = session.components.filter(c => c.complianceStatus === 'failed');

  const sidebarItems = [
    {
      id: 'home' as SidebarSection,
      label: 'Home',
      icon: Home,
      description: 'System overview & components',
    },
    {
      id: 'subsystems' as SidebarSection,
      label: 'Subsystems',
      icon: Box,
      description: `${session.subsystems.length} subsystems`,
    },
    {
      id: 'architecture' as SidebarSection,
      label: 'Architecture',
      icon: Layers,
      description: 'System structure',
    },
    {
      id: 'compliance' as SidebarSection,
      label: 'Compliance',
      icon: Shield,
      description: `${session.complianceScore}% score`,
    },
  ];

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Simulate AI response based on input
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateInsight(chatInput, session),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 800);
  };

  const generateInsight = (input: string, session: BOMSession): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('fundamental') || lowerInput.includes('classification')) {
      return `**Component Classification Analysis:**\n\n✅ **Fundamental Components:** ${fundamentalComponents.length} (${((fundamentalComponents.length / session.totalComponents) * 100).toFixed(1)}%)\n• These are core functional components\n• Examples: ${fundamentalComponents.slice(0, 3).map(c => c.reference).join(', ')}\n\n⚙️ **Auxiliary Components:** ${auxiliaryComponents.length} (${((auxiliaryComponents.length / session.totalComponents) * 100).toFixed(1)}%)\n• Supporting components (passives, connectors)\n• Examples: ${auxiliaryComponents.slice(0, 3).map(c => c.reference).join(', ')}\n\nWould you like more details on any specific classification?`;
    }

    if (lowerInput.includes('compliance') || lowerInput.includes('fail')) {
      return `**Compliance Status Overview:**\n\n${session.complianceScore >= 70 ? '✅' : '⚠️'} **Overall Score:** ${session.complianceScore}%\n\n✅ **Compliant:** ${compliantComponents.length} components\n${compliantComponents.slice(0, 3).map(c => `• ${c.reference}`).join('\n')}\n\n${failedComponents.length > 0 ? `❌ **Failed:** ${failedComponents.length} components\n${failedComponents.slice(0, 3).map(c => `• ${c.reference}`).join('\n')}\n\nThese components may need alternative parts or requirement adjustments.` : '✅ All components are compliant!'}`;
    }

    if (lowerInput.includes('subsystem') || lowerInput.includes('breakdown')) {
      return `**Subsystem Breakdown:**\n\n${session.subsystems.map(sub => {
        const subComps = session.components.filter(c => c.subsystemId === sub.id);
        return `📦 **${sub.name}**\n• ${subComps.length} components\n• Key parts: ${subComps.slice(0, 2).map(c => c.reference).join(', ')}`;
      }).join('\n\n')}\n\nClick on "Subsystems" in the sidebar for detailed view.`;
    }

    if (lowerInput.includes('system') || lowerInput.includes('type')) {
      return `**System Information:**\n\n🎯 **Type:** ${session.systemType}\n📦 **Total Components:** ${session.totalComponents}\n📊 **Version:** ${session.version}\n\nThis system was classified as a ${session.systemType} based on component analysis and functional requirements.`;
    }

    if (lowerInput.includes('recommend') || lowerInput.includes('improve') || lowerInput.includes('optimize')) {
      return `**Optimization Recommendations:**\n\n${session.complianceScore < 70 ? '⚠️ **Priority: Improve Compliance**\n• Focus on the ' + failedComponents.length + ' failed components\n• Consider alternative parts or design adjustments\n\n' : ''}💡 **Suggestions:**\n• Review auxiliary component consolidation opportunities\n• Ensure all fundamental components have approved alternatives\n• Document compliance rationale for critical components\n• Consider standardizing component families\n\nWould you like detailed analysis on any specific area?`;
    }

    // Default response
    return `I can provide insights on:\n\n📊 **Component Analysis** - Classifications, distributions, and patterns\n🔍 **Compliance Details** - Pass/fail status and recommendations\n🏗️ **System Architecture** - Subsystems and relationships\n📈 **Optimization Tips** - Ways to improve your BOM\n\nJust ask me a specific question!`;
  };

  const getFilteredComponents = () => {
    if (filterClassification === 'fundamental') return fundamentalComponents;
    if (filterClassification === 'auxiliary') return auxiliaryComponents;
    return session.components;
  };

  const filteredComponents = getFilteredComponents();

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Library
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-2">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{session.name}</h2>
              <p className="text-xs text-gray-600">v{session.version}</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full rounded-lg p-3 text-left transition-all ${
                    isActive
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-sm'
                      : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-8">{item.description}</p>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Components</span>
              <span className="font-semibold text-gray-900">{session.totalComponents}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Compliance</span>
              <span className={`font-semibold ${
                session.complianceScore >= 70 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {session.complianceScore}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Subsystems</span>
              <span className="font-semibold text-gray-900">{session.subsystems.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <AnimatePresence mode="wait">
            {/* HOME SECTION */}
            {activeSection === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Header */}
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">System Overview</h1>
                  <p className="text-lg text-gray-600">{session.systemType}</p>
                </div>

                {/* System Description */}
                <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-900">System Description</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {session.systemType === 'Drone Flight Controller' 
                      ? 'Professional quadcopter flight controller designed for high-performance autonomous flight operations. This system integrates advanced sensor fusion, real-time processing, and wireless communication capabilities to enable precise attitude control, navigation, and telemetry for commercial drone applications. The architecture supports multiple communication protocols including WiFi, Bluetooth, and RF telemetry with robust power management and motor control systems.'
                      : `Advanced ${session.systemType} system featuring ${session.totalComponents} components across ${session.subsystems.length} functional subsystems. This design incorporates modern electronic components with emphasis on reliability, performance, and regulatory compliance.`
                    }
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-600">Total Components</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{session.totalComponents}</div>
                  </div>

                  <div className="rounded-xl border-2 border-green-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-gray-600">Fundamental</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{fundamentalComponents.length}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((fundamentalComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-orange-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-semibold text-gray-600">Auxiliary</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">{auxiliaryComponents.length}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((auxiliaryComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-600">Compliance</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{session.complianceScore}%</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {compliantComponents.length}/{session.totalComponents} passed
                    </div>
                  </div>
                </div>

                {/* System-Level Functional Requirements */}
                <div className="rounded-xl border-2 border-purple-200 bg-white p-6">
                  <button
                    onClick={() => setRequirementsExpanded(!requirementsExpanded)}
                    className="w-full flex items-center justify-between mb-4 group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        System Functional Requirements
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-100 text-purple-700">
                        {session.requirements.length} total requirements
                      </Badge>
                      {requirementsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-purple-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {requirementsExpanded ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                          {session.requirements.map(req => (
                            <div key={req.id} className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{req.name}</h4>
                                <Badge className={
                                  req.criticality === 'critical'
                                    ? 'bg-red-100 text-red-700 text-xs'
                                    : req.criticality === 'important'
                                    ? 'bg-yellow-100 text-yellow-700 text-xs'
                                    : 'bg-blue-100 text-blue-700 text-xs'
                                }>
                                  {req.criticality}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-700 mb-2">{req.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <div className="text-gray-600">
                                  <span className="font-semibold">Target:</span> {req.value} {req.unit}
                                </div>
                                <div className="text-gray-500">
                                  {session.subsystems.find(s => s.id === req.subsystemId)?.name || 'System-wide'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {session.requirements.slice(0, 4).map(req => (
                            <div key={req.id} className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{req.name}</h4>
                                <Badge className={
                                  req.criticality === 'critical'
                                    ? 'bg-red-100 text-red-700 text-xs'
                                    : req.criticality === 'important'
                                    ? 'bg-yellow-100 text-yellow-700 text-xs'
                                    : 'bg-blue-100 text-blue-700 text-xs'
                                }>
                                  {req.criticality}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-700 mb-2">{req.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <div className="text-gray-600">
                                  <span className="font-semibold">Target:</span> {req.value} {req.unit}
                                </div>
                                <div className="text-gray-500">
                                  {session.subsystems.find(s => s.id === req.subsystemId)?.name || 'System-wide'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {session.requirements.length > 4 && (
                          <div className="mt-3 text-center">
                            <span className="text-sm text-purple-600 font-semibold">
                              Click to view {session.requirements.length - 4} more requirements
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-[1fr_400px] gap-6">
                  {/* Components List */}
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">All Components</h2>
                      <div className="flex gap-2">
                        <Button
                          variant={filterClassification === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterClassification('all')}
                        >
                          All ({session.totalComponents})
                        </Button>
                        <Button
                          variant={filterClassification === 'fundamental' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterClassification('fundamental')}
                        >
                          Fundamental ({fundamentalComponents.length})
                        </Button>
                        <Button
                          variant={filterClassification === 'auxiliary' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterClassification('auxiliary')}
                        >
                          Auxiliary ({auxiliaryComponents.length})
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-auto">
                      {filteredComponents.map(comp => {
                        const isExpanded = expandedComponent === comp.id;

                        return (
                          <div
                            key={comp.id}
                            className={`rounded-lg border-2 p-3 transition-all ${
                              comp.isFundamental
                                ? 'bg-green-50 border-green-200'
                                : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <button
                              onClick={() => setExpandedComponent(isExpanded ? null : comp.id)}
                              className="w-full"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-900">{comp.reference}</span>
                                  <Badge className={
                                    comp.isFundamental
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }>
                                    {comp.isFundamental ? 'Fundamental' : 'Auxiliary'}
                                  </Badge>
                                  {comp.complianceStatus === 'compliant' && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                  {comp.complianceStatus === 'failed' && (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 pt-3 border-t border-gray-300 space-y-2"
                                >
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-600">Type:</span>
                                      <span className="ml-2 font-semibold text-gray-900">{comp.type}</span>
                                    </div>
                                    {comp.partNumber && (
                                      <div>
                                        <span className="text-gray-600">Part #:</span>
                                        <span className="ml-2 font-semibold font-mono text-gray-900">
                                          {comp.partNumber}
                                        </span>
                                      </div>
                                    )}
                                    {comp.subsystemId && (
                                      <div>
                                        <span className="text-gray-600">Subsystem:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          {session.subsystems.find(s => s.id === comp.subsystemId)?.name || 'N/A'}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-gray-600">Value:</span>
                                      <span className="ml-2 font-semibold text-gray-900">{comp.value || 'N/A'}</span>
                                    </div>
                                  </div>
                                  {comp.description && (
                                    <div className="text-xs text-gray-700 bg-white rounded p-2">
                                      {comp.description}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chatbot */}
                  <div className="rounded-xl border-2 border-gray-200 bg-white flex flex-col h-[700px]">
                    <div className="border-b p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        BOM Analysis Assistant
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Ask me anything about your BOM
                      </p>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map(msg => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                            <div
                              className={`text-xs mt-1 ${
                                msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Chat Input */}
                    <div className="border-t p-4 bg-gray-50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask about classifications, compliance, etc..."
                          className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim()}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUBSYSTEMS SECTION */}
            {activeSection === 'subsystems' && !selectedSubsystem && (
              <motion.div
                key="subsystems"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Subsystems</h1>
                  <p className="text-lg text-gray-600">{session.subsystems.length} functional subsystems</p>
                </div>

                <div className="space-y-4">
                  {session.subsystems.map(subsystem => {
                    const subComps = session.components.filter(c => c.subsystemId === subsystem.id);
                    const fundamentalCount = subComps.filter(c => c.isFundamental).length;
                    const displayComps = subComps.slice(0, 3);
                    const remainingCount = subComps.length - 3;

                    return (
                      <button
                        key={subsystem.id}
                        onClick={() => setSelectedSubsystem(subsystem)}
                        className="w-full rounded-xl border-2 border-cyan-200 bg-white p-6 transition-all hover:border-cyan-400 hover:shadow-lg text-left group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-cyan-100 p-3 group-hover:bg-cyan-200 transition-colors">
                              <Box className="h-6 w-6 text-cyan-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">
                                {subsystem.name}
                              </h3>
                              <p className="text-sm text-gray-600">{subComps.length} components</p>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge className="bg-green-100 text-green-700">
                              {fundamentalCount} fundamental
                            </Badge>
                            <Badge className="bg-orange-100 text-orange-700">
                              {subComps.length - fundamentalCount} auxiliary
                            </Badge>
                            <ChevronDown className="h-5 w-5 text-cyan-600 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {displayComps.map(comp => (
                            <div
                              key={comp.id}
                              className={`rounded-lg border p-3 ${
                                comp.isFundamental
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-orange-50 border-orange-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-gray-900">{comp.reference}</span>
                                {comp.complianceStatus === 'compliant' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {comp.complianceStatus === 'failed' && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600">{comp.type}</div>
                              {comp.partNumber && (
                                <div className="text-xs text-gray-500 font-mono mt-1">{comp.partNumber}</div>
                              )}
                            </div>
                          ))}
                          
                          {remainingCount > 0 && (
                            <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 flex items-center justify-center">
                              <div className="text-center">
                                <MoreHorizontal className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs font-semibold text-gray-600">
                                  +{remainingCount} more
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* SUBSYSTEM DETAIL VIEW */}
            {activeSection === 'subsystems' && selectedSubsystem && (
              <motion.div
                key="subsystem-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubsystem(null)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Subsystems
                  </Button>
                </div>

                <div className="rounded-xl border-2 border-cyan-200 bg-white p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="rounded-lg bg-cyan-100 p-4">
                      <Box className="h-8 w-8 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900">{selectedSubsystem.name}</h1>
                      <p className="text-gray-600">
                        {session.components.filter(c => c.subsystemId === selectedSubsystem.id).length} components
                      </p>
                    </div>
                  </div>

                  {/* Subsystem Requirements */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cyan-600" />
                      Functional Requirements
                    </h3>
                    <div className="space-y-2">
                      {session.requirements
                        .filter(req => req.subsystemId === selectedSubsystem.id)
                        .map(req => (
                          <div key={req.id} className="rounded-lg bg-cyan-50 border border-cyan-200 p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{req.name}</h4>
                              <Badge className={
                                req.criticality === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : req.criticality === 'important'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }>
                                {req.criticality}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{req.description}</p>
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">Value:</span> {req.value} {req.unit}
                            </div>
                          </div>
                        ))}
                      {session.requirements.filter(req => req.subsystemId === selectedSubsystem.id).length === 0 && (
                        <div className="text-sm text-gray-500 italic">No requirements defined for this subsystem</div>
                      )}
                    </div>
                  </div>

                  {/* All Components in Subsystem */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5 text-cyan-600" />
                      All Components
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {session.components
                        .filter(c => c.subsystemId === selectedSubsystem.id)
                        .map(comp => {
                          const isSelected = selectedComponentId === comp.id;
                          
                          return (
                            <div key={comp.id} className="space-y-2">
                              {/* Component Card */}
                              <button
                                onClick={() => setSelectedComponentId(isSelected ? null : comp.id)}
                                className={`w-full rounded-lg border-2 p-4 transition-all text-left ${
                                  comp.isFundamental
                                    ? 'bg-green-50 border-green-200 hover:border-green-400'
                                    : 'bg-orange-50 border-orange-200 hover:border-orange-400'
                                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base font-bold text-gray-900">{comp.reference}</span>
                                    <Badge className={
                                      comp.isFundamental
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }>
                                      {comp.isFundamental ? 'Fundamental' : 'Auxiliary'}
                                    </Badge>
                                    {comp.complianceStatus === 'compliant' && (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                    {comp.complianceStatus === 'failed' && (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="text-sm text-gray-700 mb-1">{comp.type}</div>
                                {comp.partNumber && (
                                  <div className="text-sm text-gray-600 font-mono">{comp.partNumber}</div>
                                )}
                              </button>

                              {/* Alternatives Section */}
                              <AnimatePresence>
                                {isSelected && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4 ml-4">
                                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-blue-600" />
                                        Alternative Components
                                      </h4>
                                      
                                      {mockAlternatives.length > 0 ? (
                                        <div className="space-y-3">
                                          {mockAlternatives.map(alt => (
                                            <div
                                              key={alt.id}
                                              className={`rounded-lg border-2 p-4 transition-all ${
                                                alt.isRecommended
                                                  ? 'bg-green-50 border-green-300'
                                                  : 'bg-white border-gray-300'
                                              }`}
                                            >
                                              {/* Alternative Header */}
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900">{alt.partNumber}</span>
                                                    {alt.isRecommended && (
                                                      <Badge className="bg-green-100 text-green-700 gap-1">
                                                        <Star className="h-3 w-3 fill-green-700" />
                                                        Recommended
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-sm text-gray-700 mb-1">{alt.manufacturer}</div>
                                                  <div className="text-xs text-gray-600">{alt.description}</div>
                                                </div>
                                                
                                                {/* Accuracy Score */}
                                                <div className="text-center ml-4">
                                                  <div className="text-2xl font-bold text-blue-600">{alt.confidence}%</div>
                                                  <div className="text-xs text-gray-600">Match</div>
                                                </div>
                                              </div>

                                              {/* Specs */}
                                              <div className="rounded bg-white border border-gray-200 p-3 mb-3">
                                                <div className="text-xs font-semibold text-gray-700 mb-2">Specifications:</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                  {Object.entries(alt.specs).map(([key, value]) => (
                                                    <div key={key}>
                                                      <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                                      <span className="ml-2 font-semibold text-gray-900">
                                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* Improvements */}
                                              {alt.improvements && alt.improvements.length > 0 && (
                                                <div className="rounded bg-blue-50 border border-blue-200 p-3 mb-3">
                                                  <div className="text-xs font-semibold text-gray-700 mb-1">Improvements:</div>
                                                  <ul className="text-xs text-gray-700 space-y-1">
                                                    {alt.improvements.map((imp, idx) => (
                                                      <li key={idx} className="flex items-start gap-1">
                                                        <span className="text-blue-600 mt-0.5">•</span>
                                                        <span>{imp}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}

                                              {/* Footer with Actions */}
                                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                                <div className="flex items-center gap-4 text-xs">
                                                  <div>
                                                    <span className="text-gray-600">Compliance:</span>
                                                    <span className={`ml-2 font-bold ${
                                                      alt.complianceScore >= 70 ? 'text-green-600' : 'text-yellow-600'
                                                    }`}>
                                                      {alt.complianceScore}%
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-600">Cost:</span>
                                                    <span className="ml-2 font-semibold text-gray-900">${alt.cost.toFixed(2)}</span>
                                                  </div>
                                                  {alt.impact.isDropInReplacement && (
                                                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                                                      Drop-in Replacement
                                                    </Badge>
                                                  )}
                                                </div>
                                                
                                                <a
                                                  href={alt.datasheetUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <ExternalLink className="h-4 w-4" />
                                                  Datasheet
                                                </a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-600 italic">
                                          No alternatives available for this component
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ARCHITECTURE SECTION */}
            {activeSection === 'architecture' && (
              <motion.div
                key="architecture"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">System Architecture</h1>
                  <p className="text-lg text-gray-600">Functional block diagram and hierarchy</p>
                </div>

                <div className="rounded-xl border-2 border-indigo-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Layers className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{session.systemType}</h2>
                      <p className="text-sm text-gray-600">System architecture overview</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Total Subsystems</div>
                      <div className="text-3xl font-bold text-indigo-600">{session.subsystems.length}</div>
                    </div>
                    <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Functional Blocks</div>
                      <div className="text-3xl font-bold text-indigo-600">{session.subsystems.length}</div>
                    </div>
                    <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                      <div className="text-sm text-gray-600 mb-1">Avg Components/Block</div>
                      <div className="text-3xl font-bold text-indigo-600">
                        {Math.round(session.totalComponents / session.subsystems.length)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Subsystem Hierarchy</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {session.subsystems.map(sub => {
                        const subComps = session.components.filter(c => c.subsystemId === sub.id);
                        return (
                          <div key={sub.id} className="rounded-lg bg-white border border-indigo-200 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Box className="h-4 w-4 text-indigo-600" />
                              <span className="font-semibold text-gray-900">{sub.name}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {subComps.length} components
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {subComps.slice(0, 3).map(c => c.reference).join(', ')}
                              {subComps.length > 3 && ` +${subComps.length - 3} more`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* COMPLIANCE SECTION */}
            {activeSection === 'compliance' && (
              <motion.div
                key="compliance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Compliance Analysis</h1>
                  <p className="text-lg text-gray-600">
                    Overall score: <span className={`font-bold ${
                      session.complianceScore >= 70 ? 'text-green-600' : 'text-yellow-600'
                    }`}>{session.complianceScore}%</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border-2 border-green-200 bg-white p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <span className="text-sm font-semibold text-gray-600">Compliant</span>
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-1">{compliantComponents.length}</div>
                    <div className="text-sm text-gray-600">
                      {((compliantComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-red-200 bg-white p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <span className="text-sm font-semibold text-gray-600">Failed</span>
                    </div>
                    <div className="text-4xl font-bold text-red-600 mb-1">{failedComponents.length}</div>
                    <div className="text-sm text-gray-600">
                      {((failedComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-purple-200 bg-white p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-6 w-6 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-600">Overall Score</span>
                    </div>
                    <div className="text-4xl font-bold text-purple-600 mb-1">{session.complianceScore}%</div>
                    <div className="text-sm text-gray-600">Compliance rating</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Compliant Components */}
                  <div className="rounded-xl border-2 border-green-200 bg-white p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Compliant Components ({compliantComponents.length})
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-auto">
                      {compliantComponents.map(comp => (
                        <div key={comp.id} className="rounded-lg bg-green-50 border border-green-200 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-900">{comp.reference}</span>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-xs text-gray-600 mb-1">{comp.type}</div>
                          {comp.partNumber && (
                            <div className="text-xs text-gray-500 font-mono">{comp.partNumber}</div>
                          )}
                          <div className="mt-2">
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              ✓ All requirements met
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Failed Components */}
                  <div className="rounded-xl border-2 border-red-200 bg-white p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      Failed Components ({failedComponents.length})
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-auto">
                      {failedComponents.map(comp => (
                        <div key={comp.id} className="rounded-lg bg-red-50 border border-red-200 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-900">{comp.reference}</span>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="text-xs text-gray-600 mb-1">{comp.type}</div>
                          {comp.partNumber && (
                            <div className="text-xs text-gray-500 font-mono mb-2">{comp.partNumber}</div>
                          )}
                          <div className="rounded bg-red-100 p-2">
                            <div className="text-xs font-semibold text-red-800 mb-1">Issues:</div>
                            <div className="text-xs text-red-700">
                              • Temperature range insufficient<br/>
                              • Operating voltage out of spec
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}