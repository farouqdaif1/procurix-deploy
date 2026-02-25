import { useNavigate } from 'react-router-dom';
import { SystemDiscoveryView } from './components/SystemDiscoveryView';
import { mockComponents } from '@/app/data/mockData';
import type { Component } from '@/app/types';
import { toast } from 'sonner';

export function DiscoveryPage() {
  const navigate = useNavigate();

  const handleDiscoveryComplete = (systemType: string, validatedComponents: Component[]) => {
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
