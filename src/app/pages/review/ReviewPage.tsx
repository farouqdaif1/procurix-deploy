import { useNavigate } from 'react-router-dom';
import { ReviewStage } from './components/ReviewStage';
import { mockSession } from '@/app/data/mockData';
import { toast } from 'sonner';

export function ReviewPage() {
  const navigate = useNavigate();

  const handleNavigateToStage = (stage: string) => {
    // Upload stage is not navigable - users can only go back to Classify (fundamental) and later stages
    if (stage === 'upload') {
      return; // Prevent navigation to upload
    }
    
    const stageRoutes: Record<string, string> = {
      discovery: '/discovery',
      identify: '/identify',
      fundamental: '/fundamental',
      architecture: '/architecture',
      requirements: '/requirements',
      subsystems: '/subsystems',
    };
    
    const route = stageRoutes[stage];
    if (route) {
      navigate(route);
    }
  };

  const handleSubmit = () => {
    toast.success('BOM submitted successfully!');
    navigate('/completed');
  };

  return (
    <ReviewStage
      session={mockSession}
      onNavigateToStage={handleNavigateToStage}
      onSubmit={handleSubmit}
    />
  );
}
