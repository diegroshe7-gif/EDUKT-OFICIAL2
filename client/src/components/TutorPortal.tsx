import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Plus, Trash2, ToggleLeft, ToggleRight, DollarSign } from "lucide-react";
import TeacherCalendar from "@/pages/teacher-calendar";
import TutorIncome from "./TutorIncome";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface TutorPortalProps {
  onBack: () => void;
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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function TutorPortal({ onBack }: TutorPortalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'availability' | 'calendar' | 'income'>('availability');
  const [tutor, setTutor] = useState<any>(null);
  const [tutorId, setTutorId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00"
  });

  useEffect(() => {
    const savedTutor = localStorage.getItem('edukt_tutor');
    if (savedTutor) {
      const tutorData = JSON.parse(savedTutor);
      setTutor(tutorData);
      if (tutorData.id) {
        setTutorId(tutorData.id);
      }
    }
  }, []);

  // Fetch fresh tutor data to get isAvailable status
  const { data: freshTutorData } = useQuery({
    queryKey: ['/api/tutors/approved'],
    enabled: !!tutorId,
    select: (tutors: any[]) => tutors.find((t: any) => t.id === tutorId),
  });

  // Update tutor with fresh data when available
  useEffect(() => {
    if (freshTutorData) {
      setTutor(freshTutorData);
      localStorage.setItem('edukt_tutor', JSON.stringify(freshTutorData));
    }
  }, [freshTutorData]);

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/tutors', tutorId, 'availability'],
    enabled: !!tutorId,
  });

  const createSlotMutation = useMutation({
    mutationFn: async (slot: any) => {
      if (!tutorId) throw new Error("Tutor ID no disponible");
      return apiRequest('POST', `/api/tutors/${tutorId}/availability`, slot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors', tutorId, 'availability'] });
      toast({
        title: "Horario agregado",
        description: "La franja horaria se creó exitosamente"
      });
      setIsDialogOpen(false);
      setNewSlot({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear la franja horaria"
      });
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      return apiRequest('DELETE', `/api/availability-slots/${slotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors', tutorId, 'availability'] });
      toast({
        title: "Horario eliminado",
        description: "La franja horaria se eliminó exitosamente"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar la franja horaria"
      });
    }
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!tutorId) throw new Error("Tutor ID no disponible");
      return apiRequest('PATCH', `/api/tutors/${tutorId}/toggle-availability`, { isAvailable });
    },
    onSuccess: (updatedTutor: any) => {
      setTutor(updatedTutor);
      localStorage.setItem('edukt_tutor', JSON.stringify(updatedTutor));
      toast({
        title: updatedTutor.isAvailable ? "Disponible" : "No disponible",
        description: updatedTutor.isAvailable 
          ? "Ahora los estudiantes pueden agendar clases contigo" 
          : "Los estudiantes no podrán agendar nuevas clases"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la disponibilidad"
      });
    }
  });

  const handleCreateSlot = () => {
    const startMinutes = timeToMinutes(newSlot.startTime);
    const endMinutes = timeToMinutes(newSlot.endTime);
    
    if (endMinutes <= startMinutes) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La hora de fin debe ser posterior a la hora de inicio"
      });
      return;
    }

    createSlotMutation.mutate({
      dayOfWeek: newSlot.dayOfWeek,
      startTime: startMinutes,
      endTime: endMinutes
    });
  };

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (view === 'calendar') {
    return <TeacherCalendar tutorId={tutorId} onBack={() => setView('availability')} />;
  }

  if (view === 'income') {
    return <TutorIncome tutorId={tutorId} onBack={() => setView('availability')} />;
  }

  const sortedSlots = Array.isArray(slots) ? [...slots].sort((a: any, b: any) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime - b.startTime;
  }) : [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid="button-back-tutor"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Portal de Tutor</CardTitle>
            <CardDescription>Bienvenido, {tutor.nombre}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {tutor.isAvailable ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {tutor.isAvailable ? "Disponible" : "No disponible"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tutor.isAvailable 
                      ? "Los estudiantes pueden agendar clases" 
                      : "No se permiten nuevas reservaciones"}
                  </p>
                </div>
              </div>
              <Switch
                checked={tutor.isAvailable}
                onCheckedChange={(checked) => toggleAvailabilityMutation.mutate(checked)}
                data-testid="toggle-availability"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setView('calendar')}
                data-testid="button-view-calendar"
              >
                <Calendar className="h-8 w-8" />
                <span>Ver Calendario</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setView('income')}
                data-testid="button-view-income"
              >
                <DollarSign className="h-8 w-8" />
                <span>Mis Ingresos</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Horarios de Disponibilidad</CardTitle>
                <CardDescription>
                  Agrega los días y horarios en que puedes dar clases. Los estudiantes solo podrán reservar en las franjas que configures aquí. Puedes agregar múltiples horarios para diferentes días.
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-slot">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Horario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Horario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Día de la semana</Label>
                      <Select
                        value={newSlot.dayOfWeek.toString()}
                        onValueChange={(value) => setNewSlot({...newSlot, dayOfWeek: parseInt(value)})}
                      >
                        <SelectTrigger data-testid="select-day">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hora inicio</Label>
                        <Input
                          type="time"
                          value={newSlot.startTime}
                          onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
                          data-testid="input-start-time"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora fin</Label>
                        <Input
                          type="time"
                          value={newSlot.endTime}
                          onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
                          data-testid="input-end-time"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleCreateSlot} 
                      className="w-full"
                      disabled={createSlotMutation.isPending}
                      data-testid="button-create-slot"
                    >
                      {createSlotMutation.isPending ? "Guardando..." : "Guardar Horario"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <p className="text-center text-muted-foreground py-8">Cargando horarios...</p>
            ) : sortedSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No has configurado horarios aún. Agrega tu primer horario disponible.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedSlots.map((slot: any) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate active-elevate-2" data-testid={`slot-${slot.id}`}>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {DAYS_OF_WEEK[slot.dayOfWeek].label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {minutesToTime(slot.startTime)} - {minutesToTime(slot.endTime)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSlotMutation.mutate(slot.id)}
                      disabled={deleteSlotMutation.isPending}
                      data-testid={`button-delete-slot-${slot.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
