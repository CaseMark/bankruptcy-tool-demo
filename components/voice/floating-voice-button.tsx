"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  X,
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  Loader2,
  MessageSquare,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useVapi } from "@/app/hooks/useVapi";
import { Button } from "@/components/ui/button";

interface FloatingVoiceButtonProps {
  position?: "bottom-right" | "bottom-left";
}

export function FloatingVoiceButton({
  position = "bottom-right",
}: FloatingVoiceButtonProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [publicKey, setPublicKey] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Get environment variables on client side
  useEffect(() => {
    setPublicKey(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");
    setAssistantId(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "");
    setPhoneNumber(process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER || "");
  }, []);

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

  const webVapiConfigured = publicKey && assistantId;

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
  } = useVapi({
    publicKey,
    assistantId,
  });

  // Auto-expand when call starts - MUST be called before any early returns
  useEffect(() => {
    if (isSessionActive && !isExpanded && !isMinimized) {
      setIsExpanded(true);
    }
  }, [isSessionActive, isExpanded, isMinimized]);

  const positionClasses =
    position === "bottom-right" ? "right-6 bottom-6" : "left-6 bottom-6";

  // Don't render if neither web Vapi nor phone is configured
  // This check MUST come after all hooks
  if (!webVapiConfigured && !phoneNumber) {
    return null;
  }

  const handleStartCall = () => {
    const connectionString = localStorage.getItem("bankruptcy_db_connection");
    startCall({
      metadata: {
        connectionString,
        source: "floating-button",
      },
    });
  };

  const handleToggleExpand = () => {
    if (!isSessionActive && !isExpanded) {
      // First click when not in call - start the call
      handleStartCall();
    }
    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsExpanded(false);
  };

  const handleEndCall = () => {
    endCall();
    setIsExpanded(false);
  };

  // Minimized state during active call
  if (isMinimized && isSessionActive) {
    return (
      <div className={`fixed ${positionClasses} z-50`}>
        <button
          onClick={() => {
            setIsMinimized(false);
            setIsExpanded(true);
          }}
          className="relative flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all"
        >
          <div className="relative">
            <Mic className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium">Call Active</span>
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded state
  if (isExpanded) {
    return (
      <div
        className={`fixed ${positionClasses} z-50 w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            <span className="font-semibold">Voice Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {isSessionActive && (
              <button
                onClick={handleMinimize}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (isSessionActive) {
                  handleEndCall();
                } else {
                  setIsExpanded(false);
                }
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center justify-between p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <span>{error}</span>
              <button onClick={clearError} className="text-destructive/70 hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Call Status */}
          {isSessionActive ? (
            <div className="space-y-3">
              {/* Speaking/Listening indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-primary font-medium">
                      Assistant speaking...
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-chart-2" />
                    <span className="text-muted-foreground">Listening...</span>
                  </>
                )}
              </div>

              {/* Volume indicator */}
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                />
              </div>

              {/* Recent transcript */}
              {transcripts.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {transcripts.slice(-3).map((t, i) => (
                      <div
                        key={i}
                        className={`text-sm ${
                          t.role === "assistant"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        <span className="font-medium">
                          {t.role === "assistant" ? "AI: " : "You: "}
                        </span>
                        {t.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End call button */}
              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="w-full gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Start a voice conversation with our AI assistant for client
                intake or case updates.
              </p>

              <Button
                onClick={handleStartCall}
                disabled={isLoading}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Voice Call
                  </>
                )}
              </Button>

              {/* Phone option */}
              {phoneNumber && (
                <a
                  href={`tel:${phoneNumber}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-primary/20 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
                >
                  <PhoneCall className="w-4 h-4" />
                  Or call: {formatPhoneNumber(phoneNumber)}
                </a>
              )}

              <button
                onClick={() => router.push("/intake/voice")}
                className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                Open full voice intake page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phone-only mode: show simple phone button if web SDK not configured
  if (!webVapiConfigured && phoneNumber) {
    return (
      <div className={`fixed ${positionClasses} z-50`}>
        <a
          href={`tel:${phoneNumber}`}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Phone className="w-6 h-6" />
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 bg-foreground text-background text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Call for intake: {formatPhoneNumber(phoneNumber)}
          </span>
        </a>
      </div>
    );
  }

  // Collapsed button state
  return (
    <div className={`fixed ${positionClasses} z-50`}>
      <button
        onClick={handleToggleExpand}
        disabled={isLoading}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
          isSessionActive
            ? "bg-chart-4 hover:bg-chart-4/90"
            : "bg-primary hover:bg-primary/90"
        } text-primary-foreground`}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isSessionActive ? (
          <div className="relative">
            <Mic className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        ) : (
          <Mic className="w-6 h-6" />
        )}

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-2 py-1 bg-foreground text-background text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {isSessionActive ? "Voice call active" : "Start voice intake"}
        </span>
      </button>
    </div>
  );
}
