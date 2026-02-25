import { useState } from 'react';
import type { BOMSession, Component, Requirement, Subsystem } from '@/app/types';
import { 
  Upload, 
  Sparkles, 
  Zap, 
  Filter, 
  Layers, 
  FileText, 
  Box, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  Cpu,
  Shield
} from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { Badge } from '@/app/shared/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewStageProps {
  session: BOMSession;
  onNavigateToStage: (stage: 'upload' | 'discovery' | 'identify' | 'fundamental' | 'architecture' | 'requirements' | 'subsystems' | 'compliance') => void;
  onSubmit?: () => void;
}

type ExpandedSection = 'upload' | 'discovery' | 'identify' | 'fundamental' | 'architecture' | 'requirements' | 'subsystems' | 'compliance' | null;

export function ReviewStage({ session, onNavigateToStage, onSubmit }: ReviewStageProps) {
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const fundamentalComponents = session.components.filter(c => c.isFundamental === true);
  const auxiliaryComponents = session.components.filter(c => c.isFundamental === false);
  const compliantComponents = session.components.filter(c => c.complianceStatus === 'compliant');
  const failedComponents = session.components.filter(c => c.complianceStatus === 'failed');

  const sections = [
    {
      id: 'upload' as const,
      icon: Upload,
      title: 'BOM Upload',
      subtitle: 'Initial data import',
      color: 'blue',
      summary: `${session.totalComponents} components uploaded from Excel`,
    },
    {
      id: 'discovery' as const,
      icon: Sparkles,
      title: 'System Discovery',
      subtitle: 'System type identification',
      color: 'purple',
      summary: `System identified as: ${session.systemType || 'Unknown'}`,
    },
    {
      id: 'identify' as const,
      icon: Zap,
      title: 'Component Identification',
      subtitle: 'Part number resolution',
      color: 'yellow',
      summary: `${session.components.filter(c => c.isIdentified).length} components identified with part numbers`,
    },
    {
      id: 'fundamental' as const,
      icon: Filter,
      title: 'Fundamental Classification',
      subtitle: 'Essential vs auxiliary',
      color: 'green',
      summary: `${fundamentalComponents.length} fundamental, ${auxiliaryComponents.length} auxiliary`,
    },
    {
      id: 'architecture' as const,
      icon: Layers,
      title: 'System Architecture',
      subtitle: 'Block diagram creation',
      color: 'indigo',
      summary: `System architecture defined with functional blocks`,
    },
    {
      id: 'requirements' as const,
      icon: FileText,
      title: 'Requirements Generation',
      subtitle: 'OEM requirements',
      color: 'orange',
      summary: `${session.requirements.length} requirements generated`,
    },
    {
      id: 'subsystems' as const,
      icon: Box,
      title: 'Subsystem Analysis',
      subtitle: 'Functional grouping',
      color: 'cyan',
      summary: `${session.subsystems.length} subsystems identified`,
    },
    {
      id: 'compliance' as const,
      icon: CheckCircle,
      title: 'Compliance Analysis',
      subtitle: 'Validation results',
      color: 'red',
      summary: `${compliantComponents.length}/${session.totalComponents} components compliant (${session.complianceScore}%)`,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-3">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Review & Summary</h1>
              <p className="text-lg text-gray-600">Complete workflow overview for {session.name}</p>
            </div>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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
              <span className="text-sm font-semibold text-gray-600">Compliant</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{compliantComponents.length}</div>
          </div>

          <div className="rounded-xl border-2 border-red-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-semibold text-gray-600">Failed</span>
            </div>
            <div className="text-3xl font-bold text-red-600">{failedComponents.length}</div>
          </div>

          <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-600">Compliance Score</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{session.complianceScore}%</div>
          </div>
        </div>

        {/* Stage Sections */}
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const colorClasses = {
              blue: 'from-blue-50 to-blue-100 border-blue-200',
              purple: 'from-purple-50 to-purple-100 border-purple-200',
              yellow: 'from-yellow-50 to-yellow-100 border-yellow-200',
              green: 'from-green-50 to-green-100 border-green-200',
              indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
              orange: 'from-orange-50 to-orange-100 border-orange-200',
              cyan: 'from-cyan-50 to-cyan-100 border-cyan-200',
              red: 'from-red-50 to-red-100 border-red-200',
            }[section.color];

            return (
              <div key={section.id} className={`rounded-xl border-2 bg-gradient-to-r ${colorClasses} overflow-hidden`}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg bg-${section.color}-200 p-2`}>
                      <Icon className={`h-6 w-6 text-${section.color}-700`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-600">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-white text-gray-700 border border-gray-300">
                      {section.summary}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToStage(section.id);
                      }}
                      className="gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Go Back
                    </Button>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t-2 border-gray-200 bg-white"
                    >
                      <div className="p-6">
                        {section.id === 'upload' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Upload Details</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                <div className="text-xs text-gray-600 mb-1">Session Name</div>
                                <div className="text-sm font-semibold text-gray-900">{session.name}</div>
                              </div>
                              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                <div className="text-xs text-gray-600 mb-1">Version</div>
                                <div className="text-sm font-semibold text-gray-900">{session.version}</div>
                              </div>
                              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                <div className="text-xs text-gray-600 mb-1">Total Components</div>
                                <div className="text-sm font-semibold text-gray-900">{session.totalComponents}</div>
                              </div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <h5 className="text-sm font-semibold text-gray-900 mb-2">Component Breakdown</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="text-xs">
                                  <span className="text-gray-600">Specific Parts:</span>
                                  <span className="font-semibold text-gray-900 ml-2">
                                    {session.components.filter(c => c.partNumber && !c.isGeneric).length}
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-gray-600">Generic Parts:</span>
                                  <span className="font-semibold text-gray-900 ml-2">
                                    {session.components.filter(c => !c.partNumber || c.isGeneric).length}
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-gray-600">Unique Types:</span>
                                  <span className="font-semibold text-gray-900 ml-2">
                                    {new Set(session.components.map(c => c.type)).size}
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-gray-600">Upload Status:</span>
                                  <span className="font-semibold text-green-600 ml-2">✓ Complete</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {section.id === 'discovery' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">System Discovery Results</h4>
                            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4 mb-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="h-5 w-5 text-purple-600" />
                                <div>
                                  <div className="text-xs text-gray-600">Identified System Type</div>
                                  <div className="text-lg font-bold text-purple-900">{session.systemType || 'Unknown'}</div>
                                </div>
                              </div>
                              <div className="text-xs text-purple-700 mt-2">
                                System classification determined through AI-powered component analysis and pattern recognition.
                              </div>
                            </div>
                            
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Component Distribution Analysis</h5>
                            <div className="space-y-2">
                              {Object.entries(
                                session.components.reduce((acc, c) => {
                                  acc[c.type] = (acc[c.type] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              )
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([type, count]) => {
                                  const percentage = ((count / session.totalComponents) * 100).toFixed(1);
                                  return (
                                    <div key={type} className="rounded-lg border border-gray-200 bg-white p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-700 capitalize">{type}</span>
                                        <span className="text-xs text-gray-600">{count} ({percentage}%)</span>
                                      </div>
                                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-purple-500" 
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {section.id === 'identify' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Identification Summary</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                                <div className="text-xs text-gray-600 mb-1">Identified</div>
                                <div className="text-2xl font-bold text-green-600">
                                  {session.components.filter(c => c.isIdentified).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {((session.components.filter(c => c.isIdentified).length / session.totalComponents) * 100).toFixed(0)}% of total
                                </div>
                              </div>
                              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                <div className="text-xs text-gray-600 mb-1">Generic</div>
                                <div className="text-2xl font-bold text-gray-600">
                                  {session.components.filter(c => c.isGeneric).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {((session.components.filter(c => c.isGeneric).length / session.totalComponents) * 100).toFixed(0)}% of total
                                </div>
                              </div>
                              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                                <div className="text-xs text-gray-600 mb-1">With Part Numbers</div>
                                <div className="text-2xl font-bold text-blue-600">
                                  {session.components.filter(c => c.partNumber).length}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {((session.components.filter(c => c.partNumber).length / session.totalComponents) * 100).toFixed(0)}% of total
                                </div>
                              </div>
                            </div>

                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Component Details</h5>
                            <div className="max-h-80 overflow-auto space-y-2">
                              {session.components.slice(0, 15).map(comp => (
                                <div key={comp.id} className={`rounded-lg border p-3 ${
                                  comp.isIdentified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-gray-900">{comp.reference}</span>
                                      {comp.isIdentified && (
                                        <Badge className="bg-green-100 text-green-700 text-xs">Identified</Badge>
                                      )}
                                      {comp.isGeneric && (
                                        <Badge className="bg-gray-100 text-gray-700 text-xs">Generic</Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-600">{comp.type}</span>
                                  </div>
                                  {comp.partNumber && (
                                    <div className="text-xs text-gray-600 font-mono">{comp.partNumber}</div>
                                  )}
                                  {comp.description && (
                                    <div className="text-xs text-gray-600 mt-1">{comp.description}</div>
                                  )}
                                </div>
                              ))}
                              {session.components.length > 15 && (
                                <div className="text-xs text-gray-500 text-center py-2">
                                  ... and {session.components.length - 15} more components
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {section.id === 'fundamental' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Classification Results</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-semibold text-gray-700">Fundamental Components</span>
                                </div>
                                <div className="text-3xl font-bold text-green-600 mb-1">{fundamentalComponents.length}</div>
                                <div className="text-xs text-gray-600">
                                  {((fundamentalComponents.length / session.totalComponents) * 100).toFixed(1)}% of total BOM
                                </div>
                              </div>
                              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="h-5 w-5 text-orange-600" />
                                  <span className="text-sm font-semibold text-gray-700">Auxiliary Components</span>
                                </div>
                                <div className="text-3xl font-bold text-orange-600 mb-1">{auxiliaryComponents.length}</div>
                                <div className="text-xs text-gray-600">
                                  {((auxiliaryComponents.length / session.totalComponents) * 100).toFixed(1)}% of total BOM
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-600" />
                                  Fundamental Components ({fundamentalComponents.length})
                                </div>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                  {fundamentalComponents.map(c => (
                                    <div key={c.id} className="rounded-lg bg-green-50 border border-green-200 p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{c.reference}</span>
                                        <Badge className="bg-green-100 text-green-700 text-xs">Core</Badge>
                                      </div>
                                      <div className="text-xs text-gray-600 mb-1">{c.type}</div>
                                      {c.partNumber && (
                                        <div className="text-xs text-gray-500 font-mono">{c.partNumber}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-orange-600" />
                                  Auxiliary Components ({auxiliaryComponents.length})
                                </div>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                  {auxiliaryComponents.map(c => (
                                    <div key={c.id} className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{c.reference}</span>
                                        <Badge className="bg-orange-100 text-orange-700 text-xs">Support</Badge>
                                      </div>
                                      <div className="text-xs text-gray-600 mb-1">{c.type}</div>
                                      {c.partNumber && (
                                        <div className="text-xs text-gray-500 font-mono">{c.partNumber}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {section.id === 'architecture' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Architecture Overview</h4>
                            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="h-5 w-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-900">System Architecture Defined</span>
                              </div>
                              <p className="text-sm text-indigo-800">
                                Functional block diagram has been created showing system hierarchy and component relationships.
                              </p>
                            </div>

                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Subsystem Overview</h5>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {session.subsystems.slice(0, 4).map(sub => {
                                const subComps = session.components.filter(c => c.subsystemId === sub.id);
                                return (
                                  <div key={sub.id} className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Box className="h-4 w-4 text-indigo-600" />
                                      <span className="font-semibold text-gray-900 text-sm">{sub.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      {subComps.length} components
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {subComps.slice(0, 3).map(c => c.reference).join(', ')}
                                      {subComps.length > 3 && ` +${subComps.length - 3} more`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                              <h5 className="text-sm font-semibold text-gray-900 mb-2">Architecture Metrics</h5>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <div className="text-xs text-gray-600">Total Subsystems</div>
                                  <div className="text-lg font-bold text-gray-900">{session.subsystems.length}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Functional Blocks</div>
                                  <div className="text-lg font-bold text-gray-900">{session.subsystems.length}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">Avg Components/Block</div>
                                  <div className="text-lg font-bold text-gray-900">
                                    {Math.round(session.totalComponents / session.subsystems.length)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {section.id === 'requirements' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Requirements ({session.requirements.length})</h4>
                            
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
                                const count = session.requirements.filter(r => r.priority === priority).length;
                                const passed = session.requirements.filter(r => r.priority === priority && r.isPassed).length;
                                const colorMap = {
                                  critical: 'red',
                                  high: 'orange',
                                  medium: 'yellow',
                                  low: 'gray'
                                };
                                const color = colorMap[priority];
                                return (
                                  <div key={priority} className={`rounded-lg bg-${color}-50 border border-${color}-200 p-3`}>
                                    <div className="text-xs text-gray-600 capitalize mb-1">{priority}</div>
                                    <div className="text-xl font-bold text-gray-900">{count}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {passed}/{count} passed
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <h5 className="text-sm font-semibold text-gray-900 mb-3">Detailed Requirements List</h5>
                            <div className="space-y-2 max-h-96 overflow-auto">
                              {session.requirements.map(req => (
                                <div key={req.id} className="rounded-lg border border-gray-200 bg-white p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge className={`
                                        ${req.priority === 'critical' ? 'bg-red-100 text-red-700' : ''}
                                        ${req.priority === 'high' ? 'bg-orange-100 text-orange-700' : ''}
                                        ${req.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${req.priority === 'low' ? 'bg-gray-100 text-gray-700' : ''}
                                      `}>
                                        {req.priority}
                                      </Badge>
                                      <span className="text-xs font-mono text-gray-500">{req.code}</span>
                                    </div>
                                    {req.isPassed ? (
                                      <div className="flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-xs font-semibold text-green-600">Passed</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-xs font-semibold text-red-600">Failed</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900 mb-1">{req.title}</div>
                                  <div className="text-xs text-gray-600">{req.description}</div>
                                  {req.category && (
                                    <div className="mt-2">
                                      <Badge className="bg-blue-50 text-blue-700 text-xs">{req.category}</Badge>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {section.id === 'subsystems' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Subsystems ({session.subsystems.length})</h4>
                            <div className="space-y-4">
                              {session.subsystems.map(sub => {
                                const subComps = session.components.filter(c => c.subsystemId === sub.id);
                                const fundamentalCount = subComps.filter(c => c.isFundamental).length;
                                return (
                                  <div key={sub.id} className="rounded-lg border-2 border-cyan-200 bg-cyan-50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-cyan-200 p-2">
                                          <Cpu className="h-5 w-5 text-cyan-700" />
                                        </div>
                                        <div>
                                          <div className="font-bold text-gray-900">{sub.name}</div>
                                          <div className="text-xs text-gray-600">{subComps.length} components</div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge className="bg-green-100 text-green-700">
                                          {fundamentalCount} fundamental
                                        </Badge>
                                        <Badge className="bg-orange-100 text-orange-700">
                                          {subComps.length - fundamentalCount} auxiliary
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="rounded-lg bg-white border border-cyan-200 p-3">
                                      <h6 className="text-xs font-semibold text-gray-700 mb-2">Components in this subsystem:</h6>
                                      <div className="grid grid-cols-2 gap-2">
                                        {subComps.map(c => (
                                          <div key={c.id} className="text-xs bg-gray-50 rounded px-2 py-1 flex items-center justify-between">
                                            <span className="font-medium text-gray-900">{c.reference}</span>
                                            <span className="text-gray-500">{c.type}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {section.id === 'compliance' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Compliance Analysis Results</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-semibold text-gray-600">Compliant</span>
                                </div>
                                <div className="text-3xl font-bold text-green-600 mb-1">{compliantComponents.length}</div>
                                <div className="text-xs text-gray-600">
                                  {((compliantComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <span className="text-sm font-semibold text-gray-600">Failed</span>
                                </div>
                                <div className="text-3xl font-bold text-red-600 mb-1">{failedComponents.length}</div>
                                <div className="text-xs text-gray-600">
                                  {((failedComponents.length / session.totalComponents) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield className="h-5 w-5 text-purple-600" />
                                  <span className="text-sm font-semibold text-gray-600">Overall Score</span>
                                </div>
                                <div className="text-3xl font-bold text-purple-600 mb-1">{session.complianceScore}%</div>
                                <div className="text-xs text-gray-600">Compliance rating</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h5 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Compliant Components ({compliantComponents.length})
                                </h5>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                  {compliantComponents.map(c => (
                                    <div key={c.id} className="rounded-lg bg-green-50 border border-green-200 p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{c.reference}</span>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </div>
                                      <div className="text-xs text-gray-600 mb-1">{c.type}</div>
                                      {c.partNumber && (
                                        <div className="text-xs text-gray-500 font-mono">{c.partNumber}</div>
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
                              <div>
                                <h5 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Failed Components ({failedComponents.length})
                                </h5>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                  {failedComponents.map(c => (
                                    <div key={c.id} className="rounded-lg bg-red-50 border border-red-200 p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{c.reference}</span>
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </div>
                                      <div className="text-xs text-gray-600 mb-1">{c.type}</div>
                                      {c.partNumber && (
                                        <div className="text-xs text-gray-500 font-mono mb-2">{c.partNumber}</div>
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

        {/* Footer Action */}
        <div className="mt-8 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Workflow Complete!</h3>
              <p className="text-gray-600">
                All stages have been completed. Review the summaries above or navigate back to any stage to make changes.
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-green-200">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigateToStage('compliance')}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Go Back to Compliance
            </Button>
            
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white gap-2"
              onClick={() => {
                // Handle submit - you can add your submit logic here
                console.log('Submitting final BOM...', session);
                if (onSubmit) {
                  onSubmit();
                } else {
                  alert('BOM submitted successfully!');
                }
              }}
            >
              <CheckCircle className="h-5 w-5" />
              Submit Final BOM
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}