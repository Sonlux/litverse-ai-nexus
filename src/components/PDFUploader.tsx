
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PDFUploaderProps {
  libraryId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  id: string;
}

const PDFUploader = ({ libraryId, onUploadComplete }: PDFUploaderProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      uploadFiles(files);
    } else {
      toast.error('Please upload only PDF files');
    }
  }, [libraryId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (const uploadingFile of newUploadingFiles) {
      try {
        const fileExt = uploadingFile.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${uploadingFile.file.name}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, uploadingFile.file, {
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100;
              setUploadingFiles(prev =>
                prev.map(f =>
                  f.id === uploadingFile.id
                    ? { ...f, progress: percentage }
                    : f
                )
              );
            }
          });

        if (uploadError) throw uploadError;

        // Save PDF metadata to database
        const { error: dbError } = await supabase
          .from('pdfs')
          .insert({
            library_id: libraryId,
            user_id: user.id,
            title: uploadingFile.file.name.replace('.pdf', ''),
            file_name: uploadingFile.file.name,
            file_path: uploadData.path,
            file_size: uploadingFile.file.size,
            page_count: null // TODO: Extract page count
          });

        if (dbError) throw dbError;

        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: 'completed' as const, progress: 100 }
              : f
          )
        );

        toast.success(`${uploadingFile.file.name} uploaded successfully`);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: 'error' as const }
              : f
          )
        );
        toast.error(`Failed to upload ${uploadingFile.file.name}`);
      }
    }

    // Clean up completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
      onUploadComplete();
    }, 2000);
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-red-500 bg-red-500/10'
            : 'border-gray-600 bg-gray-900/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Upload PDF Files
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop your PDF files here, or click to browse
          </p>
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload">
            <Button className="bg-red-600 hover:bg-red-700" asChild>
              <span>Choose Files</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadingFile) => (
            <Card key={uploadingFile.id} className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {uploadingFile.status === 'completed' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : uploadingFile.status === 'error' ? (
                      <X className="w-5 h-5 text-red-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {uploadingFile.status === 'uploading' && (
                      <Progress 
                        value={uploadingFile.progress} 
                        className="mt-2 h-2"
                      />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
