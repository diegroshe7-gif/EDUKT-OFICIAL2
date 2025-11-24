import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Video, Users, Clock, DollarSign, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Review } from "@shared/schema";

interface TutorCardProps {
  tutor: {
    id?: string;
    nombre: string;
    edad: number;
    email: string;
    telefono: string;
    materias: string;
    modalidad: string;
    ubicacion?: string;
    tarifa: number;
    disponibilidad: string;
    bio?: string;
    fotoPerfil?: string;
  };
  onSchedule?: (tutor: any) => void;
  onViewProfile?: (tutor: any) => void;
}

export default function TutorCard({ tutor, onSchedule, onViewProfile }: TutorCardProps) {
  const materias = tutor.materias.split(',').map(m => m.trim());
  const initials = tutor.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews/tutor", tutor.id],
    enabled: !!tutor.id,
  });

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length
    : 0;
  const reviewCount = reviews?.length || 0;

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-tutor-${tutor.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {tutor.fotoPerfil && (
              <AvatarImage 
                src={`/objects/${tutor.fotoPerfil}`} 
                alt={tutor.nombre} 
              />
            )}
            <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight" data-testid={`text-tutor-name-${tutor.id}`}>
              {tutor.nombre}
            </h3>
            <p className="text-sm text-muted-foreground">{tutor.edad} años</p>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1 mt-1" data-testid={`rating-${tutor.id}`}>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewCount})</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {materias.map((materia, idx) => (
            <Badge key={idx} variant="secondary" className="font-normal">
              {materia}
            </Badge>
          ))}
        </div>

        {tutor.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tutor.bio}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {tutor.modalidad === 'online' && <Video className="h-4 w-4" />}
            {tutor.modalidad === 'presencial' && <Users className="h-4 w-4" />}
            {tutor.modalidad === 'mixta' && <Users className="h-4 w-4" />}
            <span className="capitalize">{tutor.modalidad}</span>
          </div>

          {tutor.ubicacion && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{tutor.ubicacion}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="line-clamp-1">{tutor.disponibilidad}</span>
          </div>

          <div className="flex items-center gap-2 font-semibold text-lg text-primary">
            <DollarSign className="h-5 w-5" />
            <span data-testid={`text-tutor-rate-${tutor.id}`}>${tutor.tarifa.toLocaleString('es-MX')} MXN/hora</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <Button 
          className="w-full bg-accent hover:bg-accent text-accent-foreground"
          onClick={() => onViewProfile?.(tutor)}
          data-testid={`button-view-profile-${tutor.id}`}
        >
          Ver Perfil
        </Button>
      </CardFooter>
    </Card>
  );
}
