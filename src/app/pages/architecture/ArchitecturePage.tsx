import { useNavigate } from 'react-router-dom';
import { SystemArchitectureView } from './components/SystemArchitectureView';
import { mockComponents } from '@/app/data/mockData';
import { toast } from 'sonner';

export function ArchitecturePage() {
  const navigate = useNavigate();

  const handleArchitectureComplete = () => {
    toast.success('System architecture defined!');
    navigate('/requirements');
  };

  return (
    <SystemArchitectureView
      components={mockComponents}
      onArchitectureComplete={handleArchitectureComplete}
    />
  );
}
