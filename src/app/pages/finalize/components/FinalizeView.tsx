import { useState } from 'react';
import { 
  Package, 
  FileText, 
  Box, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/app/shared/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import type { 
  FinalizedComponent, 
  FinalizeResponse, 
  RequirementsDataResponse 
} from '@/app/services/api';

interface FinalizeViewProps {
  components: FinalizedComponent[];
  requirementsData: RequirementsDataResponse | null;
  finalizeResponse: FinalizeResponse | null;
}

export function FinalizeView({ components, requirementsData, finalizeResponse }: FinalizeViewProps) {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);
  const [expandedSubsystem, setExpandedSubsystem] = useState<string | null>(null);

  const toggleComponent = (name: string) => {
    setExpandedComponent(expandedComponent === name ? null : name);
  };

  const toggleRequirement = (reqId: string) => {
    setExpandedRequirement(expandedRequirement === reqId ? null : reqId);
  };

  const toggleSubsystem = (subsystemId: string) => {
    setExpandedSubsystem(expandedSubsystem === subsystemId ? null : subsystemId);
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 p-3">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Finalize</h1>
              <p className="text-lg text-gray-600">Session finalized and components processed</p>
            </div>
          </div>
        </div>

        {/* Finalize Summary */}
        {finalizeResponse && (
          <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Finalization Complete</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-white border border-green-200 p-4">
                <div className="text-sm text-gray-600 mb-1">Components Created</div>
                <div className="text-2xl font-bold text-green-600">{finalizeResponse.components_created}</div>
              </div>
              <div className="rounded-lg bg-white border border-green-200 p-4">
                <div className="text-sm text-gray-600 mb-1">Version</div>
                <div className="text-2xl font-bold text-gray-900">{finalizeResponse.version}</div>
              </div>
              <div className="rounded-lg bg-white border border-green-200 p-4">
                <div className="text-sm text-gray-600 mb-1">System Type</div>
                <div className="text-sm font-semibold text-gray-900">{finalizeResponse.system_type}</div>
              </div>
              <div className="rounded-lg bg-white border border-green-200 p-4">
                <div className="text-sm text-gray-600 mb-1">BOM ID</div>
                <div className="text-xs font-mono text-gray-700 truncate">{finalizeResponse.requirements_loaded.bom_id}</div>
              </div>
            </div>
            {finalizeResponse.requirements_loaded && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">Requirements Loaded:</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-xs">
                    <span className="text-gray-600">Requirements:</span>
                    <span className="font-semibold text-gray-900 ml-2">{finalizeResponse.requirements_loaded.requirements_count}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600">Subsystems:</span>
                    <span className="font-semibold text-gray-900 ml-2">{finalizeResponse.requirements_loaded.subsystems_count}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600">Subsystem Requirements:</span>
                    <span className="font-semibold text-gray-900 ml-2">{finalizeResponse.requirements_loaded.subsystem_requirements_count}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overall Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Total Components</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{components.length}</div>
          </div>

          <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-600">Requirements</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {requirementsData?.requirements.length || 0}
            </div>
          </div>

          <div className="rounded-xl border-2 border-cyan-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Box className="h-5 w-5 text-cyan-600" />
              <span className="text-sm font-semibold text-gray-600">Subsystems</span>
            </div>
            <div className="text-3xl font-bold text-cyan-600">
              {requirementsData?.subsystems.length || 0}
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Components ({components.length})</h2>
          </div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {components.map((component, index) => (
              <div
                key={`${component.name}-${index}`}
                className="rounded-lg border-2 border-blue-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleComponent(`${component.name}-${index}`)}
                  className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{component.name}</div>
                      <div className="text-sm text-gray-600">
                        Category: {component.category || 'uncategorized'} • Rationale: {component.rationale}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {component.depends_on.length > 0 && (
                      <Badge className="bg-gray-100 text-gray-700">
                        {component.depends_on.length} dependencies
                      </Badge>
                    )}
                    {expandedComponent === `${component.name}-${index}` ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedComponent === `${component.name}-${index}` && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-blue-200 bg-blue-50"
                    >
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Properties</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(component.properties).map(([key, prop]) => (
                            <div key={key} className="rounded-lg bg-white border border-blue-200 p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-1 capitalize">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm font-bold text-gray-900">{prop.display_value || prop.value}</div>
                              {prop.units && (
                                <div className="text-xs text-gray-500">{prop.units}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {component.depends_on.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Dependencies</h5>
                            <div className="flex flex-wrap gap-2">
                              {component.depends_on.map((dep, idx) => (
                                <Badge key={idx} className="bg-gray-200 text-gray-700">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements Section */}
        {requirementsData && requirementsData.requirements.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Requirements ({requirementsData.requirements.length})
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {requirementsData.requirements.map((req) => (
                <div
                  key={req.req_id}
                  className="rounded-lg border-2 border-purple-200 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => toggleRequirement(req.req_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="rounded-lg bg-purple-100 p-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{req.description}</div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-100 text-purple-700">{req.category}</Badge>
                          <span className="text-xs text-gray-500 font-mono">{req.req_id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {req.bom_reference.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                          {req.bom_reference.length} BOM refs
                        </Badge>
                      )}
                      {expandedRequirement === req.req_id ? (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedRequirement === req.req_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-purple-200 bg-purple-50"
                      >
                        <div className="p-4">
                          {req.bom_reference.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">BOM References</h5>
                              <div className="flex flex-wrap gap-2">
                                {req.bom_reference.map((ref, idx) => (
                                  <Badge key={idx} className="bg-blue-200 text-blue-800">
                                    {ref}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subsystems Section */}
        {requirementsData && requirementsData.subsystems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Box className="h-6 w-6 text-cyan-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Subsystems ({requirementsData.subsystems.length})
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {requirementsData.subsystems.map((subsystem) => (
                <div
                  key={subsystem.subsystem_id}
                  className="rounded-lg border-2 border-cyan-200 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => toggleSubsystem(subsystem.subsystem_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-cyan-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="rounded-lg bg-cyan-100 p-2">
                        <Box className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{subsystem.name}</div>
                        <div className="text-sm text-gray-600">{subsystem.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-cyan-100 text-cyan-700">
                        {subsystem.bom_reference.length} components
                      </Badge>
                      {expandedSubsystem === subsystem.subsystem_id ? (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedSubsystem === subsystem.subsystem_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-cyan-200 bg-cyan-50"
                      >
                        <div className="p-4 space-y-4">
                          {subsystem.associated_requirements.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Associated Requirements</h5>
                              <div className="flex flex-wrap gap-2">
                                {subsystem.associated_requirements.map((reqId, idx) => (
                                  <Badge key={idx} className="bg-purple-200 text-purple-800">
                                    {reqId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {subsystem.bom_reference.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">BOM References</h5>
                              <div className="flex flex-wrap gap-2">
                                {subsystem.bom_reference.map((ref, idx) => (
                                  <Badge key={idx} className="bg-blue-200 text-blue-800">
                                    {ref}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {components.length === 0 && !requirementsData && (
          <div className="rounded-xl border-2 border-gray-200 bg-white p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">No components or requirements data found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
