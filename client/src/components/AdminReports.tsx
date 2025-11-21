import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Sesion, Tutor, Alumno } from "@shared/schema";

interface AdminReportsProps {
  onBack: () => void;
}

interface SesionWithDetails extends Sesion {
  tutor?: Tutor;
  alumno?: Alumno;
}

export default function AdminReports({ onBack }: AdminReportsProps) {
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'week'>('all');

  const { data: tutors = [] } = useQuery<Tutor[]>({
    queryKey: ['/api/tutors/approved'],
  });

  const { data: alumnos = [] } = useQuery<Alumno[]>({
    queryKey: ['/api/alumnos'],
  });

  const { data: allSesiones = [] } = useQuery<Sesion[]>({
    queryKey: ['/api/sesiones'],
  });

  // Enrich sessions with tutor and student details
  const sesiones: SesionWithDetails[] = allSesiones.map(sesion => ({
    ...sesion,
    tutor: tutors.find(t => t.id === sesion.tutorId),
    alumno: alumnos.find(a => a.id === sesion.alumnoId),
  }));

  // Filter by date
  const filteredSesiones = sesiones.filter(sesion => {
    if (dateFilter === 'all') return true;
    
    const sesionDate = new Date(sesion.createdAt!);
    const now = new Date();
    
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return sesionDate >= weekAgo;
    }
    
    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return sesionDate >= monthAgo;
    }
    
    return true;
  });

  // Calculate totals
  const totalRevenue = filteredSesiones.reduce((sum, s) => sum + (s.total || 0), 0);
  const platformRevenue = filteredSesiones.reduce((sum, s) => sum + (s.platformFee || 0), 0);
  const tutorRevenue = filteredSesiones.reduce((sum, s) => sum + (s.subtotal || 0), 0);
  const totalSessions = filteredSesiones.length;

  // Group by tutor
  const tutorEarnings = filteredSesiones.reduce((acc, sesion) => {
    if (!sesion.tutor) return acc;
    
    if (!acc[sesion.tutorId]) {
      acc[sesion.tutorId] = {
        tutor: sesion.tutor,
        totalEarnings: 0,
        sessionCount: 0,
      };
    }
    
    acc[sesion.tutorId].totalEarnings += sesion.subtotal || 0;
    acc[sesion.tutorId].sessionCount += 1;
    
    return acc;
  }, {} as Record<string, { tutor: Tutor; totalEarnings: number; sessionCount: number }>);

  const tutorEarningsList = Object.values(tutorEarnings).sort((a, b) => b.totalEarnings - a.totalEarnings);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
            Reportes Administrativos
          </h1>
          <div className="w-24" />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setDateFilter('all')}
            size="sm"
            data-testid="filter-all"
          >
            Todo
          </Button>
          <Button
            variant={dateFilter === 'month' ? 'default' : 'outline'}
            onClick={() => setDateFilter('month')}
            size="sm"
            data-testid="filter-month"
          >
            Último Mes
          </Button>
          <Button
            variant={dateFilter === 'week' ? 'default' : 'outline'}
            onClick={() => setDateFilter('week')}
            size="sm"
            data-testid="filter-week"
          >
            Última Semana
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold" data-testid="total-revenue">
                    ${totalRevenue.toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs text-muted-foreground">MXN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos Plataforma (8%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-accent" data-testid="platform-revenue">
                    ${platformRevenue.toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs text-muted-foreground">MXN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pagos a Tutores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold" data-testid="tutor-revenue">
                    ${tutorRevenue.toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs text-muted-foreground">MXN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sesiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold" data-testid="total-sessions">
                    {totalSessions}
                  </p>
                  <p className="text-xs text-muted-foreground">Clases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tutor earnings */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Tutor</CardTitle>
            <CardDescription>
              Ganancias de cada tutor en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tutorEarningsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay datos disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {tutorEarningsList.map(({ tutor, totalEarnings, sessionCount }) => (
                  <div
                    key={tutor.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`tutor-earnings-${tutor.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{tutor.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {sessionCount} {sessionCount === 1 ? 'sesión' : 'sesiones'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        ${totalEarnings.toLocaleString('es-MX')}
                      </p>
                      <p className="text-xs text-muted-foreground">MXN</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session history */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Transacciones</CardTitle>
            <CardDescription>
              Todas las clases agendadas y pagos procesados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSesiones.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay transacciones registradas
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSesiones.map((sesion) => (
                  <div
                    key={sesion.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg"
                    data-testid={`transaction-${sesion.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{sesion.tutor?.nombre}</p>
                        <span className="text-muted-foreground">→</span>
                        <p className="text-sm text-muted-foreground">
                          {sesion.alumno?.nombre} {sesion.alumno?.apellido}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{sesion.horas}h clase</span>
                        <span>•</span>
                        <span>{new Date(sesion.createdAt!).toLocaleDateString('es-MX')}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sesion.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-lg">${sesion.total?.toLocaleString('es-MX')}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Tutor: ${sesion.subtotal?.toLocaleString('es-MX')}</p>
                        <p className="text-accent">Plataforma: ${sesion.platformFee?.toLocaleString('es-MX')}</p>
                      </div>
                    </div>
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
