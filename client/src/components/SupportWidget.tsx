import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    userType: "otro",
    asunto: "",
    mensaje: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre || !formData.email || !formData.asunto || !formData.mensaje) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (formData.mensaje.length < 10) {
      toast({
        title: "Mensaje muy corto",
        description: "El mensaje debe tener al menos 10 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo enviar tu mensaje");
      }
      
      setIsSuccess(true);
      setFormData({
        nombre: "",
        email: "",
        userType: "otro",
        asunto: "",
        mensaje: "",
      });

      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo enviar tu mensaje. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg h-14 px-6 gap-2 z-50"
        size="lg"
        data-testid="button-help-widget"
      >
        <HelpCircle className="h-5 w-5" />
        Necesito ayuda
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-support">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">¡Mensaje enviado!</h3>
              <p className="text-muted-foreground">
                Gracias por comunicarte. Se te enviará una respuesta lo antes posible.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>¿Necesitas ayuda?</DialogTitle>
                <DialogDescription>
                  Envíanos tu consulta o problema y nuestro equipo se pondrá en contacto contigo pronto.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    placeholder="Tu nombre completo"
                    required
                    data-testid="input-support-nombre"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="tu@email.com"
                    required
                    data-testid="input-support-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType">Tipo de usuario</Label>
                  <Select
                    value={formData.userType}
                    onValueChange={(value) => handleChange("userType", value)}
                  >
                    <SelectTrigger data-testid="select-support-usertype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutor">Tutor</SelectItem>
                      <SelectItem value="alumno">Estudiante</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asunto">Asunto</Label>
                  <Input
                    id="asunto"
                    value={formData.asunto}
                    onChange={(e) => handleChange("asunto", e.target.value)}
                    placeholder="Breve descripción del problema"
                    required
                    data-testid="input-support-asunto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensaje">Mensaje</Label>
                  <Textarea
                    id="mensaje"
                    value={formData.mensaje}
                    onChange={(e) => handleChange("mensaje", e.target.value)}
                    placeholder="Describe tu problema o consulta en detalle..."
                    rows={5}
                    required
                    data-testid="textarea-support-mensaje"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    data-testid="button-support-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="button-support-submit"
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
