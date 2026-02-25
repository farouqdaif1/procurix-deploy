import { useNavigate } from 'react-router-dom';
import { BOMLibrary } from './components/BOMLibrary';
import { mockBOMSessions } from '@/app/data/mockData';
import type { BOMSession } from '@/app/types';

export function LibraryPage() {
  const navigate = useNavigate();

  const handleSelectSession = (session: BOMSession) => {
    // Navigate to completed page for finished BOMs, or start workflow
    if (session.complianceScore !== undefined) {
      navigate('/completed');
    } else {
      navigate('/upload');
    }
  };

  const handleNewBOM = () => {
    navigate('/upload');
  };

  return (
    <BOMLibrary
      sessions={mockBOMSessions}
      onSelectSession={handleSelectSession}
      onNewBOM={handleNewBOM}
    />
  );
}
