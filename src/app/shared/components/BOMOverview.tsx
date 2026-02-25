import type { BOMSession, SessionStage } from '@/app/types';
import { 
  Search, 
  Fingerprint, 
  Layers, 
  Network, 
  FileCheck, 
  Grid3x3, 
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Cpu,
  Shield,
  MessageCircle,
  X,
  Send,
  Sparkles
} from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { Badge } from '@/app/shared/components/ui/badge';
import { useState, useRef, useEffect } from 'react';

interface BOMOverviewProps {
  session: BOMSession;
  onNavigateToStage: (stage: SessionStage) => void;
}

interface SectionCard {
  id: SessionStage;
  title: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
  stats?: {
    label: string;
    value: string | number;
  }[];
  status?: 'complete' | 'partial' | 'pending';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function BOMOverview({ session, onNavigateToStage }: BOMOverviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your BOM Analysis Assistant. I can help you understand your ${session.systemType} BOM with ${session.totalComponents} components. Ask me anything!`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userQuestion: string): string => {
    const question = userQuestion.toLowerCase();
    
    // Compliance-related questions
    if (question.includes('compliance') || question.includes('score')) {
      if (session.complianceScore !== undefined) {
        return `Your BOM has a compliance score of ${session.complianceScore}%. Out of ${session.totalComponents} total components, ${session.compliantComponents} are compliant and ${session.totalComponents - session.compliantComponents} have compliance issues. ${
          session.complianceScore >= 70 
            ? 'This is a strong compliance rate!' 
            : session.complianceScore >= 40 
            ? 'There\'s room for improvement in compliance.' 
            : 'Critical attention needed for compliance issues.'
        }`;
      }
      return 'Compliance analysis is available in the Compliance Analysis section. Would you like me to navigate you there?';
    }
    
    // Component-related questions
    if (question.includes('component') || question.includes('part')) {
      const identified = session.components.filter(c => c.isIdentified).length;
      const generic = session.components.filter(c => c.isGeneric).length;
      const fundamental = session.components.filter(c => c.isFundamental === true).length;
      const auxiliary = session.components.filter(c => c.isFundamental === false).length;
      
      return `Your BOM contains ${session.totalComponents} components. ${identified} are identified with specific part numbers, ${generic} are generic components. ${fundamental} are classified as fundamental (core functionality), and ${auxiliary} as auxiliary (supporting components).`;
    }
    
    // Subsystem questions
    if (question.includes('subsystem')) {
      if (session.subsystems.length > 0) {
        const subsystemNames = session.subsystems.map(s => s.name).join(', ');
        return `Your ${session.systemType} is organized into ${session.subsystems.length} subsystems: ${subsystemNames}. Each subsystem groups related components by function. Would you like to explore the subsystem details?`;
      }
      return 'Subsystem analysis is not yet available for this BOM. Complete the subsystem analysis stage to see functional groupings.';
    }
    
    // Requirements questions
    if (question.includes('requirement')) {
      if (session.requirements.length > 0) {
        const passed = session.requirements.filter(r => r.isPassed).length;
        const failed = session.requirements.filter(r => !r.isPassed).length;
        return `Your BOM has ${session.requirements.length} engineering requirements defined. ${passed} requirements are currently passing, and ${failed} need attention. You can review detailed requirements in the Requirements Analysis section.`;
      }
      return 'No requirements have been defined yet for this BOM. Navigate to Requirements Analysis to add functional and performance requirements.';
    }
    
    // System type questions
    if (question.includes('system') || question.includes('type') || question.includes('what is')) {
      return `This is a ${session.systemType} BOM created on ${new Date(session.createdAt).toLocaleDateString()}. It's currently at version ${session.version} and was last updated ${new Date(session.updatedAt).toLocaleDateString()}.`;
    }
    
    // Fundamental classification questions
    if (question.includes('fundamental') || question.includes('auxiliary') || question.includes('classification')) {
      const fundamental = session.components.filter(c => c.isFundamental === true).length;
      const auxiliary = session.components.filter(c => c.isFundamental === false).length;
      const unclassified = session.components.filter(c => c.isFundamental === undefined).length;
      
      return `Component classification: ${fundamental} fundamental (essential for core functionality), ${auxiliary} auxiliary (supporting components)${unclassified > 0 ? `, and ${unclassified} unclassified` : ''}. Fundamental components are critical for the primary function of your ${session.systemType}.`;
    }
    
