import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const stripePublicKey = import.meta.env.VITE_TESTING_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey
  ? loadStripe(stripePublicKey)
  : null;

interface CheckoutFormProps {
  tutorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ tutorName, onSuccess, onCancel }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required',
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Error en el pago",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Pago exitoso!",
        description: `Tu clase con ${tutorName} ha sido reservada.`,
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-3">
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-payment"
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-accent hover:bg-accent text-accent-foreground"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            'Confirmar Pago'
          )}
        </Button>
      </div>
    </form>
  );
};

interface CheckoutProps {
  tutor: any;
  hours: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Checkout({ tutor, hours, onSuccess, onCancel }: CheckoutProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const publicKey = import.meta.env.VITE_TESTING_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!publicKey) {
      setError("Stripe no está configurado. Por favor contacta al administrador.");
      return;
    }

    if (!tutor.id) {
      setError("Error: ID de tutor inválido.");
      return;
    }

    apiRequest("POST", "/api/create-payment-intent", { 
      tutorId: tutor.id,
      hours,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setAmount(data.amount);
        }
      })
      .catch((err) => {
        setError("Error al inicializar el pago. Por favor intenta de nuevo.");
        console.error(err);
      });
  }, [tutor.id, hours]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline" data-testid="button-close-error">
            Cerrar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Preparando pago...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stripePromise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error de configuración</CardTitle>
          <CardDescription>
            Stripe no está configurado correctamente. Por favor contacta al administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline">
            Cerrar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pago de Tutoría</CardTitle>
        <CardDescription>
          {tutor.nombre} • {hours} hora{hours > 1 ? 's' : ''} • ${amount.toLocaleString('es-MX')} MXN
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            tutorName={tutor.nombre}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
