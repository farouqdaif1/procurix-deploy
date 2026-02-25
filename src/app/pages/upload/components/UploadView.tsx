import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { createSession, uploadBOM } from '@/app/services/api';

interface UploadViewProps {
  onUploadComplete: (data: any) => void;
}

export function UploadView({ onUploadComplete }: UploadViewProps) {
  const { setSessionId, setUploadData } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);

    try {
      // 1. Create a new session
      const sessionResponse = await createSession();
      const sessionId = sessionResponse.session_id;

      // 2. Set session ID in context
      setSessionId(sessionId);

      // 3. Upload the BOM file
      const uploadResult = await uploadBOM(sessionId, file);

      // 4. Store upload data in context
      setUploadData(uploadResult);

      // 5. On success, call onUploadComplete
      setIsProcessing(false);
      onUploadComplete({
        fileName: file.name,
        sessionId,
        ...uploadResult,
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload BOM';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload BOM File</h1>
            <p className="text-gray-600">
              Upload your Bill of Materials file to begin analysis
          </p>
          </div>

          {uploadedFile && !isProcessing ? (
          <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-xl border-2 border-green-200 bg-green-50 p-8 text-center"
            >
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
              <p className="text-gray-600 mb-4">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">Processing your BOM...</p>
            </motion.div>
          ) : (
            <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                  : isProcessing
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                  <p className="text-gray-600">Processing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Drag and drop your BOM file here
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Supports Excel (.xlsx, .xls) and CSV files
              </p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Choose File</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                className="hidden"
              />
              </label>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
