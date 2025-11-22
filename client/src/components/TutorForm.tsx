import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Calendar, DollarSign, MapPin, CreditCard, IdCard, Image, CheckCircle } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { apiRequest } from "@/lib/queryClient";

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
    clabe: "",
    banco: "",
    rfc: "",
    fechaNacimiento: "",
    direccion: "",
    ciudad: "",
    estado: "",
    codigoPostal: "",
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCV, setIsUploadingCV] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const [currentPhotoPath, setCurrentPhotoPath] = useState<string | null>(null);
  const [currentCVPath, setCurrentCVPath] = useState<string | null>(null);

  const handlePhotoUpload = async () => {
    const response = await apiRequest("POST", "/api/objects/upload") as unknown as { 
      uploadURL: string;
      objectPath: string;
    };
    // Store the object path for use after upload completes
    setCurrentPhotoPath(response.objectPath);
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handlePhotoComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && currentPhotoPath) {
      // Use the object path from the server response
      setFormData(prev => ({ ...prev, fotoPerfil: currentPhotoPath }));
    }
  };

  const handleCVUpload = async () => {
    const response = await apiRequest("POST", "/api/objects/upload") as unknown as { 
      uploadURL: string;
      objectPath: string;
    };
    // Store the object path for use after upload completes
    setCurrentCVPath(response.objectPath);
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleCVComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && currentCVPath) {
      // Use the object path from the server response
      setFormData(prev => ({ ...prev, cv_url: currentCVPath }));
    }
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
                  <Label>
                    <Image className="h-4 w-4 inline mr-1" />
                    Foto de Perfil
                  </Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    allowedFileTypes={['image/*']}
                    onGetUploadParameters={handlePhotoUpload}
                    onComplete={handlePhotoComplete}
                    buttonVariant="outline"
                    buttonClassName="w-full"
                  >
                    {formData.fotoPerfil ? (
                      <div>
                        <p className="text-sm font-medium text-green-600">
                          ✓ Foto cargada - Click o arrastra para cambiar
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">
                          Arrastra tu foto aquí o haz click
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG hasta 5MB
                        </p>
                      </div>
                    )}
                  </ObjectUploader>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                Información para Verificación
              </CardTitle>
              <CardDescription>
                Requerido por Stripe para procesar pagos legalmente en México
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={(e) => handleChange("fechaNacimiento", e.target.value)}
                  required
                  data-testid="input-fecha-nacimiento"
                />
                <p className="text-xs text-muted-foreground">
                  Debes ser mayor de 18 años
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección Completa *</Label>
                <Input
                  id="direccion"
                  placeholder="Ej: Calle Reforma #123, Col. Centro"
                  value={formData.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                  required
                  data-testid="input-direccion"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad *</Label>
                  <Input
                    id="ciudad"
                    placeholder="Ej: Guadalajara"
                    value={formData.ciudad}
                    onChange={(e) => handleChange("ciudad", e.target.value)}
                    required
                    data-testid="input-ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Input
                    id="estado"
                    placeholder="Ej: Jalisco"
                    value={formData.estado}
                    onChange={(e) => handleChange("estado", e.target.value)}
                    required
                    data-testid="input-estado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPostal">Código Postal *</Label>
                  <Input
                    id="codigoPostal"
                    placeholder="12345 (5 dígitos)"
                    value={formData.codigoPostal}
                    onChange={(e) => handleChange("codigoPostal", e.target.value)}
                    maxLength={5}
                    pattern="\d{5}"
                    required
                    data-testid="input-codigo-postal"
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
                      <SelectItem value="online">Online</SelectItem>
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
                <CreditCard className="h-5 w-5" />
                Información Bancaria
              </CardTitle>
              <CardDescription>
                Datos necesarios para transferir tus ganancias (92% de cada clase)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="clabe">CLABE Interbancaria *</Label>
                <Input
                  id="clabe"
                  placeholder="123456789012345678 (18 dígitos)"
                  value={formData.clabe}
                  onChange={(e) => handleChange("clabe", e.target.value)}
                  maxLength={18}
                  pattern="\d{18}"
                  required
                  data-testid="input-clabe"
                />
                <p className="text-xs text-muted-foreground">
                  Puedes encontrar tu CLABE en tu app de banco o estado de cuenta
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banco">Banco *</Label>
                  <Input
                    id="banco"
                    placeholder="Ej: BBVA, Santander, Banorte"
                    value={formData.banco}
                    onChange={(e) => handleChange("banco", e.target.value)}
                    required
                    data-testid="input-banco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC *</Label>
                  <Input
                    id="rfc"
                    placeholder="ABCD123456XYZ (12 o 13 caracteres)"
                    value={formData.rfc}
                    onChange={(e) => handleChange("rfc", e.target.value.toUpperCase())}
                    maxLength={13}
                    pattern="[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}"
                    required
                    data-testid="input-rfc"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Documentos
              </CardTitle>
              <CardDescription>
                Sube tu CV o documentos que respalden tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label>
                  <FileText className="h-4 w-4 inline mr-1" />
                  Currículum Vitae (Opcional)
                </Label>
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  allowedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                  onGetUploadParameters={handleCVUpload}
                  onComplete={handleCVComplete}
                  buttonVariant="outline"
                  buttonClassName="w-full"
                >
                  {formData.cv_url ? (
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        ✓ Documento cargado - Click o arrastra para cambiar
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">
                        Arrastra tu CV aquí o haz click
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Word hasta 10MB
                      </p>
                    </div>
                  )}
                </ObjectUploader>
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
