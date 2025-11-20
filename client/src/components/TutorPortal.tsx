import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar } from "lucide-react";
import TeacherCalendar from "@/pages/teacher-calendar";
import { useQuery } from "@tanstack/react-query";

interface TutorPortalProps {
  onBack: () => void;
}

export default function TutorPortal({ onBack }: TutorPortalProps) {
  const [email, setEmail] = useState("");
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const { data: tutors = [] } = useQuery<any[]>({
    queryKey: ['/api/tutors/approved'],
  });

  const handleLogin = async () => {
    const tutor = tutors.find(t => t.email.toLowerCase() === email.toLowerCase());
    if (tutor) {
      setTutorId(tutor.id);
      localStorage.setItem('edukt_tutor', JSON.stringify(tutor));
      setShowCalendar(true);
    } else {
      alert('Tutor no encontrado o no aprobado');
    }
  };

  if (showCalendar && tutorId) {
    return <TeacherCalendar tutorId={tutorId} onBack={() => {
      setShowCalendar(false);
      setTutorId(null);
      localStorage.removeItem('edukt_tutor');
    }} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Portal de Tutor
          </CardTitle>
          <CardDescription>
            Ingresa tu email para acceder a tu calendario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              data-testid="input-email"
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleLogin}
            data-testid="button-login"
          >
            Ingresar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
