import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Calendar, TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Sesion, Alumno } from "@shared/schema";

interface TutorIncomeProps {
  tutorId: string;
  onBack: () => void;
}

interface SesionWithAlumno extends Sesion {
  alumno?: Alumno;
}

export default function TutorIncome({ tutorId, onBack }: TutorIncomeProps) {
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'week'>('all');

  const { data: allSesiones = [] } = useQuery<Sesion[]>({
    queryKey: ['/api/sesiones/tutor', tutorId],
  });

  const { data: alumnos = [] } = useQuery<Alumno[]>({
    queryKey: ['/api/alumnos'],
  });

  // Enrich sessions with student details
  const sesiones: SesionWithAlumno[] = allSesiones.map(sesion => ({
    ...sesion,
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
  const totalEarnings = filteredSesiones.reduce((sum, s) => sum + (s.subtotal || 0), 0);
  const totalSessions = filteredSesiones.length;
  const totalHours = filteredSesiones.reduce((sum, s) => sum + s.horas, 0);

  // Group by month
  const sessionsByMonth = filteredSesiones.reduce((acc, sesion) => {
    const date = new Date(sesion.createdAt!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
        earnings: 0,
        sessions: 0,
        hours: 0,
      };
    }
    
    acc[monthKey].earnings += sesion.subtotal || 0;
    acc[monthKey].sessions += 1;
    acc[monthKey].hours += sesion.horas;
    
    return acc;
  }, {} as Record<string, { month: string; earnings: number; sessions: number; hours: number }>);

  const monthlyData = Object.values(sessionsByMonth).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid="button-back-income"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Portal
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
            Mis Ingresos
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
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ganancias Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary" data-testid="total-earnings">
                    ${totalEarnings.toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs text-muted-foreground">MXN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clases Impartidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold" data-testid="total-sessions">
                    {totalSessions}
                  </p>
                  <p className="text-xs text-muted-foreground">Sesiones</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold" data-testid="total-hours">
                    {totalHours}
                  </p>
                  <p className="text-xs text-muted-foreground">Horas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Mensual</CardTitle>
            <CardDescription>
              Ingresos y sesiones agrupados por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay datos disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {monthlyData.map((data, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`month-${index}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium capitalize">{data.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.sessions} {data.sessions === 1 ? 'sesión' : 'sesiones'} • {data.hours}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        ${data.earnings.toLocaleString('es-MX')}
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
            <CardTitle>Historial de Clases</CardTitle>
            <CardDescription>
              Detalle de todas tus clases pagadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSesiones.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay clases registradas
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSesiones.map((sesion) => (
                  <div
                    key={sesion.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg"
                    data-testid={`session-${sesion.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
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
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">${sesion.subtotal?.toLocaleString('es-MX')}</p>
                      <p className="text-xs text-muted-foreground">Tu ganancia</p>
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
