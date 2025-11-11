import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, Users, Shield } from "lucide-react";
import logoUrl from '@assets/generated_images/EDUKT_platform_logo_256b6797.png';

interface LandingProps {
  onSelectRole: (role: 'alumno' | 'tutor' | 'admin') => void;
}

export default function Landing({ onSelectRole }: LandingProps) {
  const roles = [
    {
      id: 'alumno' as const,
      title: 'Soy Estudiante',
      description: 'Encuentra tutores calificados para tus clases',
      icon: GraduationCap,
      variant: 'default' as const,
    },
    {
      id: 'tutor' as const,
      title: 'Quiero Enseñar',
      description: 'Comparte tu conocimiento y genera ingresos',
      icon: Users,
      variant: 'outline' as const,
    },
    {
      id: 'admin' as const,
      title: 'Administrador',
      description: 'Gestiona tutores y verifica perfiles',
      icon: Shield,
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-5xl w-full space-y-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <img 
            src={logoUrl}
            alt="EDUKT Logo" 
            className="h-24 w-auto mx-auto"
            data-testid="img-logo"
          />
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span className="text-primary">EDU</span>
              <span className="text-accent">KT</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Portal de tutorías por hora. Clases online en Zoom o presenciales.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <Card 
                  className="p-8 hover-elevate cursor-pointer transition-all h-full"
                  onClick={() => onSelectRole(role.id)}
                  data-testid={`card-role-${role.id}`}
                >
                  <div className="space-y-4">
                    <div className={`inline-flex p-4 rounded-xl ${
                      role.id === 'alumno' ? 'bg-primary/10' : 
                      role.id === 'admin' ? 'bg-accent/10' : 
                      'bg-secondary'
                    }`}>
                      <Icon className={`h-8 w-8 ${
                        role.id === 'alumno' ? 'text-primary' : 
                        role.id === 'admin' ? 'text-accent' : 
                        'text-secondary-foreground'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{role.title}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Button 
                      variant={role.variant}
                      className={`w-full ${role.id === 'admin' ? 'bg-accent hover:bg-accent text-accent-foreground' : ''}`}
                      data-testid={`button-select-${role.id}`}
                    >
                      Continuar
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
