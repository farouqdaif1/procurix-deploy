import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadView } from './components/UploadView';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';

export function UploadPage() {
  const navigate = useNavigate();
  const { sessionId: contextSessionId, setSessionId, setCurrentStage, setUploadData } = useSession();
  const { sessionId: querySessionId, updateParams } = useQueryParams();

  // Clear session context and URL params when entering upload page for a new BOM
  useEffect(() => {
    // On mount, clear everything to ensure fresh start
    // This handles the case when user clicks "Upload New BOM" from library
    setSessionId(null);
    setCurrentStage(null);
    setUploadData(null);
    
    // If there's a query param, clear it (we're starting fresh)
    if (querySessionId) {
      updateParams(undefined);
    }
  }, []); // Only run on mount to handle new uploads

  // Sync session ID from query params (only when query param changes and we have a valid session)
  useEffect(() => {
    if (querySessionId && querySessionId !== contextSessionId) {
      setSessionId(querySessionId);
    }
  }, [querySessionId, contextSessionId, setSessionId]);

  // Update URL with session ID when context changes (for new uploads)
  // This ensures new sessions replace old ones in the URL
  useEffect(() => {
    // Update URL if context has a session and it's different from URL
    // This handles the case when a new file is uploaded and creates a new session
    if (contextSessionId && contextSessionId !== querySessionId) {
      updateParams(contextSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSessionId, querySessionId]); // updateParams is stable via ref, no need in deps

  const handleUploadComplete = (_data: any) => {
    // Don't navigate automatically - let user see the data and click button
    toast.success('BOM uploaded successfully!');
  };

  const handleProceedToClassification = () => {
    const activeSessionId = contextSessionId || querySessionId;
    if (activeSessionId) {
      navigate(`/fundamental?session=${activeSessionId}`);
    } else {
      navigate('/fundamental');
    }
  };

  return (
    <UploadView 
      onUploadComplete={handleUploadComplete}
      onProceedToClassification={handleProceedToClassification}
    />
  );
}
