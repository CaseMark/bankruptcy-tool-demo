"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/cases/document-upload";
import { DeleteConfirmationModal } from "@/components/cases/financial/delete-confirmation-modal";

interface CaseData {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
}

interface Document {
  id: string;
  fileName: string;
  documentType: string | null;
  validationStatus: string;
  uploadedAt: string;
  fileUrl: string | null;
  vaultObjectId?: string | null;
}

export default function CaseDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const connectionString = typeof window !== 'undefined' ? localStorage.getItem("bankruptcy_db_connection") : null;
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem("casedev_api_key") : null;

  useEffect(() => {
    params.then((p) => setCaseId(p.id));
  }, [params]);

  const fetchDocuments = useCallback(async () => {
    if (!caseId || !connectionString) return;

    try {
      const docsResponse = await fetch(
        `/api/cases/${caseId}/documents?connectionString=${encodeURIComponent(connectionString)}`
      );

      if (docsResponse.ok) {
        const docsResult = await docsResponse.json();
        setDocuments(docsResult.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  }, [caseId, connectionString]);

  useEffect(() => {
    if (!caseId) return;

    if (!apiKey) {
      router.push("/login");
      return;
    }

    if (!connectionString) {
      setError("Database not provisioned. Please go to settings to set up your database.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch case data
        const caseResponse = await fetch(
          `/api/cases/${caseId}?connectionString=${encodeURIComponent(connectionString)}`
        );

        if (!caseResponse.ok) {
          if (caseResponse.status === 404) {
            router.push("/cases");
            return;
          }
          throw new Error("Failed to fetch case");
        }

        const caseResult = await caseResponse.json();
        setCaseData(caseResult);

        // Fetch documents
        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId, router, connectionString, apiKey, fetchDocuments]);

  const handleDownload = async (doc: Document) => {
    if (!connectionString) return;

    setDownloadingId(doc.id);
    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/${doc.id}?connectionString=${encodeURIComponent(connectionString)}&action=download`,
        {
          headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();

      if (data.downloadUrl) {
        // Open download URL in new tab or trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || doc.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('No download URL available for this document');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc: Document) => {
    setViewingDocument(doc);
    setDocumentText(null);
    setLoadingText(true);

    if (!connectionString) {
      setLoadingText(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/${doc.id}?connectionString=${encodeURIComponent(connectionString)}&action=text`,
        {
          headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocumentText(data.text);
      }
    } catch (err) {
      console.error('Error fetching document text:', err);
    } finally {
      setLoadingText(false);
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete || !connectionString) return;

    const response = await fetch(
      `/api/cases/${caseId}/documents/${documentToDelete.id}?connectionString=${encodeURIComponent(connectionString)}&deleteFromVault=true`,
      {
        method: 'DELETE',
        headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    // Refresh documents list
    await fetchDocuments();
    setDocumentToDelete(null);
  };

  const handleDocumentUploaded = () => {
    fetchDocuments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <Link
            href="/cases"
            className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const documentStats = {
    total: documents.length,
    valid: documents.filter((d) => d.validationStatus === "valid").length,
    pending: documents.filter((d) => d.validationStatus === "pending").length,
    invalid: documents.filter((d) => d.validationStatus === "invalid").length,
  };

  // Required documents checklist
  const requiredDocuments = [
    { type: "tax_return", label: "Tax Returns (Last 2 Years)", required: true },
    { type: "paystub", label: "Pay Stubs (Last 6 Months)", required: true },
    { type: "bank_statement", label: "Bank Statements (Last 6 Months)", required: true },
    { type: "mortgage", label: "Mortgage Statement or Lease", required: true },
    { type: "vehicle_title", label: "Vehicle Titles & Loan Statements", required: false },
    { type: "credit_card", label: "Credit Card Statements", required: true },
    { type: "medical_bill", label: "Medical Bills", required: false },
    { type: "utility", label: "Utility Bills", required: false },
    { type: "insurance", label: "Insurance Policies", required: false },
    { type: "retirement", label: "Retirement Account Statements", required: false },
  ];

  const getDocumentsByType = (type: string) =>
    documents.filter((d) => d.documentType === type);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Document?"
        description={`Are you sure you want to delete "${documentToDelete?.fileName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{viewingDocument.fileName}</h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {viewingDocument.documentType?.replace(/_/g, " ") || "Document"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewingDocument)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingText ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : documentText ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                    {documentText}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No text content available for this document.</p>
                  <p className="text-sm mt-2">
                    The document may still be processing or OCR text is not available.
                  </p>
                  <button
                    onClick={() => handleDownload(viewingDocument)}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Download Original File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/cases" className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/cases/${caseId}`} className="hover:text-foreground">
            {caseData.clientName}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>Documents</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push(`/cases/${caseId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground mt-1">
                Manage and validate case documents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{documentStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{documentStats.valid}</div>
              <div className="text-sm text-muted-foreground">Validated</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{documentStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{documentStats.invalid}</div>
              <div className="text-sm text-muted-foreground">Issues Found</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-6">
              <Upload className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Upload Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to upload client documents
                </p>
              </div>
            </div>
            <DocumentUpload caseId={caseId!} onUploadComplete={handleDocumentUploaded} />
          </div>

          {/* All Documents List */}
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">All Documents</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Search className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload documents using the form above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-background rounded-lg">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.fileName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">
                            {doc.documentType?.replace(/_/g, " ") || "Unknown"}
                          </span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.validationStatus === "valid"
                            ? "bg-green-100 text-green-700"
                            : doc.validationStatus === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {doc.validationStatus}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(doc)}
                          className="p-2 hover:bg-background rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="p-2 hover:bg-background rounded-lg transition-colors disabled:opacity-50"
                          title="Download"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(doc)}
                          className="p-2 hover:bg-background rounded-lg transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Required Documents Checklist */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Required Documents</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Checklist of documents needed for bankruptcy filing
            </p>
            <div className="space-y-3">
              {requiredDocuments.map((reqDoc) => {
                const uploadedDocs = getDocumentsByType(reqDoc.type);
                const hasValid = uploadedDocs.some(
                  (d) => d.validationStatus === "valid"
                );
                const hasPending = uploadedDocs.some(
                  (d) => d.validationStatus === "pending"
                );
                const hasAny = uploadedDocs.length > 0;

                return (
                  <div
                    key={reqDoc.type}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        hasValid
                          ? "bg-green-500 text-white"
                          : hasPending
                          ? "bg-yellow-500 text-white"
                          : hasAny
                          ? "bg-red-500 text-white"
                          : "bg-muted-foreground/20"
                      }`}
                    >
                      {hasValid ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : hasPending ? (
                        <Clock className="w-3 h-3" />
                      ) : hasAny ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{reqDoc.label}</p>
                      {hasAny && (
                        <p className="text-xs text-muted-foreground">
                          {uploadedDocs.length} uploaded
                        </p>
                      )}
                    </div>
                    {reqDoc.required && !hasValid && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* OCR Processing Info */}
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-3">Automatic Processing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Documents are automatically processed using OCR and AI to extract:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Income information from pay stubs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Debt details from statements</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Asset values from documents</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Expense data from bills</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
