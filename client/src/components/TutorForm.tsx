import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Calendar, DollarSign, MapPin } from "lucide-react";

interface TutorFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

export default function TutorForm({ onSubmit, onBack }: TutorFormProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    edad: "",
    email: "",
    password: "",
    telefono: "",
    materias: "",
    modalidad: "online",
    ubicacion: "",
    tarifa: "",
    disponibilidad: "",
    cv_url: "",
    bio: "",
    universidad: "",
    fotoPerfil: "",
    stripe_account_id: "",
    cal_link: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Registro de Tutor
          </h1>
          <p className="text-muted-foreground">
            Tu perfil será revisado por nuestro equipo. Al aprobarse, se publicará para que los alumnos puedan encontrarte.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos básicos de contacto</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: María López García"
                    value={formData.nombre}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    required
                    data-testid="input-nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad *</Label>
                  <Input
                    id="edad"
                    type="number"
                    placeholder="Ej: 27"
                    value={formData.edad}
                    onChange={(e) => handleChange("edad", e.target.value)}
                    required
                    data-testid="input-edad"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    minLength={8}
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    placeholder="+52 33 1234 5678"
                    value={formData.telefono}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                    required
                    data-testid="input-telefono"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="universidad">Egresado/a de</Label>
                  <Input
                    id="universidad"
                    placeholder="Ej: Universidad de Guadalajara"
                    value={formData.universidad}
                    onChange={(e) => handleChange("universidad", e.target.value)}
                    data-testid="input-universidad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fotoPerfil">Foto de Perfil (URL)</Label>
                  <Input
                    id="fotoPerfil"
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    value={formData.fotoPerfil}
                    onChange={(e) => handleChange("fotoPerfil", e.target.value)}
                    data-testid="input-foto-perfil"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Académica
              </CardTitle>
              <CardDescription>Materias y modalidad de enseñanza</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="materias">Materias que Impartes *</Label>
                <Input
                  id="materias"
                  placeholder="Ej: Matemáticas, Física, Química (separa por comas)"
                  value={formData.materias}
                  onChange={(e) => handleChange("materias", e.target.value)}
                  required
                  data-testid="input-materias"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modalidad">Modalidad *</Label>
                  <Select value={formData.modalidad} onValueChange={(val) => handleChange("modalidad", val)}>
                    <SelectTrigger id="modalidad" data-testid="select-modalidad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online (Zoom)</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ubicacion">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Ubicación {formData.modalidad !== 'online' && '*'}
                  </Label>
                  <Input
                    id="ubicacion"
                    placeholder="Ej: Guadalajara, Jalisco"
                    value={formData.ubicacion}
                    onChange={(e) => handleChange("ubicacion", e.target.value)}
                    required={formData.modalidad !== 'online'}
                    data-testid="input-ubicacion"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Descripción / Experiencia</Label>
                <Textarea
                  id="bio"
                  placeholder="Cuéntanos sobre tu experiencia como tutor y tu enfoque de enseñanza..."
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  data-testid="input-bio"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tarifa y Disponibilidad
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarifa">Tarifa por Hora (MXN) *</Label>
                  <Input
                    id="tarifa"
                    type="number"
                    placeholder="400"
                    value={formData.tarifa}
                    onChange={(e) => handleChange("tarifa", e.target.value)}
                    required
                    data-testid="input-tarifa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disponibilidad">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Disponibilidad *
                  </Label>
                  <Input
                    id="disponibilidad"
                    placeholder="Ej: Lun-Mie 16:00-20:00"
                    value={formData.disponibilidad}
                    onChange={(e) => handleChange("disponibilidad", e.target.value)}
                    required
                    data-testid="input-disponibilidad"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Documentos y Enlaces
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cv_url">Enlace a CV (Google Drive, Dropbox, etc.)</Label>
                <Input
                  id="cv_url"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.cv_url}
                  onChange={(e) => handleChange("cv_url", e.target.value)}
                  data-testid="input-cv-url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cal_link">Enlace de Cal.com (opcional)</Label>
                <Input
                  id="cal_link"
                  type="url"
                  placeholder="https://cal.com/usuario/tutoria-60min"
                  value={formData.cal_link}
                  onChange={(e) => handleChange("cal_link", e.target.value)}
                  data-testid="input-cal-link"
                />
                <p className="text-xs text-muted-foreground">
                  Si tienes Cal.com, los alumnos podrán agendar clases directamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe_account_id">Stripe Connect Account ID (opcional)</Label>
                <Input
                  id="stripe_account_id"
                  placeholder="acct_..."
                  value={formData.stripe_account_id}
                  onChange={(e) => handleChange("stripe_account_id", e.target.value)}
                  data-testid="input-stripe-id"
                />
                <p className="text-xs text-muted-foreground">
                  Se completa después del proceso de onboarding de Stripe
                </p>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full bg-primary hover:bg-primary text-primary-foreground"
            data-testid="button-submit"
          >
            Enviar a Revisión
          </Button>
        </form>
      </div>
    </div>
  );
}
