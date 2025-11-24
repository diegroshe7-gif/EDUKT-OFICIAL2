import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, DollarSign, Clock, Calendar, Star, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Checkout from "@/pages/checkout";

interface TutorProfileProps {
  tutor: any;
  alumnoId: string;
  onBack: () => void;
  onBookingComplete?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export default function TutorProfile({ tutor, alumnoId, onBack, onBookingComplete }: TutorProfileProps) {
  const { toast } = useToast();
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [startTimeMinutes, setStartTimeMinutes] = useState<number | null>(null);
  const [endTimeMinutes, setEndTimeMinutes] = useState<number | null>(null);
  const [calculatedDate, setCalculatedDate] = useState<{ startTime: string; endTime: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [alumno, setAlumno] = useState<any>(null);

  const { data: slots = [] } = useQuery({
    queryKey: ['/api/availability-slots/tutor', tutor.id],
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ['/api/reviews/tutor', tutor.id],
  });

  const { data: rating } = useQuery<{ rating: number }>({
    queryKey: ['/api/reviews/tutor', tutor.id, 'average'],
  });

  const sortedSlots = Array.isArray(slots) ? [...slots].sort((a: any, b: any) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime - b.startTime;
  }) : [];

  const handleCalculateDate = async () => {
    if (!selectedSlot || startTimeMinutes === null || endTimeMinutes === null) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona un horario y define la hora de inicio y fin"
      });
      return;
    }

    // Validate that end time is after start time
    if (endTimeMinutes <= startTimeMinutes) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La hora de fin debe ser después de la hora de inicio"
      });
      return;
    }

    // Validate that times are within the slot range
    if (startTimeMinutes < selectedSlot.startTime || endTimeMinutes > selectedSlot.endTime) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `El horario debe estar entre ${minutesToTime(selectedSlot.startTime)} y ${minutesToTime(selectedSlot.endTime)}`
      });
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch('/api/book-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          alumnoId,
          tutorId: tutor.id,
          startTimeMinutes,
          endTimeMinutes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al calcular la fecha');
      }

      const data = await response.json();
      setCalculatedDate({
        startTime: data.startTime,
        endTime: data.endTime
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!calculatedDate || startTimeMinutes === null || endTimeMinutes === null) {
      return;
    }
    
    // Load alumno data from localStorage
    const alumnoData = localStorage.getItem('edukt_alumno');
    if (!alumnoData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontraron tus datos"
      });
      return;
    }
    
    const alumnoObj = JSON.parse(alumnoData);
    setAlumno(alumnoObj);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setIsBookingDialogOpen(false);
    setCalculatedDate(null);
    setSelectedSlot(null);
    setStartTimeMinutes(null);
    setEndTimeMinutes(null);
    
    toast({
      title: "¡Clase agendada!",
      description: "Tu clase ha sido reservada exitosamente"
    });
    
    if (onBookingComplete) {
      onBookingComplete();
    }
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
  };

  const initials = tutor.nombre
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={onBack}
          data-testid="button-back-profile"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Tutores
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={tutor.fotoPerfil ? `/objects/${tutor.fotoPerfil}` : undefined} alt={tutor.nombre} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl" data-testid="text-tutor-name">{tutor.nombre}</CardTitle>
                  {tutor.isAvailable && (
                    <Badge variant="default" data-testid="badge-available">Disponible</Badge>
                  )}
                </div>
                {rating?.rating && (
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold" data-testid="text-rating">
                      {rating.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  </div>
                )}
                {tutor.universidad && (
                  <p className="text-muted-foreground" data-testid="text-university">{tutor.universidad}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tutor.bio && (
              <div>
                <h3 className="font-semibold mb-2">Sobre mí</h3>
                <p className="text-muted-foreground" data-testid="text-bio">{tutor.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-location">{tutor.ubicacion}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-modality">{tutor.modalidad}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium" data-testid="text-rate">${tutor.tarifa}/hora</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Materias</h3>
              <div className="flex flex-wrap gap-2">
                {tutor.materias.split(',').map((materia: string, idx: number) => (
                  <Badge key={idx} variant="secondary" data-testid={`badge-subject-${idx}`}>
                    {materia.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Horarios Disponibles</CardTitle>
                <CardDescription>Selecciona un horario para agendar tu clase</CardDescription>
              </div>
              {tutor.isAvailable && sortedSlots.length > 0 && (
                <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-open-booking">
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Clase
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agendar Clase con {tutor.nombre}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Selecciona un día y horario disponible</Label>
                        <Select
                          value={selectedSlot?.id || ""}
                          onValueChange={(value) => {
                            const slot = sortedSlots.find((s: any) => s.id === value);
                            setSelectedSlot(slot);
                            setStartTimeMinutes(null);
                            setEndTimeMinutes(null);
                            setCalculatedDate(null);
                          }}
                        >
                          <SelectTrigger data-testid="select-slot">
                            <SelectValue placeholder="Selecciona un horario" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSlots.map((slot: any) => (
                              <SelectItem key={slot.id} value={slot.id}>
                                {DAYS_OF_WEEK[slot.dayOfWeek].label} {minutesToTime(slot.startTime)} - {minutesToTime(slot.endTime)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedSlot && (
                        <>
                          <div className="space-y-2">
                            <Label>Hora de inicio (dentro de {minutesToTime(selectedSlot.startTime)} - {minutesToTime(selectedSlot.endTime)})</Label>
                            <Select
                              value={startTimeMinutes !== null ? startTimeMinutes.toString() : ""}
                              onValueChange={(value) => {
                                setStartTimeMinutes(parseInt(value));
                                setCalculatedDate(null);
                              }}
                            >
                              <SelectTrigger data-testid="select-start-time">
                                <SelectValue placeholder="Elige hora de inicio" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: (selectedSlot.endTime - selectedSlot.startTime) / 30 + 1 }).map((_, idx) => {
                                  const timeMinutes = selectedSlot.startTime + idx * 30;
                                  if (timeMinutes >= selectedSlot.endTime) return null;
                                  return (
                                    <SelectItem key={timeMinutes} value={timeMinutes.toString()}>
                                      {minutesToTime(timeMinutes)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Hora de fin (después de {startTimeMinutes !== null ? minutesToTime(startTimeMinutes) : "la hora de inicio"})</Label>
                            <Select
                              value={endTimeMinutes !== null ? endTimeMinutes.toString() : ""}
                              onValueChange={(value) => {
                                setEndTimeMinutes(parseInt(value));
                                setCalculatedDate(null);
                              }}
                            >
                              <SelectTrigger data-testid="select-end-time">
                                <SelectValue placeholder="Elige hora de fin" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: (selectedSlot.endTime - selectedSlot.startTime) / 30 + 1 }).map((_, idx) => {
                                  const timeMinutes = selectedSlot.startTime + idx * 30;
                                  if (timeMinutes <= (startTimeMinutes || selectedSlot.startTime)) return null;
                                  if (timeMinutes > selectedSlot.endTime) return null;
                                  return (
                                    <SelectItem key={timeMinutes} value={timeMinutes.toString()}>
                                      {minutesToTime(timeMinutes)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={handleCalculateDate}
                        className="w-full"
                        disabled={isCalculating || !selectedSlot}
                        data-testid="button-calculate-date"
                      >
                        {isCalculating ? "Calculando..." : "Ver Fecha y Hora"}
                      </Button>

                      {calculatedDate && (
                        <div className="p-4 bg-secondary rounded-lg space-y-2">
                          <p className="font-medium">Tu clase será:</p>
                          <p className="text-sm">
                            <strong>Inicio:</strong> {new Date(calculatedDate.startTime).toLocaleString('es-MX', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-sm">
                            <strong>Fin:</strong> {new Date(calculatedDate.endTime).toLocaleString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-sm font-medium mt-4">
                            Total: ${(((endTimeMinutes! - startTimeMinutes!) / 60) * tutor.tarifa * 1.08).toFixed(2)} MXN
                            <span className="text-xs text-muted-foreground ml-2">(incluye 8% de servicio)</span>
                          </p>
                          {showCheckout && calculatedDate && alumno ? (
                            <Checkout 
                              tutor={tutor}
                              hours={(endTimeMinutes! - startTimeMinutes!) / 60}
                              alumno={alumno}
                              onSuccess={handleCheckoutSuccess}
                              onCancel={handleCheckoutCancel}
                            />
                          ) : (
                            <Button 
                              onClick={handleProceedToPayment}
                              className="w-full mt-4"
                              data-testid="button-proceed-payment"
                            >
                              Proceder al Pago
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!tutor.isAvailable ? (
              <p className="text-center text-muted-foreground py-8">
                Este tutor no está disponible actualmente para agendar nuevas clases
              </p>
            ) : sortedSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                El tutor aún no ha configurado sus horarios disponibles
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedSlots.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                    data-testid={`available-slot-${slot.id}`}
                  >
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{DAYS_OF_WEEK[slot.dayOfWeek].label}</p>
                      <p className="text-sm text-muted-foreground">
                        {minutesToTime(slot.startTime)} - {minutesToTime(slot.endTime)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reseñas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0" data-testid={`review-${review.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.calificacion
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comentario && (
                    <p className="text-sm text-muted-foreground">{review.comentario}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
