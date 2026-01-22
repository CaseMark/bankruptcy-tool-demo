"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  MapPin,
  FileText,
  X,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useVapi } from "@/app/hooks/useVapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExtractedClientData {
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
  caseType?: "chapter7" | "chapter13";
  filingType?: "individual" | "joint";
}

export default function VoiceIntakePage() {
  const router = useRouter();
  const [extractedData, setExtractedData] = useState<ExtractedClientData>({});
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [callCompleted, setCallCompleted] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const copyPhoneNumber = () => {
    if (phoneNumber) {
      navigator.clipboard.writeText(phoneNumber);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    }
  };

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";
  const phoneNumber = process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER || "";

  const {
    startCall,
    endCall,
    isSessionActive,
    isLoading,
    isSpeaking,
    error,
    transcripts,
    volumeLevel,
    clearError,
    extractedData: vapiExtractedData,
  } = useVapi({
    publicKey,
    assistantId,
  });

  // Check auth
  useEffect(() => {
    const apiKey = localStorage.getItem("casedev_api_key");
    if (!apiKey) {
      router.push("/login");
    }
  }, [router]);

  // Process extracted data from Vapi function calls
  useEffect(() => {
    if (!vapiExtractedData || Object.keys(vapiExtractedData).length === 0) return;

    const newData: ExtractedClientData = { ...extractedData };

    // Handle case creation response
    if (vapiExtractedData.create_new_case) {
      const result = vapiExtractedData.create_new_case as {
        success: boolean;
        caseId?: string;
      };
      if (result.success && result.caseId) {
        setCreatedCaseId(result.caseId);
      }
    }

    // Handle collected client info
    if (vapiExtractedData.collect_client_info) {
      const info = vapiExtractedData.collect_client_info as Record<string, unknown>;
      if (info.name) newData.clientName = info.name as string;
      if (info.email) newData.email = info.email as string;
      if (info.phone) newData.phone = info.phone as string;
      if (info.ssn_last_4) newData.ssnLast4 = info.ssn_last_4 as string;
    }

    // Handle collected address
    if (vapiExtractedData.collect_address) {
      const addr = vapiExtractedData.collect_address as Record<string, unknown>;
      if (addr.street) newData.address = addr.street as string;
      if (addr.city) newData.city = addr.city as string;
      if (addr.state) newData.state = addr.state as string;
      if (addr.zip) newData.zip = addr.zip as string;
      if (addr.county) newData.county = addr.county as string;
    }

    // Handle case details
    if (vapiExtractedData.collect_case_details) {
      const details = vapiExtractedData.collect_case_details as Record<string, unknown>;
      if (details.household_size) newData.householdSize = details.household_size as number;
      if (details.case_type) newData.caseType = details.case_type as "chapter7" | "chapter13";
      if (details.filing_type) newData.filingType = details.filing_type as "individual" | "joint";
    }

    setExtractedData(newData);
  }, [vapiExtractedData]);

  // Track when call ends
  useEffect(() => {
    if (!isSessionActive && transcripts.length > 0) {
      setCallCompleted(true);
    }
  }, [isSessionActive, transcripts.length]);

  const handleStartCall = useCallback(() => {
    const connectionString = localStorage.getItem("bankruptcy_db_connection");
    setCallCompleted(false);
    startCall({
      metadata: {
        connectionString,
        source: "voice-intake-page",
      },
      firstMessage:
        "Hello! I'm your bankruptcy intake assistant. I'll help collect the information needed to start your case. Let's begin with your full legal name. What is your name?",
    });
  }, [startCall]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  const hasExtractedData = Object.keys(extractedData).length > 0;

  // Check if Vapi is configured
  if (!publicKey || !assistantId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/cases" className="hover:text-foreground transition-colors">
                Cases
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span>Voice Intake</span>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voice intake is not configured. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY
              and NEXT_PUBLIC_VAPI_ASSISTANT_ID environment variables.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/cases" className="hover:text-foreground transition-colors">
              Cases
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>Voice Intake</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Voice-Powered Client Intake</h1>
          <p className="text-muted-foreground mt-1">
            Speak with our AI assistant to collect client information
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phone Number Option */}
        {phoneNumber && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-full text-primary-foreground">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    Prefer to call instead?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Call our AI assistant directly from your phone
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${phoneNumber}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    {formatPhoneNumber(phoneNumber)}
                  </a>
                  <button
                    onClick={copyPhoneNumber}
                    className="p-2 border border-border rounded-lg hover:bg-card transition-colors"
                    title="Copy number"
                  >
                    {phoneCopied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Call Card */}
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Assistant
              </CardTitle>
              <CardDescription>
                {isSessionActive
                  ? "Call in progress - speak clearly"
                  : "Click to start a voice conversation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={clearError}>
                      <X className="w-4 h-4" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Call Controls */}
              <div className="flex flex-col items-center gap-4 py-6">
                {!isSessionActive ? (
                  <>
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="w-12 h-12 text-primary" />
                    </div>
                    <Button
                      onClick={handleStartCall}
                      disabled={isLoading}
                      size="lg"
                      className="gap-2 px-8"
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
                  </>
                ) : (
                  <>
                    {/* Active call visualization */}
                    <div className="relative w-24 h-24">
                      <div
                        className={`absolute inset-0 rounded-full bg-primary/20 ${
                          isSpeaking ? "animate-ping" : ""
                        }`}
                      />
                      <div className="absolute inset-2 rounded-full bg-primary/30" />
                      <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
                        {isSpeaking ? (
                          <Volume2 className="w-8 h-8 text-primary-foreground animate-pulse" />
                        ) : (
                          <Mic className="w-8 h-8 text-primary-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      {isSpeaking ? (
                        <p className="text-primary font-medium">
                          Assistant is speaking...
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Listening...</p>
                      )}
                    </div>

                    {/* Volume indicator */}
                    <div className="w-full max-w-xs bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-100"
                        style={{
                          width: `${Math.min(volumeLevel * 100, 100)}%`,
                        }}
                      />
                    </div>

                    <Button
                      onClick={handleEndCall}
                      variant="destructive"
                      size="lg"
                      className="gap-2"
                    >
                      <PhoneOff className="h-5 w-5" />
                      End Call
                    </Button>
                  </>
                )}
              </div>

              {/* Live Transcript */}
              {(isSessionActive || callCompleted) && transcripts.length > 0 && (
                <div className="border border-border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-3">
                    Conversation Transcript
                  </p>
                  <div className="space-y-3">
                    {transcripts.map((t, i) => (
                      <div
                        key={i}
                        className={`text-sm ${
                          t.role === "assistant"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        <span className="font-medium">
                          {t.role === "assistant" ? "Assistant: " : "You: "}
                        </span>
                        {t.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions when not in call */}
              {!isSessionActive && !callCompleted && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                  <p className="font-medium mb-2">
                    The voice assistant will collect:
                  </p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Client name and contact information</li>
                    <li>Address and county</li>
                    <li>Household size</li>
                    <li>Filing type preference (individual/joint)</li>
                    <li>Chapter type (7 or 13)</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Data Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Extracted Information
              </CardTitle>
              <CardDescription>
                Data collected from the conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasExtractedData ? (
                <dl className="space-y-3 text-sm">
                  {extractedData.clientName && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium">{extractedData.clientName}</dd>
                    </div>
                  )}
                  {extractedData.email && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{extractedData.email}</dd>
                    </div>
                  )}
                  {extractedData.phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium">{extractedData.phone}</dd>
                    </div>
                  )}
                  {extractedData.ssnLast4 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">SSN</dt>
                      <dd className="font-medium">
                        ***-**-{extractedData.ssnLast4}
                      </dd>
                    </div>
                  )}
                  {extractedData.householdSize && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Household Size</dt>
                      <dd className="font-medium">{extractedData.householdSize}</dd>
                    </div>
                  )}
                  {extractedData.caseType && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Case Type</dt>
                      <dd className="font-medium capitalize">
                        {extractedData.caseType === "chapter7"
                          ? "Chapter 7"
                          : "Chapter 13"}
                      </dd>
                    </div>
                  )}
                  {extractedData.filingType && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Filing Type</dt>
                      <dd className="font-medium capitalize">
                        {extractedData.filingType}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Information will appear here as it's collected during the call.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {extractedData.address ||
              extractedData.city ||
              extractedData.state ? (
                <div className="text-sm">
                  {extractedData.address && <p>{extractedData.address}</p>}
                  {(extractedData.city || extractedData.state) && (
                    <p>
                      {extractedData.city}
                      {extractedData.city && extractedData.state && ", "}
                      {extractedData.state} {extractedData.zip}
                    </p>
                  )}
                  {extractedData.county && (
                    <p className="text-muted-foreground mt-1">
                      {extractedData.county} County
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Address will appear here once collected.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Success State - Case Created */}
        {createdCaseId && (
          <Alert className="mt-6 border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-foreground">
                Case created successfully! You can now continue with the case
                setup.
              </span>
              <Button
                onClick={() => router.push(`/cases/${createdCaseId}`)}
                size="sm"
                className="gap-1"
              >
                View Case
                <ArrowRight className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Call Completed - Next Steps */}
        {callCompleted && !createdCaseId && hasExtractedData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The voice intake is complete. You can now create a case with the
                collected information or make another call to gather more details.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    // Store extracted data for the new case form
                    sessionStorage.setItem(
                      "voiceIntakeData",
                      JSON.stringify(extractedData)
                    );
                    router.push("/cases/new");
                  }}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Create Case with Data
                </Button>
                <Button variant="outline" onClick={handleStartCall}>
                  <Phone className="w-4 h-4 mr-2" />
                  Start New Call
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
