"use client";

import { useState, useEffect } from "react";
import { Phone, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  validateUSPhoneNumber,
  formatToE164,
  formatForDisplay,
} from "@/lib/utils/phone-validation";
import { getUserId } from "@/lib/utils/get-user-id";

interface OutboundIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallScheduled?: () => void;
}

export function OutboundIntakeModal({
  open,
  onOpenChange,
  onCallScheduled,
}: OutboundIntakeModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [showPhoneError, setShowPhoneError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Validate phone number whenever it changes
  useEffect(() => {
    if (phoneNumber) {
      const valid = validateUSPhoneNumber(phoneNumber);
      setIsPhoneValid(valid);
      if (!valid && phoneNumber.length >= 10) {
        setShowPhoneError(true);
      } else {
        setShowPhoneError(false);
      }
    } else {
      setIsPhoneValid(false);
      setShowPhoneError(false);
    }
  }, [phoneNumber]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setPhoneNumber("");
      setShowPhoneError(false);
      setApiError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setApiError("Please enter both first and last name");
      return;
    }

    if (!isPhoneValid) {
      setShowPhoneError(true);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      // Get database connection and userId
      const connectionString = localStorage.getItem('bankruptcy_db_connection');
      if (!connectionString) {
        throw new Error('Database connection not found. Please configure your API key first.');
      }

      const userId = getUserId();
      const clientName = `${firstName.trim()} ${lastName.trim()}`;
      const formattedPhone = formatToE164(phoneNumber);

      // Step 1: Check if case exists or create new one
      const checkResponse = await fetch('/api/cases/check-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: formattedPhone,
        }),
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.error || 'Failed to create/find case');
      }

      const { caseId } = await checkResponse.json();

      // Step 2: Initiate outbound call
      const callResponse = await fetch(
        `/api/vapi/outbound?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            phoneNumber: formattedPhone,
            clientName,
          }),
        }
      );

      const callData = await callResponse.json();

      if (!callResponse.ok) {
        throw new Error(callData.error || "Failed to schedule call");
      }

      // Success
      onCallScheduled?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error scheduling outbound intake call:", error);
      setApiError(error.message || "Unable to schedule call. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isFormValid = firstName.trim() && lastName.trim() && isPhoneValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="w-5 h-5 text-primary" />
            Schedule Intake Call
          </DialogTitle>
          <DialogDescription>
            Enter client information to schedule an AI-assisted intake call
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              className={showPhoneError ? "border-red-500" : ""}
            />
            {showPhoneError && (
              <p className="text-sm text-red-500">
                Phone number is not valid
              </p>
            )}
          </div>

          {phoneNumber && isPhoneValid && (
            <div className="text-sm text-muted-foreground">
              Will call: {formatForDisplay(phoneNumber)}
            </div>
          )}

          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-blue-900">
              Our AI assistant will call this number to conduct a bankruptcy intake interview.
              The collected information will be saved to a case automatically.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Schedule Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
