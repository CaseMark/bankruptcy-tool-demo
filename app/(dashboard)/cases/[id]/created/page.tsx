'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Upload,
  ArrowRight,
  FileText,
  Loader2,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentUploadWizard } from '@/components/cases/document-upload-wizard';
import {
  getRequiredDocuments,
} from '@/lib/bankruptcy/required-documents';

interface CaseData {
  id: string;
  clientName: string;
  caseType: string;
  filingType: string;
}

type PageState = 'prompt' | 'wizard' | 'complete';

export default function CaseCreatedPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>('prompt');

  useEffect(() => {
    const connectionString = localStorage.getItem('bankruptcy_db_connection');
    if (!connectionString) {
      router.push('/login');
      return;
    }

    fetchCaseData(connectionString);
  }, [id, router]);

  const fetchCaseData = async (connectionString: string) => {
    try {
      const response = await fetch(
        `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString)}`
      );

      if (!response.ok) {
        router.push('/cases');
        return;
      }

      const data = await response.json();
      setCaseData(data.case);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching case:', err);
      router.push('/cases');
    }
  };

  const requiredDocs = getRequiredDocuments();

  const handleStartUpload = () => {
    setPageState('wizard');
  };

  const handleSkipToDashboard = () => {
    router.push(`/cases/${id}`);
  };

  const handleWizardComplete = () => {
    setPageState('complete');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Wizard Complete State
  if (pageState === 'complete') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-3xl">
          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl tracking-tight mb-3">Documents Submitted</h1>
            <p className="text-muted-foreground text-lg">
              Your documents have been uploaded and are being processed.
            </p>
          </div>

          {/* What's Next Card */}
          <div className="bg-card border rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
            <ul className="space-y-3 text-muted-foreground mb-6">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Your documents will be automatically processed and validated</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Financial data will be extracted for your bankruptcy forms</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>You can upload additional documents anytime from your dashboard</span>
              </li>
            </ul>

            <Button
              onClick={() => router.push(`/cases/${id}`)}
              size="lg"
              className="w-full gap-2"
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Case Dashboard
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need to upload more documents?{' '}
              <Link href={`/cases/${id}/documents`} className="text-primary hover:underline">
                Visit the documents page
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Document Upload Wizard State
  if (pageState === 'wizard') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl tracking-tight mb-2">Upload Documents</h1>
            <p className="text-muted-foreground">
              Upload supporting documents for{' '}
              <span className="font-medium text-foreground">{caseData?.clientName}</span>'s{' '}
              {caseData?.caseType === 'chapter7' ? 'Chapter 7' : 'Chapter 13'} case
            </p>
          </div>

          {/* Wizard Component */}
          <DocumentUploadWizard
            caseId={id}
            onComplete={handleWizardComplete}
            onSkip={handleSkipToDashboard}
          />
        </div>
      </div>
    );
  }

  // Initial Prompt State
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl tracking-tight mb-3">Case Created Successfully</h1>
          <p className="text-muted-foreground text-lg">
            {caseData?.caseType === 'chapter7' ? 'Chapter 7' : 'Chapter 13'} bankruptcy case for{' '}
            <span className="font-medium text-foreground">{caseData?.clientName}</span>
          </p>
        </div>

        {/* Upload Documents Prompt */}
        <div className="bg-card border rounded-lg p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-accent rounded-lg">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Would you like to upload documents now?</h2>
              <p className="text-muted-foreground">
                To proceed with the bankruptcy filing, we'll need supporting documents.
                You can upload them now through a guided process, or do it later from the case dashboard.
              </p>
            </div>
          </div>

          {/* Required Documents Preview */}
          <div className="bg-muted/50 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Required Documents for Chapter 7
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {requiredDocs.map((doc) => (
                <div key={doc.type} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>{doc.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleStartUpload}
              className="w-full gap-2"
              size="lg"
            >
              <Upload className="w-5 h-5" />
              Yes, Upload Documents Now
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipToDashboard}
              className="w-full gap-2"
              size="lg"
            >
              <LayoutDashboard className="w-5 h-5" />
              Skip for Now, Go to Dashboard
            </Button>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-accent/50 border border-primary/10 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground text-center">
            You can always upload documents later through your case dashboard.
            No documents will be lost if you skip this step.
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{' '}
            <Link href="/cases" className="text-primary hover:underline">
              Return to all cases
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
