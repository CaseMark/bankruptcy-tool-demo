import { Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface CaseStatusBadgeProps {
  status: string;
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "intake":
        return {
          color: "bg-accent text-primary",
          icon: <Clock className="w-4 h-4" />,
          label: "Intake",
        };
      case "documents_pending":
        return {
          color: "bg-amber-50 text-amber-700",
          icon: <FileText className="w-4 h-4" />,
          label: "Documents Pending",
        };
      case "review":
        return {
          color: "bg-orange-100 text-orange-700",
          icon: <FileText className="w-4 h-4" />,
          label: "Review",
        };
      case "ready_to_file":
        return {
          color: "bg-green-50 text-green-700",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "Ready to File",
        };
      case "filed":
        return {
          color: "bg-primary/10 text-primary",
          icon: <FileText className="w-4 h-4" />,
          label: "Filed",
        };
      case "discharged":
        return {
          color: "bg-green-100 text-green-700",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "Discharged",
        };
      case "dismissed":
        return {
          color: "bg-red-50 text-red-700",
          icon: <AlertCircle className="w-4 h-4" />,
          label: "Dismissed",
        };
      default:
        return {
          color: "bg-muted text-muted-foreground",
          icon: <Clock className="w-4 h-4" />,
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
