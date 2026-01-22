"use client";

import { useState } from "react";
import { Phone, PhoneCall, Copy, Check, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PhoneIntakeCardProps {
  variant?: "default" | "compact" | "banner";
  className?: string;
}

export function PhoneIntakeCard({
  variant = "default",
  className = "",
}: PhoneIntakeCardProps) {
  const [copied, setCopied] = useState(false);
  const phoneNumber = process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER || "";

  if (!phoneNumber) {
    return null;
  }

  const formatPhoneNumber = (phone: string) => {
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
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compact variant - just the phone number with call button
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <a
          href={`tel:${phoneNumber}`}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Phone className="w-4 h-4" />
          {formatPhoneNumber(phoneNumber)}
        </a>
        <button
          onClick={copyPhoneNumber}
          className="p-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
          title="Copy number"
        >
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    );
  }

  // Banner variant - full-width banner style
  if (variant === "banner") {
    return (
      <div
        className={`bg-gradient-to-r from-primary to-chart-2 text-primary-foreground rounded-xl p-4 ${className}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Call to Start Client Intake</h3>
              <p className="text-sm text-primary-foreground/80">
                Speak with our AI assistant to collect client information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${phoneNumber}`}
              className="flex items-center gap-2 px-4 py-2 bg-card text-primary font-semibold rounded-lg hover:bg-card/90 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {formatPhoneNumber(phoneNumber)}
            </a>
            <button
              onClick={copyPhoneNumber}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Copy number"
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant - full card with details
  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-accent/30 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/25">
            <PhoneCall className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Phone Intake Available
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Have clients call our AI assistant directly to provide their information.
              The assistant will guide them through the intake process and create their case automatically.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <a
                href={`tel:${phoneNumber}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md shadow-primary/25"
              >
                <Phone className="w-5 h-5" />
                {formatPhoneNumber(phoneNumber)}
              </a>
              <button
                onClick={copyPhoneNumber}
                className="flex items-center gap-2 px-4 py-2.5 border border-primary/30 bg-card text-primary rounded-lg hover:bg-primary/10 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Available 24/7</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>AI-powered intake</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
