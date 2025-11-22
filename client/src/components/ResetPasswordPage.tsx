import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResetPasswordPageProps {
  token: string;
  userType: "tutor" | "alumno";
  onSuccess: () => void;
}

export default function ResetPasswordPage({ token, userType, onSuccess }: ResetPasswordPageProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"reset" | "success" | "error">("reset");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
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
        setErrorMessage(error.error || "No se pudo resetear la contraseña");
        setStep("error");
        return;
      }

      toast({
        title: "¡Éxito!",
        description: "Tu contraseña ha sido reseteada",
      });
      setStep("success");
      setTimeout(onSuccess, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error desconocido");
      setStep("error");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
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
            </CardContent>
          </Card>
        ) : step === "error" ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
              <Button 
                onClick={onSuccess}
                className="w-full"
                data-testid="button-back-to-login"
              >
                Volver a Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Contraseña</CardTitle>
              <CardDescription>
                Ingresa tu nueva contraseña
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar Contraseña</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reseteando...
                    </>
                  ) : (
                    "Resetear Contraseña"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
