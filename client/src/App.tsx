import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Landing from "@/components/Landing";
import TutorForm from "@/components/TutorForm";
import AlumnoForm from "@/components/AlumnoForm";
import AlumnoLogin from "@/components/AlumnoLogin";
import TutorLogin from "@/components/TutorLogin";
import AdminLogin from "@/components/AdminLogin";
import StudentPortal from "@/components/StudentPortal";
import AdminPanel from "@/components/AdminPanel";
import TutorPortal from "@/components/TutorPortal";
import PasswordReset from "@/components/PasswordReset";

function Router() {
  const { toast } = useToast();
  const [view, setView] = useState<'landing' | 'tutor-registro' | 'tutor-login' | 'tutor-portal' | 'alumno-registro' | 'alumno-login' | 'alumno' | 'admin-login' | 'admin' | 'tutor-reset' | 'alumno-reset' | null>('landing');
  const [alumnoRegistrado, setAlumnoRegistrado] = useState<any>(null);
  const [tutorActual, setTutorActual] = useState<any>(null);

  useEffect(() => {
    const savedAlumno = localStorage.getItem('edukt_alumno');
    if (savedAlumno) {
      setAlumnoRegistrado(JSON.parse(savedAlumno));
    }
  }, []);
  
  const { data: approvedTutors = [], refetch: refetchApproved } = useQuery<any[]>({
    queryKey: ['/api/tutors/approved'],
    enabled: view === 'alumno',
  });

  const { data: pendingTutors = [], refetch: refetchPending } = useQuery<any[]>({
    queryKey: ['/api/tutors/pending'],
    enabled: view === 'admin',
  });

  const { data: rejectedTutors = [], refetch: refetchRejected } = useQuery<any[]>({
    queryKey: ['/api/tutors/rejected'],
    enabled: view === 'admin',
  });

  const createTutorMutation = useMutation({
    mutationFn: async (tutorData: any) => {
      const response = await fetch('/api/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutorData),
      });
      if (!response.ok) {
        throw new Error('Failed to create tutor');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil enviado",
        description: "Tu perfil fue enviado para revisión. Te notificaremos al aprobarlo.",
      });
      setView('landing');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveTutorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tutors/${id}/approve`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to approve tutor');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tutors/approved'] });
      toast({
        title: "Tutor aprobado",
        description: `${data.nombre} ha sido aprobado y ahora está visible para alumnos.`,
      });
    },
  });

  const rejectTutorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tutors/${id}/reject`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to reject tutor');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tutors/rejected'] });
      toast({
        title: "Tutor rechazado",
        description: `El perfil de ${data.nombre} ha sido rechazado.`,
        variant: "destructive",
      });
    },
  });

  const createAlumnoMutation = useMutation({
    mutationFn: async (alumnoData: any) => {
      const response = await fetch('/api/alumnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alumnoData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create alumno');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setAlumnoRegistrado(data);
      localStorage.setItem('edukt_alumno', JSON.stringify(data));
      toast({
        title: "¡Registro exitoso!",
        description: `Bienvenido/a ${data.nombre}. Ahora puedes explorar nuestros tutores.`,
      });
      setView('alumno');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitTutor = (tutor: any) => {
    createTutorMutation.mutate(tutor);
  };

  const submitAlumno = (alumno: any) => {
    createAlumnoMutation.mutate(alumno);
  };

  const handleSelectRole = (role: 'alumno' | 'tutor' | 'admin', action: 'register' | 'login') => {
    if (role === 'alumno') {
      if (action === 'register') {
        setView('alumno-registro');
      } else {
        setView('alumno-login');
      }
    } else if (role === 'tutor') {
      if (action === 'register') {
        setView('tutor-registro');
      } else {
        setView('tutor-login');
      }
    } else if (role === 'admin') {
      setView('admin-login');
    }
  };

  const handleAlumnoLoginSuccess = (alumno: any) => {
    setAlumnoRegistrado(alumno);
    localStorage.setItem('edukt_alumno', JSON.stringify(alumno));
    setView('alumno');
  };

  const handleTutorLoginSuccess = (tutor: any) => {
    setTutorActual(tutor);
    localStorage.setItem('edukt_tutor', JSON.stringify(tutor));
    setView('tutor-portal');
  };

  const handleAdminLoginSuccess = () => {
    setView('admin');
  };

  const approveTutor = (idx: number) => {
    const tutor = pendingTutors[idx];
    if (tutor?.id) {
      approveTutorMutation.mutate(tutor.id);
    }
  };

  const rejectTutor = (idx: number) => {
    const tutor = pendingTutors[idx];
    if (tutor?.id) {
      rejectTutorMutation.mutate(tutor.id);
    }
  };

  const SERVICE_FEE_RATE = 0.08;
  const startCheckout = async ({ tutor, hours = 1 }: { tutor: any; hours: number }) => {
    const subtotal = Number(tutor.tarifa) * hours;
    const fee = Math.round(subtotal * SERVICE_FEE_RATE);
    const total = subtotal + fee;
    
    // TODO: Implement Stripe checkout
    toast({
      title: "Pago procesado (Demo)",
      description: `Total: $${total.toLocaleString('es-MX')} MXN (Tutor: $${subtotal.toLocaleString('es-MX')} + Tarifa: $${fee.toLocaleString('es-MX')})`,
    });
  };

  return (
    <Switch>
      <Route path="/">
        {view === 'landing' && <Landing onSelectRole={handleSelectRole} />}
        
        {view === 'tutor-registro' && <TutorForm onSubmit={submitTutor} onBack={() => setView('landing')} />}
        {view === 'tutor-login' && <TutorLogin onSuccess={handleTutorLoginSuccess} onBack={() => setView('landing')} onForgotPassword={() => setView('tutor-reset')} />}
        {view === 'tutor-reset' && <PasswordReset userType="tutor" onBack={() => setView('tutor-login')} />}
        {view === 'tutor-portal' && <TutorPortal onBack={() => {
          setView('landing');
          setTutorActual(null);
          localStorage.removeItem('edukt_tutor');
        }} />}
        
        {view === 'alumno-registro' && (
          <AlumnoForm 
            onSubmit={submitAlumno} 
            onBack={() => setView('landing')} 
          />
        )}
        {view === 'alumno-login' && <AlumnoLogin onSuccess={handleAlumnoLoginSuccess} onBack={() => setView('landing')} onForgotPassword={() => setView('alumno-reset')} />}
        {view === 'alumno-reset' && <PasswordReset userType="alumno" onBack={() => setView('alumno-login')} />}
        {view === 'alumno' && (
          <StudentPortal 
            tutors={approvedTutors} 
            onBack={() => {
              setView('landing');
              setAlumnoRegistrado(null);
              localStorage.removeItem('edukt_alumno');
            }} 
            onCheckout={startCheckout}
            alumno={alumnoRegistrado}
          />
        )}
        
        {view === 'admin-login' && <AdminLogin onSuccess={handleAdminLoginSuccess} onBack={() => setView('landing')} />}
        {view === 'admin' && (
          <AdminPanel
            pending={pendingTutors}
            approved={approvedTutors}
            rejected={rejectedTutors}
            onApprove={approveTutor}
            onReject={rejectTutor}
            onBack={() => setView('landing')}
          />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
