import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (objectPath: string) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * Simple file upload component with direct file input.
 * 
 * Features:
 * - Click to select files
 * - File type and size validation
 * - Direct upload to presigned URLs
 * - Progress feedback and status indicators
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (allowedFileTypes && !allowedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return file.type === type || file.name.endsWith(type);
    })) {
      toast({
        title: "File type not allowed",
        description: `Please upload a file matching: ${allowedFileTypes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);
      setHasCompleted(false);

      // Get presigned URL
      const params = await onGetUploadParameters();
      
      // Upload file
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(null);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open(params.method, params.url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setIsUploading(false);
      setHasCompleted(true);
      setProgress(100);

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully.",
      });

      // Reset form
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      // Notify parent component (objectPath is constructed from file path structure)
      onComplete?.(`uploads/${file.name}`);
    } catch (error) {
      setIsUploading(false);
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={buttonClassName}>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        accept={allowedFileTypes?.join(',')}
        style={{ display: 'none' }}
        data-testid="input-file-upload"
      />

      <div className="flex flex-col items-center gap-3 p-6 rounded-md border-2 border-dashed border-border">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Uploading... {progress}%
            </p>
          </>
        ) : hasCompleted ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm text-muted-foreground">
              Upload complete!
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            {children || (
              <div className="text-center">
                <p className="text-sm font-medium">
                  Click to upload file
                </p>
              </div>
            )}
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              size="sm"
              data-testid="button-select-file"
            >
              Select File
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
