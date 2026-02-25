import { useNavigate } from 'react-router-dom';
import { FundamentalClassificationView } from './components/FundamentalClassificationView';
import { mockComponents } from '@/app/data/mockData';
import type { Component } from '@/app/types';
import { toast } from 'sonner';

export function FundamentalPage() {
  const navigate = useNavigate();

  const handleClassificationComplete = (classifiedComponents: Component[]) => {
    const fundamentalCount = classifiedComponents.filter(c => c.isFundamental === true).length;
    const auxiliaryCount = classifiedComponents.filter(c => c.isFundamental === false).length;
    
    toast.success(`Classification complete! ${fundamentalCount} fundamental, ${auxiliaryCount} auxiliary`);
    navigate('/analysis');
  };

  return (
    <FundamentalClassificationView
      components={mockComponents}
      onClassificationComplete={handleClassificationComplete}
    />
  );
}
