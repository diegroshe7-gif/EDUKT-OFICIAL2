import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Tutor routes
  app.post("/api/tutors", async (req, res) => {
    try {
      const validatedData = insertTutorSchema.parse(req.body);
      const tutor = await storage.createTutor(validatedData);
      res.json(tutor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tutor data", details: error.errors });
      } else {
        console.error("Error creating tutor:", error);
        res.status(500).json({ error: "Failed to create tutor" });
      }
    }
  });

  app.get("/api/tutors/approved", async (req, res) => {
    try {
      const tutors = await storage.getAllApprovedTutors();
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching approved tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.get("/api/tutors/pending", async (req, res) => {
    try {
      const tutors = await storage.getTutorsByStatus("pendiente");
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching pending tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.get("/api/tutors/rejected", async (req, res) => {
    try {
      const tutors = await storage.getTutorsByStatus("rechazado");
      res.json(tutors);
    } catch (error) {
      console.error("Error fetching rejected tutors:", error);
      res.status(500).json({ error: "Failed to fetch tutors" });
    }
  });

  app.patch("/api/tutors/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const tutor = await storage.updateTutorStatus(id, "aprobado");
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      res.json(tutor);
    } catch (error) {
      console.error("Error approving tutor:", error);
      res.status(500).json({ error: "Failed to approve tutor" });
    }
  });

  app.patch("/api/tutors/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const tutor = await storage.updateTutorStatus(id, "rechazado");
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }
      res.json(tutor);
    } catch (error) {
      console.error("Error rejecting tutor:", error);
      res.status(500).json({ error: "Failed to reject tutor" });
    }
  });

  // Stripe payment route for tutor bookings
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          error: "Stripe not configured. Please add STRIPE_SECRET_KEY to environment." 
        });
      }

      const { tutorId, hours } = req.body;
      
      if (!tutorId || !hours || hours < 1) {
        return res.status(400).json({ error: "Missing or invalid required fields" });
      }

      // Look up tutor server-side to get authoritative pricing
      const tutor = await storage.getTutorById(tutorId);
      
      if (!tutor) {
        return res.status(404).json({ error: "Tutor not found" });
      }

      if (tutor.status !== "aprobado") {
        return res.status(403).json({ error: "Tutor is not approved for bookings" });
      }

      // Calculate pricing server-side using trusted data
      const subtotal = Math.round(tutor.tarifa * hours);
      const serviceFee = Math.round(subtotal * 0.15);
      const total = subtotal + serviceFee;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100, // Convert MXN to centavos
        currency: "mxn",
        metadata: {
          tutorId: tutor.id,
          tutorName: tutor.nombre,
          hours: hours.toString(),
          subtotal: subtotal.toString(),
          serviceFee: serviceFee.toString(),
        },
        description: `Clase de tutoría con ${tutor.nombre} - ${hours}h`,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: total,
        subtotal,
        serviceFee,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
