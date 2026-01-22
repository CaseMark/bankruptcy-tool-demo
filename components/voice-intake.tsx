'use client';

import { useVapi } from '@/app/hooks/useVapi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Phone, PhoneOff, Volume2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface ClientIntakeData {
  clientName?: string;
  email?: string;
  phone?: string;
  ssnLast4?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  householdSize?: number;
  caseType?: 'chapter7' | 'chapter13';
  filingType?: 'individual' | 'joint';
}

interface VoiceIntakeProps {
  onDataExtracted?: (data: ClientIntakeData) => void;
  onCallEnd?: (transcripts: Array<{ role: string; text: string }>) => void;
  onCaseCreated?: (caseId: string) => void;
  onCaseVerified?: (caseId: string, caseDetails: Record<string, unknown>) => void;
  existingCaseId?: string;
  className?: string;
}

export function VoiceIntake({
  onDataExtracted,
  onCallEnd,
  onCaseCreated,
  onCaseVerified,
  existingCaseId,
  className,
}: VoiceIntakeProps) {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '';
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '';

  // Get database connection from localStorage for Vapi to use in function calls
  const getConnectionString = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bankruptcy_db_connection');
  };

  const {
    startCall,
    endCall,
    isSessionActive,
    isLoading,
    isSpeaking,
    error,
    transcripts,
    volumeLevel,
    extractedData,
    clearError,
  } = useVapi({
    publicKey,
    assistantId,
  });

  // Notify parent when data is extracted via function calls
  useEffect(() => {
    if (!extractedData || Object.keys(extractedData).length === 0) return;

    // Handle case creation response
    if (extractedData.create_new_case && onCaseCreated) {
      const result = extractedData.create_new_case as { success: boolean; caseId?: string };
      if (result.success && result.caseId) {
        onCaseCreated(result.caseId);
      }
    }

    // Handle client verification response
    if (extractedData.verify_client && onCaseVerified) {
      const result = extractedData.verify_client as {
        verified: boolean;
        caseId?: string;
        caseDetails?: Record<string, unknown>;
      };
      if (result.verified && result.caseId && result.caseDetails) {
        onCaseVerified(result.caseId, result.caseDetails);
      }
    }

    // Handle general data extraction for form population
    if (onDataExtracted) {
      const intakeData: ClientIntakeData = {};

      if (extractedData.collect_client_info) {
        const info = extractedData.collect_client_info as Record<string, unknown>;
        intakeData.clientName = info.name as string;
        intakeData.email = info.email as string;
        intakeData.phone = info.phone as string;
        intakeData.ssnLast4 = info.ssn_last_4 as string;
      }

      if (extractedData.collect_address) {
        const addr = extractedData.collect_address as Record<string, unknown>;
        intakeData.address = addr.street as string;
        intakeData.city = addr.city as string;
        intakeData.state = addr.state as string;
        intakeData.zip = addr.zip as string;
        intakeData.county = addr.county as string;
      }

      if (extractedData.collect_case_details) {
        const details = extractedData.collect_case_details as Record<string, unknown>;
        intakeData.householdSize = details.household_size as number;
        intakeData.caseType = details.case_type as 'chapter7' | 'chapter13';
        intakeData.filingType = details.filing_type as 'individual' | 'joint';
      }

      if (Object.keys(intakeData).length > 0) {
        onDataExtracted(intakeData);
      }
    }
  }, [extractedData, onDataExtracted, onCaseCreated, onCaseVerified]);

  // Notify parent when call ends with transcripts
  useEffect(() => {
    if (!isSessionActive && transcripts.length > 0 && onCallEnd) {
      onCallEnd(transcripts.map(t => ({ role: t.role, text: t.text })));
    }
  }, [isSessionActive, transcripts, onCallEnd]);

  const handleStartCall = useCallback(() => {
    const connectionString = getConnectionString();

    // Pass metadata to Vapi for function calls
    const assistantOverrides: Record<string, unknown> = {
      metadata: {
        connectionString,
        existingCaseId,
      },
    };

    // If there's an existing case, add context to the first message
    if (existingCaseId) {
      assistantOverrides.firstMessage = `Hello! I see you're calling about case ${existingCaseId}. How can I help you update your information today?`;
    }

    startCall(assistantOverrides);
  }, [startCall, existingCaseId]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  if (!publicKey || !assistantId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voice intake is not configured. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID in your environment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Intake
        </CardTitle>
        <CardDescription>
          Speak with our AI assistant to provide client information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isSessionActive ? (
            <Button
              onClick={handleStartCall}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5" />
                  Start Voice Intake
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleEndCall}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          )}
        </div>

        {/* Active Call Indicator */}
        {isSessionActive && (
          <div className="space-y-3">
            {/* Speaking Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {isSpeaking ? (
                <>
                  <Volume2 className="h-4 w-4 text-green-500 animate-pulse" />
                  <span className="text-green-600">Assistant is speaking...</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Listening...</span>
                </>
              )}
            </div>

            {/* Volume Level */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
              />
            </div>

            {/* Live Transcript */}
            {transcripts.length > 0 && (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Live Transcript</p>
                <div className="space-y-2">
                  {transcripts.slice(-5).map((t, i) => (
                    <div
                      key={i}
                      className={`text-sm ${
                        t.role === 'assistant' ? 'text-blue-600' : 'text-foreground'
                      }`}
                    >
                      <span className="font-medium">
                        {t.role === 'assistant' ? 'Assistant: ' : 'You: '}
                      </span>
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {!isSessionActive && transcripts.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Voice intake completed. {transcripts.length} messages recorded.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        {!isSessionActive && transcripts.length === 0 && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>The voice assistant will help collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Client name and contact information</li>
              <li>Address and county</li>
              <li>Household size</li>
              <li>Filing type preference</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
