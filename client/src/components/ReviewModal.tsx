import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sesion } from "@shared/schema";

interface ReviewModalProps {
  sesion: Sesion;
  alumnoId: string;
  onClose: () => void;
}

export default function ReviewModal({ sesion, alumnoId, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Calificación requerida",
        description: "Por favor selecciona una calificación de estrellas",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/reviews", {
        tutorId: sesion.tutorId,
        alumnoId,
        calificacion: rating,
        comentario: comment,
      });

      await queryClient.invalidateQueries({ 
        queryKey: ["/api/reviews/tutor", sesion.tutorId] 
      });

      toast({
        title: "¡Reseña enviada!",
        description: "Gracias por compartir tu experiencia",
      });

      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la reseña. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent data-testid="dialog-review">
        <DialogHeader>
          <DialogTitle>Califica tu sesión</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con esta sesión de tutoría
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Calificación</label>
            <div className="flex gap-2" data-testid="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                  data-testid={`button-star-${star}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Comentario (opcional)
            </label>
            <Textarea
              id="comment"
              placeholder="Comparte tu experiencia con este tutor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              data-testid="textarea-comment"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="button-cancel-review"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              data-testid="button-submit-review"
            >
              {isSubmitting ? "Enviando..." : "Enviar Reseña"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
