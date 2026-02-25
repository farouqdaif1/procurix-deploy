import { useNavigate } from 'react-router-dom';
import { ValidationView } from './components/validationView';
import { mockComponents } from '@/app/data/mockData';
import type { Component } from '@/app/types';
import { toast } from 'sonner';

export function ValidatePage() {
  const navigate = useNavigate();

  const handleValidationComplete = (validatedComponents: Component[]) => {
    toast.success('All components validated!');
    navigate('/requirements');
  };  

  return (
    <ValidationView
      components={mockComponents}
      onValidationComplete={handleValidationComplete}
    />
  );
}
