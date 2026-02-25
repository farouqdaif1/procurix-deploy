import { useNavigate } from 'react-router-dom';
import { AnalysisView } from './components/AnalysisView';
import { toast } from 'sonner';

export function AnalysisPage() {
  const navigate = useNavigate();

  const handleSystemTypeSelected = (systemType: string) => {
    toast.success(`System type selected: ${systemType}`);
    navigate('/validate');
  };

  return <AnalysisView onSystemTypeSelected={handleSystemTypeSelected} />;
}
