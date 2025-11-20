import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Video, Star, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { Sesion, Tutor, Alumno } from "@shared/schema";
import ReviewModal from "../components/ReviewModal";

interface StudentSessionsProps {
  alumnoId: string;
  onBack?: () => void;
}

interface SesionConDetalles extends Sesion {
  tutor?: Tutor;
  alumno?: Alumno;
}

export default function StudentSessions({ alumnoId, onBack }: StudentSessionsProps) {
  const { data: sesiones, isLoading } = useQuery<SesionConDetalles[]>({
    queryKey: ["/api/sesiones/alumno", alumnoId],
  });

  const [reviewingSession, setReviewingSession] = useState<Sesion | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Cargando tus sesiones...</div>
      </div>
    );
  }

  const sortedSesiones = [...(sesiones || [])].sort((a, b) => 
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const upcomingSesiones = sortedSesiones.filter(s => 
    new Date(s.fecha) > new Date()
  );

  const pastSesiones = sortedSesiones.filter(s => 
    new Date(s.fecha) <= new Date()
  );

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="gap-2"
              data-testid="button-back-sessions"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Mis Sesiones</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona tus clases programadas
            </p>
          </div>
        </div>

        {/* Próximas Sesiones */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximas Sesiones ({upcomingSesiones.length})
          </h2>
          
          {upcomingSesiones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tienes sesiones programadas próximamente
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingSesiones.map((sesion) => (
                <StudentSessionCard key={sesion.id} sesion={sesion} />
              ))}
            </div>
          )}
        </div>

        {/* Sesiones Pasadas */}
        {pastSesiones.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Sesiones Completadas ({pastSesiones.length})
            </h2>
            <div className="grid gap-4">
              {pastSesiones.map((sesion) => (
                <StudentSessionCard 
                  key={sesion.id} 
                  sesion={sesion} 
                  isPast
                  onReview={() => setReviewingSession(sesion)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {reviewingSession && (
        <ReviewModal
          sesion={reviewingSession}
          alumnoId={alumnoId}
          onClose={() => setReviewingSession(null)}
        />
      )}
    </>
  );
}

interface StudentSessionCardProps {
  sesion: SesionConDetalles;
  isPast?: boolean;
  onReview?: () => void;
}

function StudentSessionCard({ sesion, isPast = false, onReview }: StudentSessionCardProps) {
  const { data: tutor } = useQuery<Tutor>({
    queryKey: ["/api/tutors", sesion.tutorId],
    enabled: !!sesion.tutorId,
  });

  const sessionDate = new Date(sesion.fecha);
  const isToday = format(sessionDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card className={isPast ? "opacity-60" : ""} data-testid={`card-session-${sesion.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <CardTitle className="text-lg">
                Sesión con {tutor ? tutor.nombre : "Tutor"}
              </CardTitle>
              {isToday && !isPast && (
                <Badge variant="default" data-testid={`badge-today-${sesion.id}`}>Hoy</Badge>
              )}
              {isPast && (
                <Badge variant="secondary" data-testid={`badge-completed-${sesion.id}`}>Completada</Badge>
              )}
            </div>
            
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-date-${sesion.id}`}>
                  {format(sessionDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span data-testid={`text-time-${sesion.id}`}>
                  {format(sessionDate, "h:mm a")} • {sesion.horas} {sesion.horas === 1 ? "hora" : "horas"}
                </span>
              </div>
              {tutor && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span data-testid={`text-tutor-email-${sesion.id}`}>{tutor.email}</span>
                </div>
              )}
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2">
            {sesion.meetLink && !isPast && (
              <Button
                size="sm"
                asChild
                data-testid={`button-join-meet-${sesion.id}`}
              >
                <a 
                  href={sesion.meetLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Unirse a Google Meet
                </a>
              </Button>
            )}
            {isPast && onReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReview}
                data-testid={`button-review-${sesion.id}`}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Calificar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
