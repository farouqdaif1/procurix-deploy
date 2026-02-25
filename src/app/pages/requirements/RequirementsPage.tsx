import { useNavigate } from 'react-router-dom';
import { RequirementsView } from './components/RequirementsView';
import { toast } from 'sonner';

export function RequirementsPage() {
  const navigate = useNavigate();

  const handleRequirementsComplete = () => {
    toast.success('Requirements generated!');
    navigate('/architecture');
  };

  return (
    <RequirementsView
      onRequirementsComplete={handleRequirementsComplete}
    />
  );
}
