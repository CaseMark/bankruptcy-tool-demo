"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHAPTER_7_REQUIRED_DOCUMENTS,
  RequiredDocument,
} from "@/lib/bankruptcy/required-documents";

interface DocumentUploadWizardProps {
  caseId: string;
  onComplete: () => void;
  onSkip: () => void;
  /** Optional list of document types to show. If not provided, shows all documents. */
  documentTypes?: string[];
  /** Whether to show only required documents (default: false, shows all) */
  requiredOnly?: boolean;
}

interface UploadedFile {
  file: File;
  status: "uploading" | "processing" | "validating" | "success" | "error";
  error?: string;
  documentId?: string;
  progress?: number;
  statusMessage?: string;
}

export function DocumentUploadWizard({
  caseId,
  onComplete,
  onSkip,
  documentTypes,
  requiredOnly = false,
}: DocumentUploadWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [uploadedDocTypes, setUploadedDocTypes] = useState<Set<string>>(new Set());
  const eventSourcesRef = useRef<Map<number, EventSource>>(new Map());

  // Get document types for the wizard based on props
  const getFilteredDocs = () => {
    let docs = CHAPTER_7_REQUIRED_DOCUMENTS;

    // If specific document types are provided, filter to only those
    if (documentTypes && documentTypes.length > 0) {
      docs = docs.filter((d) => documentTypes.includes(d.type));
    }

    // If requiredOnly is true and no specific types provided, show only required
    if (requiredOnly && (!documentTypes || documentTypes.length === 0)) {
      docs = docs.filter((d) => d.required);
    }

    // Sort: required first, then optional
    const required = docs.filter((d) => d.required);
    const optional = docs.filter((d) => !d.required);
    return [...required, ...optional];
  };

  const allDocs = getFilteredDocs();

  const currentDoc = allDocs[currentStep];
  const isLastStep = currentStep === allDocs.length - 1;
  const totalSteps = allDocs.length;

  // Load connection string and API key from localStorage on mount
  useEffect(() => {
    const storedConnectionString = localStorage.getItem("bankruptcy_db_connection");
    const storedApiKey = localStorage.getItem("casedev_api_key");

    if (!storedConnectionString) {
      setConfigError("Database not initialized. Please go back to the dashboard.");
    } else if (!storedApiKey) {
      setConfigError("API key not found. Please log in again.");
    } else {
      setConnectionString(storedConnectionString);
      setApiKey(storedApiKey);
      setConfigError(null);
    }
  }, []);

  // Cleanup SSE connections on unmount
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((es) => es.close());
      eventSourcesRef.current.clear();
    };
  }, []);

  // Subscribe to SSE for document processing status
  const subscribeToDocumentStatus = useCallback(
    (documentId: string, fileIndex: number) => {
      if (!connectionString || !apiKey) return;

      const params = new URLSearchParams({
        connectionString,
        apiKey,
      });

      const url = `/api/documents/${documentId}/status?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSourcesRef.current.set(fileIndex, eventSource);

      eventSource.addEventListener("status", (event) => {
        try {
          const data = JSON.parse(event.data);

          setFiles((prev) =>
            prev.map((f, idx) => {
              if (idx !== fileIndex) return f;

              let status: UploadedFile["status"] = "processing";
              if (data.status === "completed") {
                status = "success";
              } else if (data.status === "error") {
                status = "error";
              } else if (data.status === "validating") {
                status = "validating";
              }

              return {
                ...f,
                status,
                progress: data.progress || f.progress,
                statusMessage: data.message,
                error: data.status === "error" ? data.message : undefined,
              };
            })
          );

          // If completed, mark document type as uploaded and close connection
          if (data.status === "completed") {
            setUploadedDocTypes((prev) => new Set([...prev, currentDoc.type]));
            eventSource.close();
            eventSourcesRef.current.delete(fileIndex);
          }
        } catch (e) {
          console.error("Failed to parse SSE event:", e);
        }
      });

      eventSource.addEventListener("error", (event) => {
        // Check if it's a data error or connection error
        if (event instanceof MessageEvent) {
          try {
            const data = JSON.parse(event.data);
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === fileIndex
                  ? { ...f, status: "error", error: data.message }
                  : f
              )
            );
          } catch (e) {
            // Ignore parse errors
          }
        }
        eventSource.close();
        eventSourcesRef.current.delete(fileIndex);
      });

      eventSource.onerror = () => {
        // Connection lost - mark as potentially still processing
        eventSource.close();
        eventSourcesRef.current.delete(fileIndex);
      };
    },
    [connectionString, apiKey, currentDoc]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [currentDoc, connectionString, apiKey]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (selectedFiles: File[]) => {
    if (!connectionString || !apiKey || !currentDoc) {
      setConfigError("Missing configuration. Please refresh the page.");
      return;
    }

    const startIndex = files.length;
    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      file,
      status: "uploading" as const,
      progress: 0,
      statusMessage: "Uploading...",
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileIndex = startIndex + i;

      try {
        // Create FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId);
        formData.append("documentType", currentDoc.type);

        // Upload file
        const response = await fetch(
          `/api/documents/upload?connectionString=${encodeURIComponent(connectionString)}`,
          {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();

        // Update status to processing and store document ID
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: "processing" as const,
                  documentId: data.documentId,
                  progress: 10,
                  statusMessage: "Processing document...",
                }
              : f
          )
        );

        // Subscribe to SSE for real-time processing updates
        subscribeToDocumentStatus(data.documentId, fileIndex);
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message || "Upload failed. Please try again.",
                }
              : f
          )
        );
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleContinue = () => {
    // Clear files for next step
    setFiles([]);

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkipDocument = () => {
    setFiles([]);
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setFiles([]);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const successfulUploads = files.filter((f) => f.status === "success").length;
  const hasUploadsInProgress = files.some(
    (f) => f.status === "uploading" || f.status === "processing" || f.status === "validating"
  );

  // Show error if configuration is missing
  if (configError) {
    return (
      <div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">{configError}</p>
        </div>
      </div>
    );
  }

  if (!currentDoc) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip and go to dashboard
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Document Type Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">{currentDoc.name}</h2>
              {currentDoc.required ? (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Required
                </span>
              ) : (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  Optional
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{currentDoc.description}</p>
          </div>
          {uploadedDocTypes.has(currentDoc.type) && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Uploaded</span>
            </div>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-lg font-medium mb-1">
          Drop {currentDoc.name.toLowerCase()} here
        </p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="wizard-file-upload"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <Button
          type="button"
          onClick={() => document.getElementById("wizard-file-upload")?.click()}
        >
          Select Files
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
        </p>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Uploaded Files</h3>
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="p-4 bg-muted/50 rounded-lg space-y-2"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedFile.status === "uploading" && (
                    <div className="flex items-center gap-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Uploading...</span>
                    </div>
                  )}
                  {uploadedFile.status === "processing" && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{uploadedFile.statusMessage || "Processing..."}</span>
                    </div>
                  )}
                  {uploadedFile.status === "validating" && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{uploadedFile.statusMessage || "Validating..."}</span>
                    </div>
                  )}
                  {uploadedFile.status === "success" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Complete</span>
                    </div>
                  )}
                  {uploadedFile.status === "error" && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">{uploadedFile.error}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-muted rounded"
                    disabled={uploadedFile.status === "uploading"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Progress bar for processing files */}
              {(uploadedFile.status === "processing" || uploadedFile.status === "validating") && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${uploadedFile.progress || 0}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notice */}
      <div className="flex items-start gap-3 p-4 bg-accent/50 border border-primary/10 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          You can always upload more documents later through your case dashboard.
          Skip any documents you don't have ready right now.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleSkipDocument}
            disabled={hasUploadsInProgress}
          >
            Skip this document
          </Button>
          <Button
            onClick={handleContinue}
            disabled={hasUploadsInProgress}
            className="gap-2"
          >
            {successfulUploads > 0 ? (
              <>
                {isLastStep ? "Finish" : "Done and Continue"}
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                {isLastStep ? "Finish Setup" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
