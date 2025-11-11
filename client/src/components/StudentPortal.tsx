import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter } from "lucide-react";
import TutorCard from "./TutorCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StudentPortalProps {
  tutors: any[];
  onBack: () => void;
  onCheckout?: (params: { tutor: any; hours: number }) => void;
}

export default function StudentPortal({ tutors, onBack, onCheckout }: StudentPortalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("all");
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [hours, setHours] = useState(1);

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = tutor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutor.materias.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModalidad = modalidadFilter === "all" || tutor.modalidad === modalidadFilter;
    return matchesSearch && matchesModalidad;
  });

  const handleSchedule = (tutor: any) => {
    setSelectedTutor(tutor);
    setShowCheckoutDialog(true);
  };

  const handleConfirmCheckout = () => {
    if (selectedTutor && onCheckout) {
      onCheckout({ tutor: selectedTutor, hours });
      setShowCheckoutDialog(false);
      setSelectedTutor(null);
      setHours(1);
    }
  };

  const SERVICE_FEE_RATE = 0.15;
  const subtotal = selectedTutor ? Number(selectedTutor.tarifa) * hours : 0;
  const fee = Math.round(subtotal * SERVICE_FEE_RATE);
  const total = subtotal + fee;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
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
              Encuentra tu Tutor
            </h1>
            <div className="w-[100px]" />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o materia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={modalidadFilter} onValueChange={setModalidadFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-modalidad">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las modalidades</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="mixta">Mixta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredTutors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No se encontraron tutores con los filtros seleccionados
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor, index) => (
              <TutorCard
                key={index}
                tutor={tutor}
                onSchedule={handleSchedule}
                onViewProfile={(t) => console.log('View profile:', t)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Agendar Clase con {selectedTutor?.nombre}</DialogTitle>
            <DialogDescription>
              Selecciona la cantidad de horas y confirma el pago
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Número de horas</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 1)}
                data-testid="input-hours"
              />
            </div>

            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Tarifa del tutor ({hours}h)</span>
                <span className="font-semibold">${subtotal.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tarifa de servicio (15%)</span>
                <span>${fee.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary" data-testid="text-total">${total.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmCheckout}
              className="bg-accent hover:bg-accent text-accent-foreground"
              data-testid="button-confirm-payment"
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