    // Generic/specific questions
    if (question.includes('generic') || question.includes('identified')) {
      const identified = session.components.filter(c => c.isIdentified).length;
      const generic = session.components.filter(c => c.isGeneric).length;
      
      return `Out of ${session.totalComponents} components: ${identified} have been identified with specific manufacturer part numbers, and ${generic} are generic components. Specific components are better for procurement and compliance tracking.`;
    }
    
    // Architecture questions
    if (question.includes('architecture') || question.includes('connection') || question.includes('relationship')) {
      return `The system architecture shows how your ${session.totalComponents} components connect and interact. You can view the block diagram and component relationships in the System Architecture section. Would you like me to navigate you there?`;
    }
    
    // Help/navigation questions
    if (question.includes('help') || question.includes('what can') || question.includes('how do')) {
      return `I can help you with:
• Component analysis and statistics
• Compliance scores and issues
• Subsystem organization
• Requirements tracking
• System architecture insights
• Navigation to specific analysis sections

Try asking questions like "What's my compliance score?" or "Tell me about my components"`;
    }
    
    // Default response with BOM summary
    return `I can provide insights about your ${session.systemType} BOM. Currently, you have ${session.totalComponents} components${
      session.complianceScore !== undefined ? ` with a ${session.complianceScore}% compliance score` : ''
    }. What would you like to know more about?`;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(inputValue),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 800 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const sections: SectionCard[] = [
    {
      id: 'discovery',
      title: 'System Discovery',
      description: 'Initial component detection and system type identification',
      icon: Search,
      available: true,
      stats: [
        { label: 'System Type', value: session.systemType || 'Unknown' },
        { label: 'Components', value: session.totalComponents },
      ],
      status: 'complete',
    },
    {
      id: 'discovery',
      title: 'Component Identification',
      description: 'Verified part numbers and manufacturer details',
      icon: Fingerprint,
      available: true,
      stats: [
        { label: 'Identified', value: `${session.components.filter(c => c.isIdentified).length}/${session.totalComponents}` },
        { label: 'Generic', value: session.components.filter(c => c.isGeneric).length },
      ],
      status: 'complete',
    },
    {
      id: 'fundamental',
      title: 'Fundamental Classification',
      description: 'Components classified as fundamental or auxiliary',
      icon: Layers,
      available: true,
      stats: [
        { label: 'Fundamental', value: session.components.filter(c => c.isFundamental === true).length },
        { label: 'Auxiliary', value: session.components.filter(c => c.isFundamental === false).length },
      ],
      status: 'complete',
    },
    {
      id: 'architecture',
      title: 'System Architecture',
      description: 'Block diagram and component relationships',
      icon: Network,
      available: true,
      stats: [
        { label: 'Fundamental', value: session.components.filter(c => c.isFundamental === true).length },
        { label: 'Connections', value: 'Mapped' },
      ],
      status: 'complete',
    },
    {
      id: 'requirements',
      title: 'Requirements Analysis',
      description: 'Engineering requirements and specifications',
      icon: FileCheck,
      available: session.requirements.length > 0,
      stats: [
        { label: 'Total Requirements', value: session.requirements.length },
        { label: 'Passed', value: session.requirements.filter(r => r.isPassed).length },
        { label: 'Failed', value: session.requirements.filter(r => !r.isPassed).length },
      ],
      status: session.requirements.length > 0 ? 'complete' : 'pending',
    },
    {
      id: 'subsystems',
      title: 'Subsystems',
      description: 'Functional groupings and subsystem analysis',
      icon: Grid3x3,
      available: session.subsystems.length > 0,
      stats: [
        { label: 'Subsystems', value: session.subsystems.length },
        { label: 'Components', value: session.totalComponents },
      ],
      status: session.subsystems.length > 0 ? 'complete' : 'pending',
    },
    {
      id: 'compliance',
      title: 'Compliance Analysis',
      description: 'Component compliance validation and scoring',
      icon: Shield,
      available: session.complianceScore !== undefined,
      stats: [
        { label: 'Score', value: `${session.complianceScore}%` },
        { label: 'Compliant', value: `${session.compliantComponents}/${session.totalComponents}` },
        { label: 'Failed', value: session.totalComponents - session.compliantComponents },
      ],
      status: session.complianceScore !== undefined ? 'complete' : 'pending',
    },
  ];

