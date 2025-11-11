import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: "pendiente" | "aprobado" | "rechazado";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    pendiente: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Pendiente",
    },
    aprobado: {
      variant: "default" as const,
      icon: CheckCircle2,
      label: "Aprobado",
    },
    rechazado: {
      variant: "destructive" as const,
      icon: XCircle,
      label: "Rechazado",
    },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5" data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
