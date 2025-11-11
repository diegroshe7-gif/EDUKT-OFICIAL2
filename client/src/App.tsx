import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Landing from "@/components/Landing";
import TutorForm from "@/components/TutorForm";
import StudentPortal from "@/components/StudentPortal";
import AdminPanel from "@/components/AdminPanel";
import avatarFemale from '@assets/generated_images/Female_tutor_profile_photo_2eb1fc5f.png';

function Router() {
  const { toast } = useToast();
  const [view, setView] = useState<'landing' | 'tutor' | 'alumno' | 'admin' | null>('landing');
  
  // todo: remove mock functionality - Mock data for prototype
  const [approvedTutors, setApprovedTutors] = useState([
    {
      id: '1',
      nombre: 'María López',
      edad: 27,
      email: 'maria@example.com',
      telefono: '+52 33 1234 5678',
      materias: 'Matemáticas, Física',
      modalidad: 'mixta',
      ubicacion: 'Guadalajara',
      tarifa: 400,
      disponibilidad: 'Lun-Mie 16:00-20:00',
      cvUrl: 'https://example.com/cv-maria.pdf',
      stripeAccountId: 'acct_1XYZCONNECT',
      calLink: 'https://cal.com/marialopez/tutoria-60min',
      bio: 'Ingeniera con 5 años de experiencia enseñando matemáticas y física.',
      avatarUrl: avatarFemale,
      status: 'aprobado',
    }
  ]);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [rejectedTutors, setRejectedTutors] = useState<any[]>([]);

  const SERVICE_FEE_RATE = 0.15;

  const submitTutor = (tutor: any) => {
    setPendingTutors((p) => [...p, { ...tutor, status: 'pendiente' }]);
    toast({
      title: "Perfil enviado",
      description: "Tu perfil fue enviado para revisión. Te notificaremos al aprobarlo.",
    });
    setView('landing');
  };

  const approveTutor = (idx: number) => {
    setPendingTutors((p) => {
      const t = p[idx];
      const rest = p.filter((_, i) => i !== idx);
      setApprovedTutors((a) => [...a, { ...t, status: 'aprobado' }]);
      toast({
        title: "Tutor aprobado",
        description: `${t.nombre} ha sido aprobado y ahora está visible para alumnos.`,
      });
      return rest;
    });
  };

  const rejectTutor = (idx: number) => {
    setPendingTutors((p) => {
      const t = p[idx];
      const rest = p.filter((_, i) => i !== idx);
      setRejectedTutors((r) => [...r, { ...t, status: 'rechazado' }]);
      toast({
        title: "Tutor rechazado",
        description: `El perfil de ${t.nombre} ha sido rechazado.`,
        variant: "destructive",
      });
      return rest;
    });
  };

  const startCheckout = async ({ tutor, hours = 1 }: { tutor: any; hours: number }) => {
    const subtotal = Number(tutor.tarifa) * hours;
    const fee = Math.round(subtotal * SERVICE_FEE_RATE);
    const total = subtotal + fee;
    
    // todo: remove mock functionality - In production, call backend /api/checkout
    toast({
      title: "Pago procesado (Demo)",
      description: `Total: $${total.toLocaleString('es-MX')} MXN (Tutor: $${subtotal.toLocaleString('es-MX')} + Tarifa: $${fee.toLocaleString('es-MX')})`,
    });
  };

  return (
    <Switch>
      <Route path="/">
        {view === 'landing' && <Landing onSelectRole={setView} />}
        {view === 'tutor' && <TutorForm onSubmit={submitTutor} onBack={() => setView('landing')} />}
        {view === 'alumno' && (
          <StudentPortal 
            tutors={approvedTutors} 
            onBack={() => setView('landing')} 
            onCheckout={startCheckout}
          />
        )}
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