  const getStatusColor = (status?: 'complete' | 'partial' | 'pending') => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status?: 'complete' | 'partial' | 'pending') => {
    switch (status) {
      case 'complete':
        return CheckCircle2;
      case 'partial':
        return AlertCircle;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Section */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{session.name}</h1>
              <p className="text-lg text-gray-600 mb-4">
                {session.systemType} • Version {session.version}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Cpu className="h-4 w-4" />
                  {session.totalComponents} components
                </span>
                <span>•</span>
                <span>Created {new Date(session.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Updated {new Date(session.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Overall Compliance Score */}
            {session.complianceScore !== undefined && (
              <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-lg">
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${
                    session.complianceScore >= 70
                      ? 'text-green-600'
                      : session.complianceScore >= 40
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {session.complianceScore}%
                  </div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Overall Compliance</div>
                  <div className="text-xs text-gray-500">
                    {session.compliantComponents} of {session.totalComponents} compliant
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Sections</h2>
            <p className="text-gray-600">
              Navigate to different sections of your BOM analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => {
              const Icon = section.icon;
              const StatusIcon = getStatusIcon(section.status);

              return (
                <button
                  key={section.id}
                  onClick={() => section.available && onNavigateToStage(section.id)}
                  disabled={!section.available}
                  className={`group relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all ${
                    section.available
                      ? 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  {/* Background gradient on hover */}
                  {section.available && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`rounded-lg p-3 ${
                        section.available 
                          ? 'bg-blue-100 group-hover:bg-blue-200' 
                          : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          section.available ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>

                      <div className="flex items-center gap-2">
                        {section.status && (
                          <Badge className={getStatusColor(section.status)}>
                            {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                            {section.status === 'complete' ? 'Complete' : 
                             section.status === 'partial' ? 'Partial' : 'Pending'}
                          </Badge>
                        )}
                        {section.available && (
                          <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Title and Description */}
                    <h3 className={`text-lg font-bold mb-2 ${
                      section.available 
                        ? 'text-gray-900 group-hover:text-blue-600' 
                        : 'text-gray-500'
                    }`}>
                      {section.title}
                    </h3>
                    <p className={`text-sm mb-4 ${
                      section.available ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {section.description}
                    </p>

                    {/* Stats */}
                    {section.stats && section.stats.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          {section.stats.map((stat, idx) => (
                            <div key={idx}>
                              <div className={`text-lg font-bold ${
                                section.available ? 'text-gray-900' : 'text-gray-400'
                              }`}>
                                {stat.value}
                              </div>
                              <div className="text-xs text-gray-500">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 rounded-xl border-2 border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => onNavigateToStage('compliance')}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                View Compliance Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateToStage('requirements')}
                className="gap-2"
              >
                <FileCheck className="h-4 w-4" />
                Review Requirements
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateToStage('subsystems')}
                className="gap-2"
                disabled={session.subsystems.length === 0}
              >
                <Grid3x3 className="h-4 w-4" />
                Explore Subsystems
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateToStage('architecture')}
                className="gap-2"
              >
                <Network className="h-4 w-4" />
                View Architecture
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isChatOpen ? 'w-96' : 'w-auto'}`}>
        {isChatOpen ? (
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">BOM Assistant</h3>
                  <p className="text-xs text-white/80">Ask me anything about your BOM</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="h-96 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1">
                            <Sparkles className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs text-gray-500">AI Assistant</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      } text-gray-400`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-xs text-gray-500">AI Assistant</span>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t-2 border-gray-200">
              <div className="flex items-end gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about components, compliance, requirements..."
                  rows={2}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 transition-colors text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className={`p-3 rounded-xl transition-all ${
                    inputValue.trim()
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105'
                      : 'bg-gray-200'
                  }`}
                >
                  <Send className={`h-5 w-5 ${inputValue.trim() ? 'text-white' : 'text-gray-400'}`} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all hover:scale-110"
          >
            <MessageCircle className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Ask about your BOM
              <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
