import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, Users, Clock, FileText, ExternalLink, TrendingUp, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "./StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminReports from "./AdminReports";
import TutorDetailModal from "./TutorDetailModal";

interface AdminPanelProps {
  pending: any[];
  approved: any[];
  rejected: any[];
  onApprove: (index: number) => void;
  onReject: (index: number) => void;
  onBack: () => void;
}

export default function AdminPanel({ pending, approved, rejected, onApprove, onReject, onBack }: AdminPanelProps) {
  const [showReports, setShowReports] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<any | null>(null);

  if (showReports) {
    return <AdminReports onBack={() => setShowReports(false)} />;
  }
  const stats = [
    { label: 'Pendientes', value: pending.length, icon: Clock, color: 'text-yellow-600' },
    { label: 'Aprobados', value: approved.length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Total Tutores', value: approved.length + pending.length + rejected.length, icon: Users, color: 'text-primary' },
  ];

  const TutorReviewCard = ({ tutor, index, isPending }: { tutor: any; index: number; isPending: boolean }) => {
    const initials = tutor.nombre?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
    const materias = tutor.materias?.split(',').map((m: string) => m.trim()) || [];

    return (
      <Card className="hover-elevate" data-testid={`card-tutor-review-${index}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar className="h-12 w-12">
                {tutor.fotoPerfil && (
                  <AvatarImage 
                    src={`/objects/${tutor.fotoPerfil}`} 
                    alt={tutor.nombre}
                  />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg" data-testid={`text-name-${index}`}>{tutor.nombre}</CardTitle>
                <CardDescription>{tutor.edad} años • {tutor.email}</CardDescription>
              </div>
            </div>
            <StatusBadge status={tutor.status || 'pendiente'} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Teléfono</p>
              <p className="font-medium">{tutor.telefono}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modalidad</p>
              <p className="font-medium capitalize">{tutor.modalidad}</p>
            </div>
            {tutor.ubicacion && (
              <div>
                <p className="text-muted-foreground">Ubicación</p>
                <p className="font-medium">{tutor.ubicacion}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Tarifa por hora</p>
              <p className="font-medium text-primary">${tutor.tarifa?.toLocaleString('es-MX')} MXN</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Materias</p>
            <div className="flex flex-wrap gap-2">
              {materias.map((materia: string, idx: number) => (
                <Badge key={idx} variant="secondary">{materia}</Badge>
              ))}
            </div>
          </div>

          {tutor.bio && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
              <p className="text-sm">{tutor.bio}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">Disponibilidad</p>
            <p className="text-sm">{tutor.disponibilidad}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setSelectedTutor(tutor)}
              data-testid={`button-view-details-${index}`}
            >
              <Eye className="h-4 w-4" />
              Ver Completo
            </Button>
            {tutor.cvUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => window.open(`/objects/${tutor.cvUrl}`, '_blank')}
                data-testid={`button-view-cv-${index}`}
              >
                <FileText className="h-4 w-4" />
                Ver CV
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {isPending && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="default"
                className="flex-1 bg-accent hover:bg-accent text-accent-foreground gap-2"
                onClick={() => onApprove(index)}
                data-testid={`button-approve-${index}`}
              >
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => onReject(index)}
                data-testid={`button-reject-${index}`}
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
              Panel de Administración
            </h1>
            <Button
              variant="outline"
              onClick={() => setShowReports(true)}
              className="gap-2"
              data-testid="button-view-reports"
            >
              <TrendingUp className="h-4 w-4" />
              Ver Reportes
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</p>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pendientes ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Aprobados ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="all-tutors" data-testid="tab-all-tutors">
              Todos los Tutores ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rechazados ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay tutores pendientes de revisión</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pending.map((tutor, index) => (
                  <TutorReviewCard key={index} tutor={tutor} index={index} isPending={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approved.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay tutores aprobados aún</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approved.map((tutor, index) => (
                  <TutorReviewCard key={index} tutor={tutor} index={index} isPending={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-tutors" className="space-y-4">
            {approved.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay tutores aprobados en el sistema</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Directorio de Tutores Aprobados</h2>
                  <div className="grid gap-4">
                    {approved.map((tutor, index) => (
                      <TutorReviewCard key={index} tutor={tutor} index={index} isPending={false} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejected.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay tutores rechazados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejected.map((tutor, index) => (
                  <TutorReviewCard key={index} tutor={tutor} index={index} isPending={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Tutor Detail Modal */}
      <TutorDetailModal 
        tutor={selectedTutor}
        onClose={() => setSelectedTutor(null)}
        onApprove={(id) => {
          const index = pending.findIndex((t: any) => t.id === id);
          if (index !== -1) {
            onApprove(index);
            setSelectedTutor(null);
          }
        }}
        onReject={(id) => {
          const index = pending.findIndex((t: any) => t.id === id);
          if (index !== -1) {
            onReject(index);
            setSelectedTutor(null);
          }
        }}
      />
    </div>
  );
}
