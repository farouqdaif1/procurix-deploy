import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ComplianceFlowView } from './components/ComplianceFlowView';
import { mockComponents, mockSession } from '@/app/data/mockData';
import { Button } from '@/app/shared/components/ui/button';
import { CheckCircle } from 'lucide-react';

export function CompliancePage() {
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>();
  const totalComponents = mockSession.totalComponents || 0;
  const compliantComponents = mockSession.compliantComponents || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Compliance Summary Bar */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Compliance Analysis</h2>
            <p className="text-sm text-gray-600">
              {compliantComponents} of {totalComponents} components are compliant
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2">
              <div className="text-2xl font-bold text-green-600">
                {compliantComponents}
              </div>
              <div className="text-xs text-gray-600">Compliant</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2">
              <div className="text-2xl font-bold text-red-600">
                {totalComponents - compliantComponents}
              </div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
            <Link to="/finalize">
              <Button className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete & Review
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <ComplianceFlowView
          components={mockComponents}
          subsystems={mockSession.subsystems}
          selectedComponentId={selectedComponentId}
          onComponentSelect={setSelectedComponentId}
          onComponentExplore={() => {}}
        />
      </div>
    </div>
  );
}
