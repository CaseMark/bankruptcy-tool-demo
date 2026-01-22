"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileText,
  Plus,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BankruptcyCase {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
  createdAt: string;
}

interface FeatureConfig {
  id: string;
  title: string;
  description: string;
  path: string; // Path suffix after /cases/[id]/
  icon: React.ReactNode;
}

interface CaseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: BankruptcyCase[];
  feature: FeatureConfig | null;
}

export function CaseSelectorModal({
  isOpen,
  onClose,
  cases,
  feature,
}: CaseSelectorModalProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  if (!isOpen || !feature) return null;

  const handleSelectCase = (caseId: string) => {
    setNavigating(caseId);
    const path = feature.path ? `/cases/${caseId}/${feature.path}` : `/cases/${caseId}`;
    router.push(path);
  };

  const handleCreateNew = () => {
    // Store the intended destination in sessionStorage so we can redirect after case creation
    sessionStorage.setItem("postCaseCreateRedirect", feature.path || "");
    router.push("/cases/new");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {feature.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cases.length === 0 ? (
            /* No cases - prompt to create */
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Cases Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first bankruptcy case to access {feature.title.toLowerCase()}.
              </p>
              <Button onClick={handleCreateNew} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create New Case
              </Button>
            </div>
          ) : (
            /* Case list */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Select a case to open {feature.title.toLowerCase()}:
              </p>

              {cases.map((c) => (
                <Card
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className="p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{c.clientName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {c.caseType === "chapter7" ? "Chapter 7" : "Chapter 13"} •{" "}
                          {c.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {navigating === c.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {/* Create new case option */}
              <Card
                onClick={handleCreateNew}
                className="p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Create New Case</h4>
                      <p className="text-sm text-muted-foreground">
                        Start a new bankruptcy case
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
