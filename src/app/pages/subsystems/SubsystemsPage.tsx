import { useNavigate } from 'react-router-dom';
import { SubsystemsView } from './components/SubsystemsView';
import { mockComponents, mockSession } from '@/app/data/mockData';
import { toast } from 'sonner';

export function SubsystemsPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    toast.success('Subsystems identified!');
    navigate('/compliance');
  };

  return (
    <SubsystemsView
      subsystems={mockSession.subsystems}
      components={mockComponents}
      requirements={mockSession.requirements}
      onComplete={handleComplete}
      onAddRequirements={() => {}}
    />
  );
}
