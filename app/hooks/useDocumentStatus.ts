"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface DocumentStatus {
  status: "idle" | "processing" | "validating" | "completed" | "error";
  message: string;
  progress: number;
  validationStatus?: string;
  validationNotes?: string;
  ocrTextLength?: number;
  error?: string;
}

interface UseDocumentStatusOptions {
  documentId: string;
  connectionString: string | null;
  apiKey: string | null;
  enabled?: boolean;
  onComplete?: (status: DocumentStatus) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for subscribing to real-time document processing status via SSE
 *
 * Usage:
 * ```tsx
 * const { status, isConnected, retry } = useDocumentStatus({
 *   documentId: "abc-123",
 *   connectionString: localStorage.getItem("bankruptcy_db_connection"),
 *   apiKey: localStorage.getItem("casedev_api_key"),
 *   onComplete: (status) => console.log("Done!", status),
 * });
 * ```
 */
export function useDocumentStatus({
  documentId,
  connectionString,
  apiKey,
  enabled = true,
  onComplete,
  onError,
}: UseDocumentStatusOptions) {
  const [status, setStatus] = useState<DocumentStatus>({
    status: "idle",
    message: "Waiting to start...",
    progress: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const completedRef = useRef(false);

  const connect = useCallback(() => {
    if (!documentId || !connectionString || !enabled || completedRef.current) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams({
      connectionString,
      ...(apiKey && { apiKey }),
    });

    const url = `/api/documents/${documentId}/status?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setStatus((prev) => ({
        ...prev,
        status: "processing",
        message: "Connected, processing document...",
      }));
    };

    eventSource.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data);
        const newStatus: DocumentStatus = {
          status: data.status,
          message: data.message,
          progress: data.progress || 0,
          validationStatus: data.validationStatus,
          validationNotes: data.validationNotes,
          ocrTextLength: data.ocrTextLength,
        };

        setStatus(newStatus);

        // If completed, close connection and trigger callback
        if (data.status === "completed") {
          completedRef.current = true;
          eventSource.close();
          setIsConnected(false);
          onComplete?.(newStatus);
        }
      } catch (e) {
        console.error("Failed to parse SSE status event:", e);
      }
    });

    eventSource.addEventListener("error", (event) => {
      try {
        // Try to parse error data if available
        const data = event instanceof MessageEvent ? JSON.parse(event.data) : null;
        const errorMessage = data?.message || "Processing failed";

        setStatus((prev) => ({
          ...prev,
          status: "error",
          message: errorMessage,
          error: errorMessage,
        }));

        onError?.(errorMessage);
      } catch (e) {
        // Generic connection error
        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnected(false);
        }
      }
    });

    eventSource.onerror = () => {
      // Connection error - may be temporary
      if (!completedRef.current) {
        setIsConnected(false);
      }
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [documentId, connectionString, apiKey, enabled, onComplete, onError]);

  // Connect when enabled
  useEffect(() => {
    if (enabled && documentId && connectionString) {
      const cleanup = connect();
      return cleanup;
    }
  }, [enabled, documentId, connectionString, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const retry = useCallback(() => {
    completedRef.current = false;
    setStatus({
      status: "idle",
      message: "Retrying...",
      progress: 0,
    });
    connect();
  }, [connect]);

  return {
    status,
    isConnected,
    isProcessing: status.status === "processing" || status.status === "validating",
    isComplete: status.status === "completed",
    isError: status.status === "error",
    retry,
  };
}

/**
 * Hook for tracking multiple documents' processing status
 */
export function useMultipleDocumentStatus({
  documentIds,
  connectionString,
  apiKey,
  enabled = true,
}: {
  documentIds: string[];
  connectionString: string | null;
  apiKey: string | null;
  enabled?: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<string, DocumentStatus>>({});

  useEffect(() => {
    if (!enabled || !connectionString || documentIds.length === 0) {
      return;
    }

    const eventSources: EventSource[] = [];

    documentIds.forEach((documentId) => {
      const params = new URLSearchParams({
        connectionString,
        ...(apiKey && { apiKey }),
      });

      const url = `/api/documents/${documentId}/status?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSources.push(eventSource);

      eventSource.addEventListener("status", (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatuses((prev) => ({
            ...prev,
            [documentId]: {
              status: data.status,
              message: data.message,
              progress: data.progress || 0,
              validationStatus: data.validationStatus,
              validationNotes: data.validationNotes,
              ocrTextLength: data.ocrTextLength,
            },
          }));

          if (data.status === "completed" || data.status === "error") {
            eventSource.close();
          }
        } catch (e) {
          console.error("Failed to parse SSE event:", e);
        }
      });

      eventSource.onerror = () => {
        setStatuses((prev) => ({
          ...prev,
          [documentId]: {
            ...prev[documentId],
            status: "error",
            message: "Connection lost",
            progress: prev[documentId]?.progress || 0,
          },
        }));
      };
    });

    return () => {
      eventSources.forEach((es) => es.close());
    };
  }, [documentIds.join(","), connectionString, apiKey, enabled]);

  const allComplete = documentIds.every(
    (id) => statuses[id]?.status === "completed" || statuses[id]?.status === "error"
  );

  const totalProgress =
    documentIds.length > 0
      ? documentIds.reduce((sum, id) => sum + (statuses[id]?.progress || 0), 0) /
        documentIds.length
      : 0;

  return {
    statuses,
    allComplete,
    totalProgress,
  };
}
