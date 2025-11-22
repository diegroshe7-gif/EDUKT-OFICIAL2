import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, XCircle, ExternalLink, User, CreditCard, MapPin, FileCheck } from "lucide-react";
import { useState } from "react";
import type { Tutor } from "@shared/schema";

interface TutorDetailModalProps {
  tutor: Tutor | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
}

export default function TutorDetailModal({ 
  tutor, 
  onClose, 
  onApprove, 
  onReject, 
  isLoading = false 
}: TutorDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!tutor) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      onApprove(tutor.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      onReject(tutor.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = tutor.nombre?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  const materias = tutor.materias?.split(',').map((m: string) => m.trim()) || [];
  const birthDate = tutor.fechaNacimiento ? new Date(tutor.fechaNacimiento) : null;
  const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <Dialog open={!!tutor} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-tutor-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalles del Tutor</DialogTitle>
          <DialogDescription>
            Revisa toda la información antes de aprobar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" data-testid="tab-personal">
              Perfil
            </TabsTrigger>
            <TabsTrigger value="kyc" data-testid="tab-kyc">
              KYC
            </TabsTrigger>
            <TabsTrigger value="banking" data-testid="tab-banking">
              Bancaria
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              Documentos
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar and Basic Info */}
                <div className="flex gap-6 items-start">
                  <Avatar className="h-24 w-24">
                    {tutor.fotoPerfil && (
                      <AvatarImage 
                        src={`/objects/${tutor.fotoPerfil}`} 
                        alt={tutor.nombre}
                      />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre Completo</p>
                      <p className="font-semibold text-lg">{tutor.nombre}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Edad</p>
                        <p className="font-medium">{tutor.edad} años</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{tutor.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Info */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Información Profesional</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{tutor.telefono}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Universidad</p>
                      <p className="font-medium">{tutor.universidad || 'No especificada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tarifa por Hora</p>
                      <p className="font-medium text-primary">${tutor.tarifa?.toLocaleString('es-MX')} MXN</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modalidad</p>
                      <p className="font-medium capitalize">{tutor.modalidad}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Ubicación</p>
                    <p className="font-medium">{tutor.ubicacion || 'No especificada'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Materias</p>
                    <div className="flex flex-wrap gap-2">
                      {materias.map((materia: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{materia}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{tutor.bio || 'No proporcionada'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Disponibilidad</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{tutor.disponibilidad}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información de Verificación (KYC)</CardTitle>
                <CardDescription>Datos requeridos para crear cuenta Stripe Connect</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="font-medium">
                      {birthDate ? birthDate.toLocaleDateString('es-MX') : 'No proporcionada'}
                    </p>
                    {age !== null && (
                      <p className="text-xs text-muted-foreground">{age} años (verificado)</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RFC</p>
                    <p className="font-medium font-mono">{tutor.rfc || 'No proporcionado'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Domicilio</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium">{tutor.direccion || 'No proporcionada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ciudad</p>
                      <p className="font-medium">{tutor.ciudad || 'No proporcionada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <p className="font-medium">{tutor.estado || 'No proporcionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Código Postal</p>
                      <p className="font-medium">{tutor.codigoPostal || 'No proporcionado'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banking Tab */}
          <TabsContent value="banking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Bancaria</CardTitle>
                <CardDescription>Para transferencias automáticas en Stripe Connect</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 bg-muted p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-900">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre del Banco</p>
                    <p className="font-semibold text-lg">{tutor.banco || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CLABE (18 dígitos)</p>
                    <p className="font-mono font-semibold tracking-wider">{tutor.clabe || 'No proporcionada'}</p>
                  </div>
                  {tutor.stripeAccountId && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Cuenta Stripe Connect</p>
                      <p className="font-mono text-xs break-all text-green-600 dark:text-green-400">
                        {tutor.stripeAccountId}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <p className="mb-2">✓ Información validada para crear Stripe Connect Custom Account</p>
                  <p>Las transferencias se harán automáticamente al 92% de cada pago</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>Archivos cargados por el tutor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CV */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">Currículum Vitae</p>
                      <p className="text-sm text-muted-foreground">
                        {tutor.cvUrl ? 'Cargado' : 'No proporcionado'}
                      </p>
                    </div>
                  </div>
                  {tutor.cvUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/objects/${tutor.cvUrl}`, '_blank')}
                      className="gap-2"
                      data-testid="button-view-cv"
                    >
                      Ver CV
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Photo */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">Foto de Perfil</p>
                      <p className="text-sm text-muted-foreground">
                        {tutor.fotoPerfil ? 'Cargada' : 'No proporcionada'}
                      </p>
                    </div>
                  </div>
                  {tutor.fotoPerfil && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/objects/${tutor.fotoPerfil}`, '_blank')}
                      className="gap-2"
                      data-testid="button-view-photo"
                    >
                      Ver Foto
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="button-cancel-detail"
          >
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting}
            className="gap-2"
            data-testid="button-reject-detail"
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="gap-2 bg-accent hover:bg-accent text-accent-foreground"
            data-testid="button-approve-detail"
          >
            <CheckCircle className="h-4 w-4" />
            {isSubmitting ? "Aprobando..." : "Aprobar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
