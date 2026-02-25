import { useNavigate } from 'react-router-dom';
import { UploadView } from './components/UploadView';
import { toast } from 'sonner';

export function UploadPage() {
  const navigate = useNavigate();

  const handleUploadComplete = () => {
    toast.success('BOM uploaded successfully!');
    navigate('/fundamental'); // Go directly to classification after upload
  };

  return <UploadView onUploadComplete={handleUploadComplete} />;
}
