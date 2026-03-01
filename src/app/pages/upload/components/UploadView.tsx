import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Package, ArrowRight, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { createSession, uploadBOM, type UploadBOMResponse } from '@/app/services/api';
import { Button } from '@/app/shared/components/ui/button';

interface UploadViewProps {
  onUploadComplete: (data: any) => void;
  onProceedToClassification: () => void;
}

export function UploadView({ onUploadComplete, onProceedToClassification }: UploadViewProps) {
  const { setSessionId, setUploadData } = useSession();
  const { updateParams } = useQueryParams();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadData, setUploadDataLocal] = useState<UploadBOMResponse | null>(null);

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

      // 2. Set session ID in context and update URL immediately
      setSessionId(sessionId);
      updateParams(sessionId); // Update URL with new session ID

      // 3. Upload the BOM file
      const uploadResult = await uploadBOM(sessionId, file);

      // 4. Store upload data in context and local state
      setUploadData(uploadResult);
      setUploadDataLocal(uploadResult);

      // 5. On success, call onUploadComplete (but don't navigate yet)
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

          {uploadedFile && !isProcessing && uploadData ? (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-xl border-2 border-green-200 bg-white p-8 shadow-sm"
            >
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
                <p className="text-gray-600 mb-2">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">BOM file processed successfully</p>
              </div>

              {/* BOM Data Summary */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  BOM Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <Package className="h-5 w-5" />
                      <span className="text-sm font-medium">Total Parts</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{uploadData.parts_count}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <Package className="h-5 w-5" />
                      <span className="text-sm font-medium">Total Quantity</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{uploadData.total_quantity}</p>
                  </div>
                </div>

                {/* Parts Preview */}
                {uploadData.parts_preview && uploadData.parts_preview.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Parts Preview</h4>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-700 font-semibold">Part Number</th>
                            <th className="px-4 py-2 text-left text-gray-700 font-semibold">Manufacturer</th>
                            <th className="px-4 py-2 text-right text-gray-700 font-semibold">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {uploadData.parts_preview.map((part, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{part.part_number}</td>
                              <td className="px-4 py-2 text-gray-600">{part.manufacturer || 'N/A'}</td>
                              <td className="px-4 py-2 text-right text-gray-900 font-medium">{part.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {uploadData.parts_count > uploadData.parts_preview.length && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Showing {uploadData.parts_preview.length} of {uploadData.parts_count} parts
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <div className="flex justify-center">
                <Button
                  onClick={onProceedToClassification}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <span>Proceed to Classification</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
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
