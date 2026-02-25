import { CompletedBOMView } from './components/CompletedBOMView';
import { mockSession } from '@/app/data/mockData';

export function CompletedPage() {
  return (
    <CompletedBOMView
      session={mockSession}
      onBack={() => window.location.href = '/'}
    />
  );
}
