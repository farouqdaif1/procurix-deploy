import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSession } from '@/app/context/SessionContext';
import { useQueryParams } from '@/app/shared/hooks/useQueryParams';
import { createDesign, uploadBOM, getParts, type UploadResponse, type DesignPart } from '@/app/services/api';
import { Button } from '@/app/shared/components/ui/button';

interface UploadViewProps {
  onUploadComplete: (data: any) => void;
  onProceedToClassification: () => void;
}

function BOMTable({ parts }: { parts: DesignPart[] }) {
  // One row per distinct component — instance_index 0 is the representative row
  const rows = parts.filter(p => p.instance_index === 0);
  const totalQty = parts.reduce((sum, p) => sum + (p.instance_index === 0 ? p.quantity : 0), 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{rows.length} distinct parts</span>
        <span className="text-xs text-gray-500">{totalQty} total quantity</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Part Number</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Manufacturer</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Designator</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-2.5 font-mono text-sm font-medium text-gray-900">
                  {p.selected_mpn ?? p.mpn ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-sm">{p.manufacturer || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.designator || '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UploadView({ onUploadComplete, onProceedToClassification }: UploadViewProps) {
  const { setSessionId, setUploadData } = useSession();
  const { updateParams } = useQueryParams();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [parts, setParts] = useState<DesignPart[]>([]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    try {
      const design = await createDesign(file.name.replace(/\.[^.]+$/, ''));
      const designId = design.id;

      setSessionId(designId);
      updateParams(designId);

      const result = await uploadBOM(designId, file);
      setUploadData(result);
      setUploadResult(result);

      // Fetch the actual parts for the table (background task may still be running)
      // Poll briefly until parts appear
      let fetched: DesignPart[] = [];
      for (let i = 0; i < 8; i++) {
        fetched = await getParts(designId);
        if (fetched.length > 0) break;
        await new Promise(r => setTimeout(r, 400));
      }
      setParts(fetched);

      onUploadComplete({ fileName: file.name, sessionId: designId, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload BOM';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload BOM File</h1>
            <p className="text-gray-600">Upload your Bill of Materials file to begin analysis</p>
          </div>

          {uploadedFile && !isProcessing && uploadResult ? (
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="rounded-xl border-2 border-green-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Upload Successful</h2>
                    <p className="text-sm text-gray-500">{uploadedFile.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-bold text-gray-900">{uploadResult.part_count}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">distinct parts</p>
                  </div>
                </div>
              </div>

              {/* Parts table */}
              <div className="px-8 py-6">
                {parts.length > 0 ? (
                  <BOMTable parts={parts} />
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                    Loading parts…
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={onProceedToClassification}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <span>Proceed to Part Identification</span>
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
                isDragging ? 'border-blue-500 bg-blue-50'
                : isProcessing ? 'border-gray-300 bg-gray-50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                  <p className="text-gray-600">Processing file…</p>
                </div>
              ) : (
                <>
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drag and drop your BOM file here</h3>
                  <p className="text-gray-600 mb-6">Supports Excel (.xlsx, .xls) and CSV files</p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Choose File</span>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
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
