// Referenced from blueprint:javascript_object_storage integration
import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { useUppyState, UppyContextProvider, useDropzone } from "@uppy/react";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  children: ReactNode;
}

interface DropzoneContentProps {
  uppy: Uppy;
  children: ReactNode;
  buttonClassName?: string;
}

function DropzoneContent({ uppy, children, buttonClassName }: DropzoneContentProps) {
  const { getRootProps, getInputProps } = useDropzone({ noClick: false });
  const [isDragActive, setIsDragActive] = useState(false);
  
  const files = useUppyState(uppy, (state) => state.files);
  const totalProgress = useUppyState(uppy, (state) => state.totalProgress);
  const isUploading = Object.keys(files).some((fileId) => files[fileId].progress?.uploadStarted);
  const hasCompleted = Object.keys(files).some((fileId) => files[fileId].progress?.uploadComplete);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer rounded-md border-2 border-dashed transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        buttonClassName
      )}
      onDragEnter={() => setIsDragActive(true)}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={() => setIsDragActive(false)}
      data-testid="dropzone-upload"
    >
      <input {...getInputProps()} data-testid="input-file-upload" />
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading... {totalProgress}%
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
                <div>
                  <p className="text-sm font-medium">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drop files here or click to browse
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * File upload component using Uppy with drag & drop interface.
 * 
 * Features:
 * - Accessible drag & drop using Uppy's useDropzone hook
 * - Click-to-upload fallback with keyboard support
 * - File type and size validation via Uppy
 * - Direct upload to presigned URLs using AwsS3 plugin
 * - Progress feedback and status indicators
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("upload-success", () => {
        toast({
          title: "Upload successful",
          description: "Your file has been uploaded successfully.",
        });
      })
      .on("complete", (result) => {
        onComplete?.(result);
      })
      .on("upload-error", (file, error) => {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload file. Please try again.",
          variant: "destructive",
        });
      })
      .on("restriction-failed", (file, error) => {
        toast({
          title: "File not allowed",
          description: error.message,
          variant: "destructive",
        });
      })
  );

  return (
    <UppyContextProvider uppy={uppy}>
      <DropzoneContent uppy={uppy} buttonClassName={buttonClassName}>
        {children}
      </DropzoneContent>
    </UppyContextProvider>
  );
}
