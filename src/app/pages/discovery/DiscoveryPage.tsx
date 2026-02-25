import { useNavigate } from 'react-router-dom';
import { SystemDiscoveryView } from './components/SystemDiscoveryView';
import { mockComponents } from '@/app/data/mockData';
import { toast } from 'sonner';

export function DiscoveryPage() {
  const navigate = useNavigate();

  const handleDiscoveryComplete = (systemType: string) => {
    toast.success(`System identified as: ${systemType}`);
    navigate('/identify');
  };

  return (
    <SystemDiscoveryView
      components={mockComponents}
      onDiscoveryComplete={handleDiscoveryComplete}
    />
  );
}
