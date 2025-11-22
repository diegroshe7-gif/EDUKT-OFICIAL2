import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{ uploadURL: string; objectPath: string }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * Simple file upload component with direct file input.
 */
export function ObjectUploader({
  maxFileSize = 10485760,
  allowedFileTypes = [],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setHasCompleted(false);

      // Validate file type if specified
      if (allowedFileTypes.length > 0) {
        const isAllowed = allowedFileTypes.some(type => {
          if (type === 'image/*') {
            return file.type.startsWith('image/');
          }
          if (type === 'application/pdf') {
            return file.type === 'application/pdf';
          }
          return file.type === type;
        });
        
        if (!isAllowed) {
          toast({
            title: "Invalid file type",
            description: `Please upload: ${allowedFileTypes.join(', ')}`,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      // Validate file size
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `Max size: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Get upload URL from server
      const { uploadURL, objectPath } = await onGetUploadParameters();

      // Upload to presigned URL
      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      setHasCompleted(true);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      // Notify parent with the object path
      onComplete?.({
        successful: [{ path: objectPath }],
      });

      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const acceptStr = allowedFileTypes.length > 0 ? allowedFileTypes.join(',') : undefined;

  return (
    <div className={buttonClassName}>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        accept={acceptStr}
        style={{ display: 'none' }}
        data-testid="input-file-upload"
      />

      <div className="flex flex-col items-center gap-3 p-6 rounded-md border-2 border-dashed border-border">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : hasCompleted ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm text-muted-foreground">Upload complete!</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            {children || (
              <p className="text-sm font-medium text-center">Click to upload file</p>
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
