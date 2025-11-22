import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetProps {
  userType: "tutor" | "alumno";
  onBack: () => void;
}

export default function PasswordReset({ userType, onBack }: PasswordResetProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "token" | "new-password" | "success">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "No se pudo enviar el email");
      }

      toast({
        title: "Email enviado",
        description: "Revisa tu email para el enlace de reseteo",
      });
      setStep("token");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, userType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "No se pudo resetear la contraseña");
      }

      toast({
        title: "¡Éxito!",
        description: "Tu contraseña ha sido reseteada",
      });
      setStep("success");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        {step === "success" ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold mb-2">¡Contraseña reseteada!</h2>
                <p className="text-muted-foreground">
                  Ahora puedes usar tu nueva contraseña para iniciar sesión
                </p>
              </div>
              <Button 
                onClick={onBack}
                className="w-full"
                data-testid="button-go-to-login"
              >
                Ir a Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Resetear Contraseña</CardTitle>
              <CardDescription>
                Ingresa tu email y te enviaremos un enlace para resetear tu contraseña
              </CardDescription>
            </CardHeader>

            <CardContent>
              {step === "email" && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full gap-2"
                    data-testid="button-send-email"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar Email
                  </Button>
                </form>
              )}

              {step === "token" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token">Código de Reseteo</Label>
                    <Input
                      id="token"
                      placeholder="Código recibido en tu email"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      data-testid="input-token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirma tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full gap-2"
                    data-testid="button-reset-password"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Resetear Contraseña
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
